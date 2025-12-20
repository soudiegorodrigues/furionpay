import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Acquirers to check
// IMPORTANTE: Health checks NÃO devem criar transações reais!
// - Ativus: usa endpoint de consulta de status (não cria transação)
// - Valorion: usa check-pix-status com txid inexistente (não cria transação)
// - Inter: usa get-inter-credentials para verificar conectividade (não cria transação)
const ACQUIRERS = ['ativus', 'valorion', 'inter'];

// Timeout for health check requests (5 seconds - increased for slower acquirers like Inter)
const HEALTH_CHECK_TIMEOUT_MS = 5000;

// Ativus API base URL
const ATIVUS_API_URL = 'https://api.ativushub.com.br/v1/gateway/api';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Check if acquirer is enabled in admin_settings
async function isAcquirerEnabled(supabase: ReturnType<typeof getSupabaseClient>, acquirer: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `${acquirer}_enabled`)
    .is('user_id', null)
    .maybeSingle();
  
  if (error) return true; // Default to enabled
  return data?.value !== 'false';
}

// Get Ativus API key from environment or database
async function getAtivusApiKey(supabase: ReturnType<typeof getSupabaseClient>): Promise<string | null> {
  // First try environment variable
  const envKey = Deno.env.get('ATIVUS_API_KEY');
  if (envKey) return envKey;
  
  // Try from admin_settings (global)
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'ativus_api_key')
    .is('user_id', null)
    .maybeSingle();
  
  return data?.value || null;
}

// Extract detailed error message from response or error
function extractErrorDetails(err: unknown, responseData?: unknown): string {
  // If we have response data with error details
  if (responseData && typeof responseData === 'object') {
    const data = responseData as Record<string, unknown>;
    
    // Check for common error message fields
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    if (data.errCode && data.message) {
      return `[${data.errCode}] ${data.message}`;
    }
    if (data.statusCode && data.message) {
      return `[HTTP ${data.statusCode}] ${data.message}`;
    }
    // Try to stringify the whole error response
    try {
      return JSON.stringify(data);
    } catch {
      // Ignore stringify errors
    }
  }
  
  // If it's an Error instance
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return `Timeout após ${HEALTH_CHECK_TIMEOUT_MS}ms - serviço muito lento ou indisponível`;
    }
    return err.message;
  }
  
  // Fallback
  return 'Erro desconhecido';
}


