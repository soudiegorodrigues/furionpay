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
  console.log('[ATIVUS-WEBHOOK] Timestamp:', timestamp);
  
  // STRICT MODE: Validate request origin
  const validation = validateAtivusRequest(req);
  
  console.log('[ATIVUS-WEBHOOK] IP:', validation.ip);
  console.log('[ATIVUS-WEBHOOK] User-Agent:', validation.userAgent);
  console.log('[ATIVUS-WEBHOOK] Valid:', validation.valid);
  
  const supabase = getSupabaseClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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
    console.error('[ATIVUS-WEBHOOK] Failed to log security event:', logError);
  }

  // STRICT MODE: Block unauthorized requests
  if (!validation.valid) {
    console.error('[ATIVUS-WEBHOOK] BLOCKED - Unauthorized request:', validation.reason);
    
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

  console.log('[ATIVUS-WEBHOOK] Request authenticated successfully');

  try {
    let payload: any;
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();

    console.log('[ATIVUS-WEBHOOK] Raw body:', rawBody);

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

    console.log('[ATIVUS-WEBHOOK] Parsed payload:', JSON.stringify(payload));
    console.log('[ATIVUS-WEBHOOK] All payload keys:', Object.keys(payload));

    // Extract transaction info from Ativus webhook
    const rawTransactionId = 
      payload.id_transaction || 
      payload.transactionId || 
      payload.id || 
      payload.externalRef ||
      payload.data?.id ||
      payload.data?.externalRef ||
      payload.data?.id_transaction ||
      null;
    
    // Ensure transactionId is always a string (fixes "substring is not a function" error)
    const transactionId = rawTransactionId !== null && rawTransactionId !== undefined 
      ? String(rawTransactionId) 
      : null;
    
    const status = (
      payload.situacao || 
      payload.status || 
      payload.data?.status ||
      payload.data?.situacao ||
      ''
    ).toString().toUpperCase();
    
    const paidAt = payload.data_transacao || payload.paidAt || payload.data?.paidAt || null;

    console.log('[ATIVUS-WEBHOOK] Transaction ID:', transactionId);
    console.log('[ATIVUS-WEBHOOK] Status:', status);
    console.log('[ATIVUS-WEBHOOK] PaidAt:', paidAt);

    if (!transactionId) {
      console.log('[ATIVUS-WEBHOOK] No transaction ID found in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no transaction ID found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a payment confirmation
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('[ATIVUS-WEBHOOK] *** PAYMENT CONFIRMED via webhook! Searching in database ***');
      
      // Try to find the transaction
      let transaction = null;

      // Strategy 1: Search by txid
      const { data: txidData } = await supabase
        .from('pix_transactions')
        .select('id, user_id, txid, status')
        .eq('txid', transactionId)
        .eq('acquirer', 'ativus')
        .maybeSingle();
      
      if (txidData) {
        console.log('[ATIVUS-WEBHOOK] Found by txid:', txidData.id);
        transaction = txidData;
      }

      // Strategy 2: Search by id if txid not found
      if (!transaction) {
        const { data: idData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('id', transactionId)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (idData) {
          console.log('[ATIVUS-WEBHOOK] Found by id:', idData.id);
          transaction = idData;
        }
      }

      // Strategy 3: Partial txid match
      if (!transaction) {
        const { data: partialData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .ilike('txid', `%${transactionId.substring(0, 20)}%`)
          .eq('acquirer', 'ativus')
          .eq('status', 'generated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (partialData) {
          console.log('[ATIVUS-WEBHOOK] Found by partial match:', partialData.id);
          transaction = partialData;
        }
      }

      if (!transaction) {
        console.error('[ATIVUS-WEBHOOK] Transaction not found');
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'ativus',
          event_type: 'failure',
          error_message: `Transaction not found: ${transactionId}`,
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already paid
      if (transaction.status === 'paid') {
        console.log('[ATIVUS-WEBHOOK] Transaction already paid');
        return new Response(
          JSON.stringify({ success: true, message: 'Already paid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark transaction as paid using RPC function
      const { error: rpcError } = await supabase.rpc('mark_pix_paid', {
        p_txid: transaction.txid
      });

      if (rpcError) {
        console.error('[ATIVUS-WEBHOOK] RPC error:', rpcError);
        
        // Try direct update as fallback
        const { error: directError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: paidAt || new Date().toISOString(),
            paid_date_brazil: new Date().toISOString().split('T')[0]
          })
          .eq('id', transaction.id);
        
        if (directError) {
          console.error('[ATIVUS-WEBHOOK] Direct update also failed:', directError);
        } else {
          console.log('[ATIVUS-WEBHOOK] Transaction marked as paid via direct update');
        }
      } else {
        console.log('[ATIVUS-WEBHOOK] Transaction marked as paid via RPC');
      }

      // Dispatch webhook to API clients (same as Valorion)
      if (transaction.id) {
        try {
          const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/api-webhook-dispatch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              transaction_id: transaction.id,
              event: 'payment.paid',
            }),
          });

          console.log('[ATIVUS-WEBHOOK] Webhook dispatch:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[ATIVUS-WEBHOOK] Webhook dispatch error:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'webhook_paid',
        error_message: JSON.stringify({ 
          txid: transaction.txid, 
          id: transaction.id,
          ip: validation.ip
        }).slice(0, 500)
      });

    } else {
      console.log('[ATIVUS-WEBHOOK] Status not paid:', status);
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'webhook_received',
        error_message: `Status ${status} for id=${transactionId}`,
      });
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
    console.error('[ATIVUS-WEBHOOK] Error:', error);
    
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'failure',
        error_message: `${error instanceof Error ? error.message : 'Error'} - IP: ${validation.ip}`,
      });
    } catch (logError) {
      console.error('[ATIVUS-WEBHOOK] Log error failed:', logError);
    }
    
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
