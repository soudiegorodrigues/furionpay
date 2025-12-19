import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Acquirers to check
const ACQUIRERS = ['spedpay', 'ativus', 'valorion', 'inter'];

// Timeout for health check requests (5 seconds - increased for slower acquirers like Inter)
const HEALTH_CHECK_TIMEOUT_MS = 5000;

// Minimum amounts per acquirer (some have minimum requirements)
const MIN_AMOUNTS: Record<string, number> = {
  spedpay: 0.01,
  ativus: 0.05,  // Ativus requires minimum R$0.05
  valorion: 1.00, // Valorion: use R$1.00 for health check to avoid minimum blocking
  inter: 0.01,
};

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

// Test SpedPay health
async function testSpedPay(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('SPEDPAY_API_KEY');
  
  if (!apiKey) {
    return { success: false, responseTime: 0, error: 'SPEDPAY_API_KEY não configurada' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    // Just check if API is reachable
    const response = await fetch('https://api.spedpay.space/v1/transactions?limit=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': apiKey,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Try to get response body for better error messages
    let responseData: unknown = null;
    try {
      responseData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    
    if (response.status >= 500) {
      return { 
        success: false, 
        responseTime, 
        error: extractErrorDetails(null, responseData) || `HTTP ${response.status} - Erro interno do servidor SpedPay`
      };
    }
    
    console.log(`[HEALTH] SpedPay responded in ${responseTime}ms with status ${response.status}`);
    return { success: true, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] SpedPay error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Test Ativus health by calling the edge function
async function testAtivus(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    // Use R$0.05 minimum for Ativus
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-ativus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        amount: MIN_AMOUNTS.ativus, // R$0.05 minimum
        donorName: 'Health Check',
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
    
    // Check for success
    if (data?.success === true) {
      console.log(`[HEALTH] Ativus responded successfully in ${responseTime}ms`);
      return { success: true, responseTime };
    }
    
    // Check for specific error responses
    if (response.status >= 500 || !data?.success) {
      const errorMsg = extractErrorDetails(null, data);
      console.error(`[HEALTH] Ativus error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
    return { success: true, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] Ativus error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Test Valorion health
async function testValorion(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-valorion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        amount: MIN_AMOUNTS.valorion,
        donorName: 'Health Check',
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
    
    // Check for success
    if (data?.success === true) {
      console.log(`[HEALTH] Valorion responded successfully in ${responseTime}ms`);
      return { success: true, responseTime };
    }
    
    // Check for specific error responses
    if (response.status >= 500 || !data?.success) {
      const errorMsg = extractErrorDetails(null, data);
      console.error(`[HEALTH] Valorion error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
    return { success: true, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = extractErrorDetails(err);
    console.error(`[HEALTH] Valorion error: ${errorMsg}`);
    return { success: false, responseTime, error: errorMsg };
  }
}

// Test Inter health
async function testInter(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-inter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        amount: MIN_AMOUNTS.inter,
        donorName: 'Health Check',
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
    
    // Check for success
    if (data?.success === true) {
      console.log(`[HEALTH] Inter responded successfully in ${responseTime}ms`);
      return { success: true, responseTime };
    }
    
    // Check for specific error responses
    if (response.status >= 500 || !data?.success) {
      const errorMsg = extractErrorDetails(null, data);
      console.error(`[HEALTH] Inter error: ${errorMsg}`);
      return { success: false, responseTime, error: errorMsg };
    }
    
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
  console.log(`[HEALTH] Checking ${acquirer} (timeout: ${HEALTH_CHECK_TIMEOUT_MS}ms, min amount: R$${MIN_AMOUNTS[acquirer] || 0.01})...`);
  
  switch (acquirer) {
    case 'spedpay':
      return await testSpedPay();
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
  
  console.log(`[HEALTH-CHECK] Starting health check for all acquirers (timeout: ${HEALTH_CHECK_TIMEOUT_MS}ms)...`);
  
  const results: Record<string, { success: boolean; responseTime: number; error?: string }> = {};
  
  // Check all acquirers in parallel for maximum speed
  const healthChecks = await Promise.all(
    ACQUIRERS.map(async (acquirer) => {
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
  
  console.log(`[HEALTH-CHECK] Completed in ${totalTime}ms - ${healthyCount}/${totalCount} acquirers healthy`);
  
  // Return summary
  const summary = {
    timestamp: new Date().toISOString(),
    duration_ms: totalTime,
    healthy_count: healthyCount,
    total_count: totalCount,
    timeout_ms: HEALTH_CHECK_TIMEOUT_MS,
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
