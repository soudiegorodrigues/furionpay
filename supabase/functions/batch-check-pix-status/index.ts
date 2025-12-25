import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SpedPay removed - using Valorion, Inter, and Ativus only
const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';
const ATIVUS_STATUS_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php';
const VALORION_STATUS_URL = 'https://app.valorion.com.br/api/s1/getTransaction/api/getTransactionStatus.php';

// Retry with exponential backoff configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
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
  
  return true;
}

function recordSuccess(acquirer: string, supabase?: any, responseTimeMs?: number): void {
  const state = getCircuitState(acquirer);
  const wasOpen = state.isOpen;
  
  state.failures = 0;
  state.isOpen = false;
  state.openUntil = 0;

  if (supabase) {
    supabase.from('api_monitoring_events').insert({
      acquirer, event_type: 'success', response_time_ms: responseTimeMs || null
    }).then(() => {}).catch(() => {});
    
    if (wasOpen) {
      supabase.from('api_monitoring_events').insert({
        acquirer, event_type: 'circuit_close'
      }).then(() => {}).catch(() => {});
    }
  }
}

function recordFailure(acquirer: string, supabase?: any, errorMessage?: string): void {
  const state = getCircuitState(acquirer);
  const now = Date.now();
  const wasOpen = state.isOpen;
  
  state.failures++;
  state.lastFailure = now;
  
  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold && !wasOpen) {
    state.isOpen = true;
    state.openUntil = now + CIRCUIT_BREAKER_CONFIG.resetTimeMs;
    
    if (supabase) {
      supabase.from('api_monitoring_events').insert({
        acquirer, event_type: 'circuit_open', error_message: 'Circuit breaker opened'
      }).then(() => {}).catch(() => {});
    }
  }

  if (supabase) {
    supabase.from('api_monitoring_events').insert({
      acquirer, event_type: 'failure', error_message: errorMessage || null
    }).then(() => {}).catch(() => {});
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
        lastError.message.includes('timeout') ||
        lastError.message.includes('network') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('HTTP 429') ||
        lastError.message.includes('HTTP 5');
      
      if (!isRetryable || attempt === config.maxRetries) {
        console.error(`[RETRY] ${context} - Failed after ${attempt + 1} attempts:`, lastError.message);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );
      const jitter = Math.random() * 0.3 * exponentialDelay;
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
    
    // Throw error for retryable status codes to trigger retry
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
    .maybeSingle();
  
  if (error || !data?.value) {
    return 'valorion';
  }
  
  return data.value;
}

// Detect acquirer by txid format
// Ativus: 26+ alphanumeric chars without hyphens (e.g., "409b79aefec44a99baf6700f95")
// Valorion/Inter: UUID format with hyphens (e.g., "8172e8d2-8b97-4725-b735-2f4a20938b89")
function detectAcquirerByTxid(txid: string): string | null {
  if (!txid) return null;
  
  // UUID format (with hyphens) = Valorion or Inter
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(txid)) {
    return null; // Can't determine between Valorion and Inter by txid alone
  }
  
  // Ativus format: 26+ alphanumeric chars without hyphens
  const ativusPattern = /^[a-zA-Z0-9]{20,}$/;
  if (ativusPattern.test(txid) && !txid.includes('-')) {
    return 'ativus';
  }
  
  return null;
}

async function getAtivusApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try user-specific setting first
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'ativus_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      return data.value;
    }
  }
  
  // Try global setting
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    return globalData.value;
  }
  
  return null;
}

async function getValorionApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try user-specific setting first
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'valorion_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      return data.value;
    }
  }
  
  // Try global setting
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'valorion_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    return globalData.value;
  }
  
  return null;
}

// Get cached Inter token from database
async function getCachedInterToken(supabase: any): Promise<{ token: string; expiresAt: number } | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'inter_token_cache')
    .is('user_id', null)
    .maybeSingle();
  
  if (error || !data?.value) {
    return null;
  }
  
  try {
    const cached = JSON.parse(data.value);
    if (cached.token && cached.expiresAt) {
      return cached;
    }
  } catch {
    return null;
  }
  
  return null;
}

// Save Inter token to database cache
async function saveInterTokenCache(supabase: any, token: string, expiresAt: number): Promise<void> {
  const cacheValue = JSON.stringify({ token, expiresAt });
  
  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      key: 'inter_token_cache',
      value: cacheValue,
      user_id: null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'key,user_id',
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

function createMtlsClient(): Deno.HttpClient | null {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    console.log('Inter certificates not configured');
    return null;
  }

  try {
    const certPem = normalizePem(certificate);
    const keyPem = normalizePem(privateKey);

    return Deno.createHttpClient({
      cert: certPem,
      key: keyPem,
    });
  } catch (err) {
    console.error('Error creating mTLS client:', err);
    return null;
  }
}

