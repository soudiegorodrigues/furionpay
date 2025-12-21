import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SpedPay removed - using Valorion, Inter, and Ativus only
const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

// Retry with exponential backoff configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// Circuit Breaker configuration per acquirer
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  openUntil: number;
}

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,      // Open circuit after 5 consecutive failures
  resetTimeMs: 60000,       // Try to close after 60 seconds
  halfOpenMaxAttempts: 2,   // Allow 2 test requests when half-open
};

// In-memory circuit breaker state (per acquirer)
const circuitBreakers: Record<string, CircuitBreakerState> = {
  inter: { failures: 0, lastFailure: 0, isOpen: false, openUntil: 0 },
  ativus: { failures: 0, lastFailure: 0, isOpen: false, openUntil: 0 },
  valorion: { failures: 0, lastFailure: 0, isOpen: false, openUntil: 0 },
};

// Circuit Breaker functions
function getCircuitState(acquirer: string): CircuitBreakerState {
  if (!circuitBreakers[acquirer]) {
    circuitBreakers[acquirer] = { failures: 0, lastFailure: 0, isOpen: false, openUntil: 0 };
  }
  return circuitBreakers[acquirer];
}

function isCircuitOpen(acquirer: string): boolean {
  const state = getCircuitState(acquirer);
  const now = Date.now();
  
  if (!state.isOpen) return false;
  
  // Check if reset time has passed (half-open state)
  if (now >= state.openUntil) {
    console.log(`[CIRCUIT BREAKER] ${acquirer.toUpperCase()} - Transitioning to HALF-OPEN state`);
    return false; // Allow test request
  }
  
  console.log(`[CIRCUIT BREAKER] ${acquirer.toUpperCase()} - Circuit is OPEN, blocking request (resets in ${Math.round((state.openUntil - now) / 1000)}s)`);
  return true;
}

function recordSuccess(acquirer: string, supabase?: any, responseTimeMs?: number): void {
  const state = getCircuitState(acquirer);
  const wasOpen = state.isOpen;
  
  if (state.failures > 0 || state.isOpen) {
    console.log(`[CIRCUIT BREAKER] ${acquirer.toUpperCase()} - Success recorded, resetting to CLOSED state`);
  }
  
  state.failures = 0;
  state.isOpen = false;
  state.openUntil = 0;

  // Log to monitoring table
  if (supabase) {
    logMonitoringEvent(supabase, acquirer, 'success', responseTimeMs).catch(err => 
      console.error('Failed to log monitoring event:', err)
    );
    
    if (wasOpen) {
      logMonitoringEvent(supabase, acquirer, 'circuit_close').catch(err => 
        console.error('Failed to log circuit close event:', err)
      );
    }
  }
}

function recordFailure(acquirer: string, supabase?: any, errorMessage?: string): void {
  const state = getCircuitState(acquirer);
  const now = Date.now();
  
  state.failures++;
  state.lastFailure = now;
  
  console.log(`[CIRCUIT BREAKER] ${acquirer.toUpperCase()} - Failure recorded (${state.failures}/${CIRCUIT_BREAKER_CONFIG.failureThreshold})`);
  
  const wasOpen = state.isOpen;
  
  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold && !wasOpen) {
    state.isOpen = true;
    state.openUntil = now + CIRCUIT_BREAKER_CONFIG.resetTimeMs;
    console.log(`[CIRCUIT BREAKER] ${acquirer.toUpperCase()} - Circuit OPENED, will reset at ${new Date(state.openUntil).toISOString()}`);
    
    // Log circuit open event
    if (supabase) {
      logMonitoringEvent(supabase, acquirer, 'circuit_open', undefined, 'Circuit breaker opened after consecutive failures').catch(err => 
        console.error('Failed to log circuit open event:', err)
      );
    }
  }

  // Log failure event
  if (supabase) {
    logMonitoringEvent(supabase, acquirer, 'failure', undefined, errorMessage).catch(err => 
      console.error('Failed to log failure event:', err)
    );
  }
}

