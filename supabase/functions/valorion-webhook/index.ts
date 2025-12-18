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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = getSupabaseClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    // Parse webhook payload
    let payload;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    } else {
      // Try to parse as JSON anyway
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    console.log('[VALORION-WEBHOOK] Received payload:', JSON.stringify(payload));

    // Extract transaction ID and status from Valorion webhook
    // Valorion webhook format may vary - handle multiple possible fields
    const transactionId = payload.id_transaction || 
                          payload.idTransaction || 
                          payload.transaction_id || 
                          payload.id ||
                          payload.data?.id_transaction;
                          
    const status = (payload.situacao || 
                    payload.status || 
                    payload.data?.status || 
                    '').toString().toUpperCase();

    console.log('[VALORION-WEBHOOK] Transaction ID:', transactionId, 'Status:', status);

    if (!transactionId) {
      console.error('[VALORION-WEBHOOK] No transaction ID found in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'No transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if status indicates payment completed
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('[VALORION-WEBHOOK] Transaction is PAID! Marking in database...');

      // Mark transaction as paid using RPC function
      const { error: rpcError } = await supabase.rpc('mark_pix_paid', { 
        p_txid: transactionId 
      });

      if (rpcError) {
        console.error('[VALORION-WEBHOOK] Error marking transaction as paid:', rpcError);
        
        // Try direct update as fallback
        const { error: updateError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: new Date().toISOString() 
          })
          .eq('txid', transactionId);
          
        if (updateError) {
          console.error('[VALORION-WEBHOOK] Direct update also failed:', updateError);
        } else {
          console.log('[VALORION-WEBHOOK] Transaction marked as paid via direct update');
        }
      } else {
        console.log('[VALORION-WEBHOOK] Transaction marked as paid via RPC');
      }

      // Find transaction to get more details for webhook dispatch
      const { data: transaction } = await supabase
        .from('pix_transactions')
        .select('id, user_id')
        .eq('txid', transactionId)
        .maybeSingle();

      if (transaction?.id) {
        // Dispatch webhook to API clients
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

          console.log('[VALORION-WEBHOOK] Webhook dispatch response:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[VALORION-WEBHOOK] Error dispatching webhook:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'success',
        error_message: `Webhook received: payment confirmed for ${transactionId}`,
      });

    } else {
      console.log('[VALORION-WEBHOOK] Status is not paid:', status);
      
      // Log the webhook event for non-paid statuses
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'retry',
        error_message: `Webhook received: status ${status} for ${transactionId}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VALORION-WEBHOOK] Error processing webhook:', error);
    
    // Log error event
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'failure',
        error_message: error instanceof Error ? error.message : 'Webhook processing error',
      });
    } catch (logError) {
      console.error('[VALORION-WEBHOOK] Error logging failure:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