// Test Ativus health - DOES NOT CREATE TRANSACTIONS
// Uses the status check endpoint to verify API connectivity
async function testAtivus(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  try {
    // Get Ativus API key
    const apiKey = await getAtivusApiKey(supabase);
    
    if (!apiKey) {
      return { success: false, responseTime: 0, error: 'ATIVUS_API_KEY não configurada' };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    // Create auth header (Base64 encoded API key)
    const authHeader = btoa(apiKey);
    
    // Check API connectivity by querying a non-existent transaction
    // This will return 404 or similar, but proves the API is online and responding
    // IMPORTANTE: NÃO cria transação real, apenas verifica conectividade
    const response = await fetch(`${ATIVUS_API_URL}/check-transaction/health-check-test-${Date.now()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Get response data for logging
    let responseData: unknown = null;
    try {
      responseData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    
    // Any response (even 404) means the API is online
    // Only 5xx errors indicate the service is down
    if (response.status >= 500) {
      const errorMsg = extractErrorDetails(null, responseData) || `HTTP ${response.status} - Erro interno do servidor Ativus`;
      console.error(`[HEALTH] Ativus error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
    // 2xx, 3xx, or 4xx all indicate the API is responsive
    console.log(`[HEALTH] Ativus API responded in ${responseTime}ms with status ${response.status} (connectivity check - no transaction created)`);
    return { success: true, responseTime };
    
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] Ativus error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Test Valorion health - Uses status check, does NOT create transactions
async function testValorion(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    // Use check-pix-status-valorion with a fake transaction ID
    // This verifies API connectivity WITHOUT creating a real transaction
    const response = await fetch(`${supabaseUrl}/functions/v1/check-pix-status-valorion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        transactionId: `health-check-${Date.now()}`,
        healthCheck: true
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Get response data for detailed error messages
    let responseData: unknown = null;
    try {
      responseData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    
    // Any response means the function is working
    // We expect an error like "transaction not found" but that's fine for health check
    if (response.status >= 500) {
      const errorMsg = extractErrorDetails(null, responseData);
      console.error(`[HEALTH] Valorion error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
    console.log(`[HEALTH] Valorion responded in ${responseTime}ms (connectivity check - no transaction created)`);
    return { success: true, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] Valorion error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Test Inter health - Uses credentials check, does NOT create transactions
async function testInter(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    // Use get-inter-credentials to verify connectivity
    // This checks if Inter API is reachable WITHOUT creating a transaction
    const response = await fetch(`${supabaseUrl}/functions/v1/get-inter-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        healthCheck: true
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Get response data for detailed error messages
    let responseData: unknown = null;
    try {
      responseData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    
    const data = responseData as Record<string, unknown> | null;
    
    // Check for success or any response that indicates the service is up
    if (response.status >= 500) {
      const errorMsg = extractErrorDetails(null, data);
      console.error(`[HEALTH] Inter error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
    console.log(`[HEALTH] Inter responded in ${responseTime}ms (connectivity check - no transaction created)`);
    return { success: true, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] Inter error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Main health check function
async function checkAcquirerHealth(acquirer: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
  console.log(`[HEALTH] Checking ${acquirer} (timeout: ${HEALTH_CHECK_TIMEOUT_MS}ms) - connectivity only, no transactions created...`);
  
  switch (acquirer) {
    case 'ativus':
      return await testAtivus();
    case 'valorion':
      return await testValorion();
    case 'inter':
      return await testInter();
    default:
      return { success: false, responseTime: 0, error: `Adquirente desconhecido: ${acquirer}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  // Parse request body to check for singleAcquirer parameter
  let singleAcquirer: string | null = null;
  try {
    const body = await req.json();
    singleAcquirer = body?.singleAcquirer || null;
  } catch {
    // No body or invalid JSON - check all acquirers
  }
  
  // Determine which acquirers to check
  const acquirersToCheck = singleAcquirer 
    ? ACQUIRERS.filter(a => a === singleAcquirer)
    : ACQUIRERS;
  
  if (singleAcquirer && acquirersToCheck.length === 0) {
    return new Response(
      JSON.stringify({ error: `Adquirente desconhecido: ${singleAcquirer}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`[HEALTH-CHECK] Starting health check for ${singleAcquirer || 'all acquirers'} (timeout: ${HEALTH_CHECK_TIMEOUT_MS}ms) - NO TRANSACTIONS WILL BE CREATED...`);
  
  const results: Record<string, { success: boolean; responseTime: number; error?: string }> = {};
  
  // Check acquirers in parallel for maximum speed
  const healthChecks = await Promise.all(
    acquirersToCheck.map(async (acquirer) => {
      // First check if acquirer is enabled
      const isEnabled = await isAcquirerEnabled(supabase, acquirer);
      
      if (!isEnabled) {
        console.log(`[HEALTH] ${acquirer} is disabled, skipping`);
        return { acquirer, result: { success: false, responseTime: 0, error: 'Adquirente desabilitado' }, skipped: true };
      }
      
      const result = await checkAcquirerHealth(acquirer);
      return { acquirer, result, skipped: false };
    })
  );
  
  // Update health status in database
  for (const { acquirer, result, skipped } of healthChecks) {
    results[acquirer] = result;
    
    if (skipped) continue;
    
    // Use the database function to update health status
    const { error } = await supabase.rpc('update_acquirer_health', {
      p_acquirer: acquirer,
      p_is_healthy: result.success,
      p_response_time_ms: result.responseTime,
      p_error_message: result.error || null
    });
    
    if (error) {
      console.error(`[HEALTH] Error updating ${acquirer} status:`, error);
    } else {
      const statusIcon = result.success ? '✅' : '❌';
      const latencyWarning = result.responseTime > 2000 ? ' ⚠️ HIGH LATENCY' : '';
      console.log(`[HEALTH] ${acquirer}: ${statusIcon} ${result.success ? 'HEALTHY' : 'UNHEALTHY'} (${result.responseTime}ms)${latencyWarning}${result.error ? ` - ${result.error}` : ''}`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Calculate summary stats
  const healthyCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`[HEALTH-CHECK] Completed in ${totalTime}ms - ${healthyCount}/${totalCount} acquirers healthy (NO TRANSACTIONS CREATED)`);
  
  // Return summary
  const summary = {
    timestamp: new Date().toISOString(),
    duration_ms: totalTime,
    healthy_count: healthyCount,
    total_count: totalCount,
    timeout_ms: HEALTH_CHECK_TIMEOUT_MS,
    note: 'Health checks verify connectivity only - no PIX transactions are created',
    results: Object.entries(results).map(([acquirer, result]) => ({
      acquirer,
      is_healthy: result.success,
      response_time_ms: result.responseTime,
      is_slow: result.responseTime > 2000,
      error: result.error || null
    }))
  };
  
  return new Response(
    JSON.stringify(summary),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