// Log monitoring event to database
async function logMonitoringEvent(
  supabase: any, 
  acquirer: string, 
  eventType: string, 
  responseTimeMs?: number, 
  errorMessage?: string,
  retryAttempt?: number
): Promise<void> {
  try {
    await supabase.from('api_monitoring_events').insert({
      acquirer,
      event_type: eventType,
      response_time_ms: responseTimeMs || null,
      error_message: errorMessage || null,
      retry_attempt: retryAttempt || null,
    });
  } catch (err) {
    console.error('Error logging monitoring event:', err);
  }
}

function getCircuitStatus(): Record<string, { state: string; failures: number; openUntil?: string }> {
  const now = Date.now();
  const status: Record<string, { state: string; failures: number; openUntil?: string }> = {};
  
  for (const [acquirer, cb] of Object.entries(circuitBreakers)) {
    let state = 'CLOSED';
    if (cb.isOpen) {
      state = now >= cb.openUntil ? 'HALF-OPEN' : 'OPEN';
    }
    status[acquirer] = {
      state,
      failures: cb.failures,
      ...(cb.isOpen && { openUntil: new Date(cb.openUntil).toISOString() }),
    };
  }
  
  return status;
}

// Utility function for retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  config = RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = 
        error instanceof TypeError || // Network errors
        (error instanceof Response && config.retryableStatusCodes.includes(error.status)) ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('network') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT');
      
      if (!isRetryable || attempt === config.maxRetries) {
        console.error(`[RETRY] ${context} - Failed after ${attempt + 1} attempts:`, lastError.message);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );
      const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
      const delay = exponentialDelay + jitter;
      
      console.log(`[RETRY] ${context} - Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Wrapper for fetch with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit & { client?: Deno.HttpClient },
  context: string
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Throw error for retryable status codes
    if (RETRY_CONFIG.retryableStatusCodes.includes(response.status)) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
  }, context);
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// SpedPay getApiKeyForUser removed - using Valorion, Inter, and Ativus only

async function getUserAcquirer(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'user_acquirer')
    .eq('user_id', userId)
    .single();
  
  if (error || !data?.value) {
    return 'valorion';
  }
  
  return data.value || 'valorion';
}

async function getAtivusApiKey(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'ativus_api_key')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data?.value) {
    // Try global setting
    const { data: globalData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ativus_api_key')
      .is('user_id', null)
      .maybeSingle();
    return globalData?.value || null;
  }
  
  return data.value;
}

async function getValorionApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try user-specific setting first
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'valorion_api_key')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data?.value) return data.value;
  }
  
  // Try global setting
  const { data: globalData } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'valorion_api_key')
    .is('user_id', null)
    .maybeSingle();
  
  if (globalData?.value) return globalData.value;
  
  // Fall back to env var
  return Deno.env.get('VALORION_API_KEY') || null;
}

// Detect acquirer by txid format
// Ativus: 26+ alphanumeric chars without hyphens (e.g., "409b79aefec44a99baf6700f95")
// SpedPay/Inter: UUID format with hyphens (e.g., "8172e8d2-8b97-4725-b735-2f4a20938b89")
function detectAcquirerByTxid(txid: string): string | null {
  if (!txid) return null;
  
  // UUID format (with hyphens) = SpedPay or Inter
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(txid)) {
    return null; // Can't determine between SpedPay and Inter by txid alone
  }
  
  // Ativus format: 26+ alphanumeric chars without hyphens
  const ativusPattern = /^[a-zA-Z0-9]{20,}$/;
  if (ativusPattern.test(txid) && !txid.includes('-')) {
    return 'ativus';
  }
  
  // Valorion format: numeric-only long IDs or specific prefix patterns
  // Valorion txids typically are long numeric strings or have specific format
  const valorionPattern = /^\d{10,}$/;
  if (valorionPattern.test(txid)) {
    return 'valorion';
  }
  
  return null;
}

// Get Inter credentials from admin_settings or fall back to env vars
async function getInterCredentialsFromDb(supabase: any, userId?: string): Promise<{
  clientId: string;
  clientSecret: string;
  certificate: string;
  privateKey: string;
  pixKey: string;
} | null> {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', ['inter_client_id', 'inter_client_secret', 'inter_certificate', 'inter_private_key', 'inter_pix_key']);
  
  if (error || !data || data.length === 0) return null;
  
  const settings: Record<string, string> = {};
  data.forEach((item: { key: string; value: string }) => {
    settings[item.key] = item.value;
  });
  
  if (settings.inter_client_id && settings.inter_client_secret && 
      settings.inter_certificate && settings.inter_private_key && settings.inter_pix_key) {
    return {
      clientId: settings.inter_client_id,
      clientSecret: settings.inter_client_secret,
      certificate: settings.inter_certificate,
      privateKey: settings.inter_private_key,
      pixKey: settings.inter_pix_key,
    };
  }
  
  return null;
}

// Get cached Inter token from database (check any recent valid token)
async function getCachedInterToken(supabase: any): Promise<{ token: string; expiresAt: number } | null> {
  console.log('[TOKEN CACHE] Checking for cached Inter token...');
  
  // Get all inter_token_cache entries and find the most recent valid one
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value, updated_at')
    .eq('key', 'inter_token_cache')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('[TOKEN CACHE] Error fetching cache:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.log('[TOKEN CACHE] No cached tokens found');
    return null;
  }
  
  console.log(`[TOKEN CACHE] Found ${data.length} cached entries`);
  
  const now = Date.now();
  
  for (const item of data) {
    try {
      const cached = JSON.parse(item.value);
      const timeLeft = cached.expiresAt - now;
      console.log(`[TOKEN CACHE] Token expires in ${Math.round(timeLeft / 1000)} seconds`);
      
      // Use token if it has at least 1 minute left (reduced from 5 minutes)
      if (cached.token && cached.expiresAt && timeLeft > 60000) {
        console.log('[TOKEN CACHE] Using valid cached token');
        return cached;
      }
    } catch (e) {
      console.error('[TOKEN CACHE] Error parsing cache entry:', e);
      continue;
    }
  }
  
  console.log('[TOKEN CACHE] No valid tokens found in cache');
  return null;
}

// Save Inter token to database cache
async function saveInterTokenCache(supabase: any, token: string, expiresAt: number): Promise<void> {
  const cacheValue = JSON.stringify({ token, expiresAt });
  
  // Insert new token cache entry (use insert to avoid conflicts)
  const { error } = await supabase
    .from('admin_settings')
    .insert({
      key: 'inter_token_cache',
      value: cacheValue,
      user_id: null,
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Error saving token cache:', error);
  }
}

function normalizePem(pem: string): string {
  let normalized = pem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  const certMatch = normalized.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
  const privKeyMatch = normalized.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const rsaKeyMatch = normalized.match(/-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/);
  
  if (certMatch) {
    const base64Content = certMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN CERTIFICATE-----\n${wrappedContent}\n-----END CERTIFICATE-----`;
  }
  
  if (privKeyMatch) {
    const base64Content = privKeyMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN PRIVATE KEY-----\n${wrappedContent}\n-----END PRIVATE KEY-----`;
  }
  
  if (rsaKeyMatch) {
    const base64Content = rsaKeyMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrappedContent}\n-----END RSA PRIVATE KEY-----`;
  }
  
  return normalized;
}

