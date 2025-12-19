import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Acquirers to check
const ACQUIRERS = ['spedpay', 'ativus', 'valorion', 'inter'];

// Timeout for health check requests (2 seconds)
const HEALTH_CHECK_TIMEOUT_MS = 2000;

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

// Test SpedPay health
async function testSpedPay(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('SPEDPAY_API_KEY');
  
  if (!apiKey) {
    return { success: false, responseTime: 0, error: 'API key not configured' };
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
    
    // Any response (even 401/403) means the API is alive
    return { success: response.status < 500, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
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
    
    // Make a minimal test call - this won't actually create a transaction
    // but will test if the edge function and Ativus API are reachable
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-ativus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ 
        amount: 0.01, // Minimal amount for health check
        donorName: 'Health Check',
        healthCheck: true // Signal that this is a health check
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Check if response indicates the service is working
    const data = await response.json();
    return { success: data.success === true || response.status < 500, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
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
        amount: 0.01,
        donorName: 'Health Check',
        healthCheck: true
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const data = await response.json();
    return { success: data.success === true || response.status < 500, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
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
        amount: 0.01,
        donorName: 'Health Check',
        healthCheck: true
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const data = await response.json();
    return { success: data.success === true || response.status < 500, responseTime };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, responseTime, error: errorMsg };
  }
}

// Main health check function
async function checkAcquirerHealth(acquirer: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
  console.log(`[HEALTH] Checking ${acquirer}...`);
  
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
      return { success: false, responseTime: 0, error: `Unknown acquirer: ${acquirer}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  console.log('[HEALTH-CHECK] Starting health check for all acquirers...');
  
  const results: Record<string, { success: boolean; responseTime: number; error?: string }> = {};
  
  // Check all acquirers in parallel for maximum speed
  const healthChecks = await Promise.all(
    ACQUIRERS.map(async (acquirer) => {
      // First check if acquirer is enabled
      const isEnabled = await isAcquirerEnabled(supabase, acquirer);
      
      if (!isEnabled) {
        console.log(`[HEALTH] ${acquirer} is disabled, skipping`);
        return { acquirer, result: { success: false, responseTime: 0, error: 'Acquirer disabled' }, skipped: true };
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
      console.log(`[HEALTH] ${acquirer}: ${result.success ? '✅ HEALTHY' : '❌ UNHEALTHY'} (${result.responseTime}ms)`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`[HEALTH-CHECK] Completed in ${totalTime}ms`);
  
  // Return summary
  const summary = {
    timestamp: new Date().toISOString(),
    duration_ms: totalTime,
    results: Object.entries(results).map(([acquirer, result]) => ({
      acquirer,
      is_healthy: result.success,
      response_time_ms: result.responseTime,
      error: result.error || null
    }))
  };
  
  return new Response(
    JSON.stringify(summary),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
