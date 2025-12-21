import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================
// SECURITY VALIDATION - STRICT MODE
// Whitelist of allowed IPs and User-Agents for Ativus
// ============================================
const ATIVUS_ALLOWED_IPS = [
  '45.183.130.229',  // Ativus production server (confirmed from logs)
  '45.183.130.',     // Ativus IP range (prefix match)
];

const ATIVUS_ALLOWED_USER_AGENTS = [
  'AtivusHUB-Webhook/2.0',  // Confirmed from logs
  'AtivusHUB-Webhook/',     // Version-agnostic match
  'AtivusHUB',              // Fallback match
];

function extractClientIp(req: Request): string {
  const headers = req.headers;
  // Check various headers that might contain the real IP
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             headers.get('cf-connecting-ip') ||
             'unknown';
  return ip;
}

function validateAtivusRequest(req: Request): { valid: boolean; reason: string; ip: string; userAgent: string } {
  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Validate IP
  const ipValid = ATIVUS_ALLOWED_IPS.some(allowedIp => {
    if (allowedIp.endsWith('.')) {
      // Prefix match for IP ranges
      return ip.startsWith(allowedIp);
    }
    return ip === allowedIp;
  });
  
  if (!ipValid) {
    return { 
      valid: false, 
      reason: `IP não autorizado: ${ip}`,
      ip,
      userAgent
    };
  }
  
  // Validate User-Agent
  const uaValid = ATIVUS_ALLOWED_USER_AGENTS.some(allowedUA => 
    userAgent.includes(allowedUA)
  );
  
  if (!uaValid) {
    return { 
      valid: false, 
      reason: `User-Agent não autorizado: ${userAgent}`,
      ip,
      userAgent
    };
  }
  
  return { valid: true, reason: 'OK', ip, userAgent };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log('=== ATIVUS WEBHOOK RECEIVED ===');
  console.log('Timestamp:', timestamp);
  
  // STRICT MODE: Validate request origin
  const validation = validateAtivusRequest(req);
  
  console.log('[SECURITY] IP:', validation.ip);
  console.log('[SECURITY] User-Agent:', validation.userAgent);
  console.log('[SECURITY] Valid:', validation.valid);
  
  const supabase = getSupabaseClient();

  // Log security event regardless of validation result
  try {
    await supabase.from('api_monitoring_events').insert({
      acquirer: 'ativus',
      event_type: validation.valid ? 'webhook_authenticated' : 'webhook_blocked',
      error_message: JSON.stringify({ 
        ip: validation.ip,
        userAgent: validation.userAgent,
        valid: validation.valid,
        reason: validation.reason,
        timestamp
      }).slice(0, 500)
    });
  } catch (logError) {
    console.error('Failed to log security event:', logError);
  }

  // STRICT MODE: Block unauthorized requests
  if (!validation.valid) {
    console.error('[SECURITY] BLOCKED - Unauthorized request:', validation.reason);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Request origin not authorized'
      }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log('[SECURITY] Request authenticated successfully');

  try {
    let payload: any;
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();

    if (contentType.includes('application/json')) {
      payload = JSON.parse(rawBody);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    } else {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = { raw: rawBody };
      }
    }

    console.log('Parsed payload:', JSON.stringify(payload));

    // Extract transaction info from Ativus webhook
    const transactionId = 
      payload.id_transaction || 
      payload.transactionId || 
      payload.id || 
      payload.externalRef ||
      payload.data?.id ||
      payload.data?.externalRef ||
      null;
    
    const status = (
      payload.situacao || 
      payload.status || 
      payload.data?.status ||
      payload.data?.situacao ||
      ''
    ).toString().toUpperCase();
    
    const paidAt = payload.data_transacao || payload.paidAt || payload.data?.paidAt || null;

    console.log('Transaction ID:', transactionId);
    console.log('Status:', status);

    if (!transactionId) {
      console.log('No transaction ID found in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no transaction ID found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a payment confirmation
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('*** PAYMENT CONFIRMED via webhook! Marking as paid ***');
      
      // Try to find and update the transaction
      const { error: updateError } = await supabase.rpc('mark_pix_paid', {
        p_txid: transactionId
      });

      if (updateError) {
        console.error('Error marking PIX as paid:', updateError);
        
        // Try direct update as fallback
        const { error: directError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: paidAt || new Date().toISOString() 
          })
          .eq('txid', transactionId);
        
        if (directError) {
          console.error('Direct update also failed:', directError);
        } else {
          console.log('Transaction marked as paid via direct update');
        }
      } else {
        console.log('Transaction marked as paid successfully via RPC');
      }
    } else {
      console.log('Webhook received but status is not paid:', status);
    }

    // Log the webhook event
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: isPaid ? 'webhook_paid' : 'webhook_received',
        error_message: JSON.stringify({ 
          transactionId, 
          status, 
          paidAt,
          isPaid,
          ip: validation.ip
        }).slice(0, 500)
      });
    } catch (logError) {
      console.log('Failed to log webhook event:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        transactionId,
        status,
        isPaid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Ativus webhook:', error);
    
    // Always return 200 to prevent retries
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