function createMtlsClient(): Deno.HttpClient {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    throw new Error('Certificados mTLS do Banco Inter não configurados');
  }

  const certPem = normalizePem(certificate);
  const keyPem = normalizePem(privateKey);

  return Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });
}

async function getInterAccessToken(client: Deno.HttpClient, supabase: any): Promise<string> {
  const now = Date.now();
  
  // Check database cache first
  const cached = await getCachedInterToken(supabase);
  if (cached) {
    console.log('Using cached Inter token from database');
    return cached.token;
  }

  const clientId = Deno.env.get('INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('INTER_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('Obtendo novo token de acesso do Banco Inter...');

  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'cob.read pix.read',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao obter token Inter:', response.status, errorText);
    
    // If rate limited, try to use any cached token even if expired
    if (response.status === 429) {
      console.log('Rate limited, checking for any cached token...');
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'inter_token_cache')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed.token) {
            console.log('Using potentially expired cached token due to rate limit');
            return parsed.token;
          }
        } catch {}
      }
    }
    
    throw new Error(`Erro ao obter token Inter: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Cache the token in database (Inter tokens typically last 3600 seconds)
  const expiresIn = data.expires_in || 3600;
  const expiresAt = now + (expiresIn * 1000);
  
  await saveInterTokenCache(supabase, data.access_token, expiresAt);
  
  console.log('Token Inter obtido e salvo no cache');
  return data.access_token;
}

async function checkInterStatus(txid: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Banco Inter, txid:', txid);
  const startTime = Date.now();
  
  // Check circuit breaker
  if (isCircuitOpen('inter')) {
    await logMonitoringEvent(supabase, 'inter', 'circuit_open', undefined, 'Request blocked by circuit breaker');
    return { isPaid: false, status: 'circuit_open' };
  }
  
  try {
    const mtlsClient = createMtlsClient();
    const accessToken = await getInterAccessToken(mtlsClient, supabase);
    const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;

    const response = await fetchWithRetry(
      cobUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        client: mtlsClient,
      },
      `Inter status check for ${txid}`
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao consultar PIX Inter:', response.status, errorText);
      recordFailure('inter', supabase, `HTTP ${response.status}: ${errorText}`);
      return { isPaid: false, status: 'error' };
    }

    const data = await response.json();
    console.log('Status Inter:', data.status);

    // Success - reset circuit breaker and log
    recordSuccess('inter', supabase, responseTime);

    const isPaid = data.status === 'CONCLUIDA';
    
    if (isPaid) {
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    return {
      isPaid,
      status: isPaid ? 'paid' : data.status,
      paidAt: data.pix?.[0]?.horario || undefined,
    };
  } catch (error) {
    console.error(`Inter status check failed after retries for ${txid}:`, error);
    recordFailure('inter', supabase, error instanceof Error ? error.message : 'Unknown error');
    return { isPaid: false, status: 'retry_failed' };
  }
}

// SpedPay checkSpedPayStatus function removed - using Valorion, Inter, and Ativus only

// Ativus Hub correct API URL for status check - from documentation
const ATIVUS_STATUS_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php';

async function checkAtivusStatus(idTransaction: string, apiKey: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Ativus Hub, id_transaction:', idTransaction);
  const startTime = Date.now();

  // Check circuit breaker
  if (isCircuitOpen('ativus')) {
    await logMonitoringEvent(supabase, 'ativus', 'circuit_open', undefined, 'Request blocked by circuit breaker');
    return { isPaid: false, status: 'circuit_open' };
  }

  // Check if API key is already Base64 encoded
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  // Use the correct endpoint from documentation
  const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${encodeURIComponent(idTransaction)}`;
  console.log('Ativus status URL:', statusUrl);

  try {
    const response = await fetchWithRetry(
      statusUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      },
      `Ativus status check for ${idTransaction}`
    );

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    console.log('Ativus status response:', response.status, responseText);

    if (!response.ok) {
      console.error('Ativus status check failed:', response.status, responseText);
      recordFailure('ativus', supabase, `HTTP ${response.status}: ${responseText}`);
      return { isPaid: false, status: 'pending' };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Ativus response');
      recordFailure('ativus', supabase, 'Failed to parse JSON response');
      return { isPaid: false, status: 'pending' };
    }

    // Success - reset circuit breaker and log
    recordSuccess('ativus', supabase, responseTime);

    // According to documentation, response format is:
    // { "situacao": "AGUARDANDO_PAGAMENTO" | "CONCLUIDO" | etc, "tipo": "CASH IN", ... }
    const situacao = (data.situacao || data.status || '').toString().toUpperCase();
    
    console.log('Ativus transaction situacao:', situacao);
    
    // Check for paid statuses - Ativus uses "CONCLUIDO" or "PAGO" for paid transactions
    const paidStatuses = ['CONCLUIDO', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log('Transaction is PAID! Marking as paid in database');
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: idTransaction });
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    // Map Ativus status to our status
    let mappedStatus = 'pending';
    if (isPaid) {
      mappedStatus = 'paid';
    } else if (situacao === 'AGUARDANDO_PAGAMENTO') {
      mappedStatus = 'generated';
    } else if (situacao === 'EXPIRADO' || situacao === 'EXPIRED' || situacao === 'CANCELADO') {
      mappedStatus = 'expired';
    }

    return {
      isPaid,
      status: mappedStatus,
      paidAt: data.data_transacao || undefined,
    };
  } catch (error) {
    console.error(`Ativus status check failed after retries for ${idTransaction}:`, error);
    recordFailure('ativus', supabase, error instanceof Error ? error.message : 'Unknown error');
    return { isPaid: false, status: 'retry_failed' };
  }
}