async function getInterAccessToken(client: Deno.HttpClient, supabase: any): Promise<string> {
  const now = Date.now();
  
  // Check database cache first (with 5 minute buffer)
  const cached = await getCachedInterToken(supabase);
  if (cached && cached.expiresAt > now + 300000) {
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

async function checkInterStatus(
  txid: string, 
  supabase: any, 
  mtlsClient: Deno.HttpClient,
  accessToken: string
): Promise<{ isPaid: boolean; status: string }> {
  // Check circuit breaker
  if (isCircuitOpen('inter')) {
    return { isPaid: false, status: 'circuit_open' };
  }

  const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;

  try {
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
      `Batch Inter status check for ${txid}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Inter API error for ${txid}:`, response.status, errorText);
      recordFailure('inter');
      return { isPaid: false, status: 'error' };
    }

    const data = await response.json();
    const isPaid = data.status === 'CONCLUIDA';

    // Success - reset circuit breaker
    recordSuccess('inter');

    return {
      isPaid,
      status: data.status,
    };
  } catch (err) {
    console.error(`Inter status check failed after retries for ${txid}:`, err);
    recordFailure('inter');
    return { isPaid: false, status: 'retry_failed' };
  }
}

async function checkAtivusStatus(
  idTransaction: string,
  apiKey: string
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  // Check circuit breaker
  if (isCircuitOpen('ativus')) {
    return { isPaid: false, status: 'circuit_open' };
  }

  // Build auth header - check if API key is already Base64 encoded
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${idTransaction}`;
  
  console.log(`Checking Ativus status for id_transaction: ${idTransaction}`);

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
      `Batch Ativus status check for ${idTransaction}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ativus API error for ${idTransaction}:`, response.status, errorText);
      recordFailure('ativus');
      return { isPaid: false, status: 'error' };
    }

    const data = await response.json();
    
    // Log full response for debugging
    console.log(`Ativus FULL response for ${idTransaction}:`, JSON.stringify(data));

    // Success - reset circuit breaker
    recordSuccess('ativus');

    // Check multiple possible status fields (Ativus API can return in different formats)
    // Primary: situacao (from getTransactionStatus.php)
    // Alternative: status (from main API), data.status (nested)
    const situacao = (data.situacao || data.status || data.data?.status || '').toString().toUpperCase();
    const paidAt = data.data_transacao || data.paidAt || data.data?.paidAt || null;
    
    console.log(`Ativus parsed status for ${idTransaction}: situacao="${situacao}", paidAt="${paidAt}"`);
    
    // Check for all possible paid status values
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log(`*** TRANSACTION ${idTransaction} IS PAID! Status: ${situacao} ***`);
    }

    return {
      isPaid,
      status: situacao,
      paidAt: paidAt || undefined,
    };
  } catch (err) {
    console.error(`Ativus status check failed after retries for ${idTransaction}:`, err);
    recordFailure('ativus');
    return { isPaid: false, status: 'retry_failed' };
  }
}

async function checkValorionStatus(
  idTransaction: string,
  apiKey: string
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  // Check circuit breaker
  if (isCircuitOpen('valorion')) {
    return { isPaid: false, status: 'circuit_open' };
  }

  // Build auth header
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  const statusUrl = `${VALORION_STATUS_URL}?id_transaction=${idTransaction}`;
  
  console.log(`Checking Valorion status for id_transaction: ${idTransaction}`);

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
      `Batch Valorion status check for ${idTransaction}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Valorion API error for ${idTransaction}:`, response.status, errorText);
      recordFailure('valorion');
      return { isPaid: false, status: 'error' };
    }

    const data = await response.json();
    
    console.log(`Valorion FULL response for ${idTransaction}:`, JSON.stringify(data));

    // Success - reset circuit breaker
    recordSuccess('valorion');

    // Check multiple possible status fields
    const situacao = (data.situacao || data.status || data.data?.status || '').toString().toUpperCase();
    const paidAt = data.data_transacao || data.paidAt || data.data?.paidAt || null;
    
    console.log(`Valorion parsed status for ${idTransaction}: situacao="${situacao}", paidAt="${paidAt}"`);
    
    // Check for all possible paid status values
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log(`*** VALORION TRANSACTION ${idTransaction} IS PAID! Status: ${situacao} ***`);
    }

    return {
      isPaid,
      status: situacao,
      paidAt: paidAt || undefined,
    };
  } catch (err) {
    console.error(`Valorion status check failed after retries for ${idTransaction}:`, err);
    recordFailure('valorion');
    return { isPaid: false, status: 'retry_failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get all pending transactions (limit to 500 per batch for high volume - optimized for 100k PIX/day)
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('pix_transactions')
      .select('id, txid, user_id, amount, acquirer')
      .eq('status', 'generated')
      .not('txid', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (fetchError) {
      console.error('Error fetching pending transactions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending transactions to check`);

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending transactions found', checked: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache user acquirers and API keys to avoid repeated queries
    const userAcquirers: Record<string, string> = {};
    const userAtivusKeys: Record<string, string | null> = {};
    const userValorionKeys: Record<string, string | null> = {};

    // Setup Inter client once if needed
    let mtlsClient: Deno.HttpClient | null = null;
    let interAccessToken: string | null = null;

    let checkedCount = 0;
    let updatedCount = 0;
    const results: any[] = [];

    for (const transaction of pendingTransactions) {
      checkedCount++;
      
      // Determine acquirer for this transaction
      // FIRST: Use stored acquirer from transaction (most reliable - set when PIX was generated)
      let acquirer = transaction.acquirer || null;
      
      // SECOND: Fall back to txid detection if not stored
      if (!acquirer) {
        acquirer = detectAcquirerByTxid(transaction.txid);
      }
      
      // THIRD: Fall back to user settings if still not detected
      if (!acquirer && transaction.user_id) {
        if (!(transaction.user_id in userAcquirers)) {
          userAcquirers[transaction.user_id] = await getUserAcquirer(supabase, transaction.user_id);
        }
        acquirer = userAcquirers[transaction.user_id];
      }
      
      // Default to valorion if still not determined
      if (!acquirer) {
        acquirer = 'valorion';
      }
      
      console.log(`Transaction ${transaction.txid}: using acquirer=${acquirer} (stored=${transaction.acquirer}, detected=${detectAcquirerByTxid(transaction.txid)})`);

      try {
        if (acquirer === 'ativus') {
          // Check with Ativus Hub
          let ativusApiKey: string | null = null;
          
          if (transaction.user_id) {
            if (!(transaction.user_id in userAtivusKeys)) {
              userAtivusKeys[transaction.user_id] = await getAtivusApiKey(supabase, transaction.user_id);
            }
            ativusApiKey = userAtivusKeys[transaction.user_id];
          }
          
          if (!ativusApiKey) {
            ativusApiKey = await getAtivusApiKey(supabase);
          }
          
          if (!ativusApiKey) {
            console.log(`Skipping Ativus transaction ${transaction.id} - no API key available`);
            results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'no_ativus_key', acquirer: 'ativus' });
            continue;
          }

          const ativusResult = await checkAtivusStatus(transaction.txid, ativusApiKey);
          
          if (ativusResult.isPaid) {
            console.log(`Marking transaction ${transaction.txid} as paid (Ativus)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'ativus' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', ativus_status: ativusResult.status, acquirer: 'ativus' });
          }
        } else if (acquirer === 'inter') {
          // Check with Banco Inter
          if (!mtlsClient) {
            mtlsClient = createMtlsClient();
            if (!mtlsClient) {
              console.log(`Skipping Inter transaction ${transaction.id} - mTLS client not available`);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'inter_not_configured' });
              continue;
            }
          }

          if (!interAccessToken) {
            try {
              interAccessToken = await getInterAccessToken(mtlsClient, supabase);
            } catch (tokenErr) {
              console.error('Error getting Inter token:', tokenErr);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'error', reason: 'inter_token_error' });
              continue;
            }
          }

          console.log(`Checking Inter status for txid: ${transaction.txid}`);
          const interResult = await checkInterStatus(transaction.txid, supabase, mtlsClient, interAccessToken);
          
          console.log(`Transaction ${transaction.txid} Inter status: ${interResult.status}`);

          if (interResult.isPaid) {
            console.log(`Marking transaction ${transaction.txid} as paid (Inter)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'inter' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', inter_status: interResult.status, acquirer: 'inter' });
          }
        } else if (acquirer === 'valorion') {
          // Check with Valorion
          let valorionApiKey: string | null = null;
          
          if (transaction.user_id) {
            if (!(transaction.user_id in userValorionKeys)) {
              userValorionKeys[transaction.user_id] = await getValorionApiKey(supabase, transaction.user_id);
            }
            valorionApiKey = userValorionKeys[transaction.user_id];
          }
          
          if (!valorionApiKey) {
            valorionApiKey = await getValorionApiKey(supabase);
          }
          
          if (!valorionApiKey) {
            console.log(`Skipping Valorion transaction ${transaction.id} - no API key available`);
            results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'no_valorion_key', acquirer: 'valorion' });
            continue;
          }

          const valorionResult = await checkValorionStatus(transaction.txid, valorionApiKey);
          
          if (valorionResult.isPaid) {
            console.log(`Marking transaction ${transaction.txid} as paid (Valorion)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'valorion' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', valorion_status: valorionResult.status, acquirer: 'valorion' });
          }
        } else {
          // Unknown acquirer - skip
          console.log(`Skipping transaction ${transaction.id} - unsupported acquirer: ${acquirer}`);
          results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'unsupported_acquirer', acquirer });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Error checking transaction ${transaction.txid}:`, err);
        results.push({ id: transaction.id, txid: transaction.txid, status: 'error', reason: String(err) });
      }
    }

    console.log(`Batch check complete: ${checkedCount} checked, ${updatedCount} updated to paid`);

    return new Response(
      JSON.stringify({ 
        message: 'Batch check complete',
        checked: checkedCount, 
        updated: updatedCount,
        circuit_breakers: getCircuitStatus(),
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});