const VALORION_STATUS_URL = 'https://app.valorion.com.br/api/s1/getTransactionStatus.php';

async function checkValorionStatus(
  idTransaction: string,
  apiKey: string,
  supabase: any
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Checking Valorion status for:', idTransaction);
  const startTime = Date.now();

  // Check circuit breaker
  if (isCircuitOpen('valorion')) {
    await logMonitoringEvent(supabase, 'valorion', 'circuit_open', undefined, 'Request blocked by circuit breaker');
    return { isPaid: false, status: 'circuit_open' };
  }

  // Check if API key is already Base64 encoded
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  const statusUrl = `${VALORION_STATUS_URL}?id_transaction=${encodeURIComponent(idTransaction)}`;
  console.log('Valorion status URL:', statusUrl);

  try {
    const response = await fetchWithRetry(
      statusUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      },
      `Valorion status check for ${idTransaction}`
    );

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    console.log('Valorion status response:', response.status, responseText);

    if (!response.ok) {
      // 404 = transaction not found = expected for pending/new transactions
      // This is NOT a failure - the API is responding correctly
      if (response.status === 404) {
        console.log('Valorion returned 404 (transaction not found) - API is healthy, treating as success');
        recordSuccess('valorion', supabase, responseTime);
        return { isPaid: false, status: 'pending' };
      }
      
      // Only record as failure for actual server errors (500+)
      if (response.status >= 500) {
        console.error('Valorion server error:', response.status, responseText);
        recordFailure('valorion', supabase, `HTTP ${response.status}: ${responseText}`);
      } else {
        // 4xx errors (except 404) - log but don't count as failure
        console.warn('Valorion client error:', response.status, responseText);
      }
      return { isPaid: false, status: 'pending' };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Valorion response');
      recordFailure('valorion', supabase, 'Failed to parse JSON response');
      return { isPaid: false, status: 'pending' };
    }

    // Success - reset circuit breaker and log
    recordSuccess('valorion', supabase, responseTime);

    // Valorion response format similar to Ativus
    const situacao = (data.situacao || data.status || '').toString().toUpperCase();
    
    console.log('Valorion transaction situacao:', situacao);
    
    // Check for paid statuses
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log('Transaction is PAID! Marking as paid in database');
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: idTransaction });
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    // Map Valorion status to our status
    let mappedStatus = 'pending';
    if (isPaid) {
      mappedStatus = 'paid';
    } else if (situacao === 'AGUARDANDO_PAGAMENTO' || situacao === 'WAITING' || situacao === 'PENDING') {
      mappedStatus = 'generated';
    } else if (situacao === 'EXPIRADO' || situacao === 'EXPIRED' || situacao === 'CANCELADO' || situacao === 'CANCELED') {
      mappedStatus = 'expired';
    }

    return {
      isPaid,
      status: mappedStatus,
      paidAt: data.data_transacao || data.paid_at || undefined,
    };
  } catch (error) {
    console.error(`Valorion status check failed after retries for ${idTransaction}:`, error);
    recordFailure('valorion', supabase, error instanceof Error ? error.message : 'Unknown error');
    return { isPaid: false, status: 'retry_failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();
    
    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking status for transaction:', transactionId);

    const supabase = getSupabaseClient();
    
    let transaction = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(transactionId);
    
    if (isUuid) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      transaction = result.data;
    }
    
    if (!transaction) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('txid', transactionId)
        .single();
      transaction = result.data;
    }
    
    if (!transaction) {
      console.error('Transaction not found for:', transactionId);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found transaction:', transaction.id, 'txid:', transaction.txid, 'status:', transaction.status);

    if (transaction.status === 'paid') {
      console.log('Transaction already marked as paid');
      return new Response(
        JSON.stringify({ status: 'paid', paid_at: transaction.paid_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txid = transaction.txid;
    if (!txid) {
      return new Response(
        JSON.stringify({ status: transaction.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect acquirer - FIRST use stored acquirer from transaction, then txid format, then user settings
    let acquirer = transaction.acquirer || null;
    
    // Only fall back to txid detection if no acquirer stored in transaction
    if (!acquirer) {
      acquirer = detectAcquirerByTxid(txid);
    }
    
    // Fall back to user settings if still not detected
    if (!acquirer && transaction.user_id) {
      acquirer = await getUserAcquirer(supabase, transaction.user_id);
    }
    
    // Default to spedpay if not detected
    if (!acquirer) {
      acquirer = 'spedpay';
    }

    console.log('Using acquirer:', acquirer, '(from transaction:', !!transaction.acquirer, ', detected by txid:', detectAcquirerByTxid(txid) !== null, ')');

    let result: { isPaid: boolean; status: string; paidAt?: string };

    if (acquirer === 'inter') {
      result = await checkInterStatus(txid, supabase);
    } else if (acquirer === 'ativus') {
      let apiKey: string | null = null;
      if (transaction.user_id) {
        apiKey = await getAtivusApiKey(supabase, transaction.user_id);
      }
      if (!apiKey) {
        console.error('No Ativus API key available');
        return new Response(
          JSON.stringify({ error: 'Ativus API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    result = await checkAtivusStatus(txid, apiKey, supabase);
    } else if (acquirer === 'valorion') {
      let apiKey: string | null = null;
      if (transaction.user_id) {
        apiKey = await getValorionApiKey(supabase, transaction.user_id);
      }
      if (!apiKey) {
        apiKey = await getValorionApiKey(supabase);
      }
      if (!apiKey) {
        console.error('No Valorion API key available');
        return new Response(
          JSON.stringify({ error: 'Valorion API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = await checkValorionStatus(txid, apiKey, supabase);
    } else {
      // Unknown acquirer - return error
      console.error('Unknown or unsupported acquirer:', acquirer);
      return new Response(
        JSON.stringify({ error: `Unsupported acquirer: ${acquirer}. Supported: valorion, inter, ativus.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment was just confirmed, send to Utmify
    if (result.isPaid) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        
        fetch(`${supabaseUrl}/functions/v1/utmify-send-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            txid: transaction.txid,
            amount: transaction.amount,
            status: 'paid',
            customerName: transaction.donor_name,
            productName: transaction.product_name,
            paidAt: result.paidAt || new Date().toISOString(),
            utmData: transaction.utm_data,
            userId: transaction.user_id,
          }),
        }).catch(err => console.log('[UTMIFY] Error sending paid order (non-blocking):', err));
      } catch (utmifyError) {
        console.log('[UTMIFY] Error preparing paid request (non-blocking):', utmifyError);
      }
    }

    return new Response(
      JSON.stringify({
        status: result.status,
        isPaid: result.isPaid,
        paid_at: result.paidAt || (result.isPaid ? new Date().toISOString() : undefined),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking PIX status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
