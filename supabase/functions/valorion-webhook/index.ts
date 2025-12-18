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

    console.log('[VALORION-WEBHOOK] Received FULL payload:', JSON.stringify(payload));

    // Extract transaction ID from multiple possible fields
    const transactionId = payload.id_transaction || 
                          payload.idTransaction || 
                          payload.transaction_id || 
                          payload.id ||
                          payload.data?.id_transaction ||
                          payload.data?.id;
    
    // Extract metadata (contains our local txid)
    const metadata = payload.metadata || payload.data?.metadata;
                          
    const status = (payload.situacao || 
                    payload.status || 
                    payload.data?.status || 
                    payload.data?.situacao ||
                    '').toString().toUpperCase();

    console.log('[VALORION-WEBHOOK] Transaction ID:', transactionId);
    console.log('[VALORION-WEBHOOK] Metadata (local txid):', metadata);
    console.log('[VALORION-WEBHOOK] Status:', status);

    if (!transactionId && !metadata) {
      console.error('[VALORION-WEBHOOK] No transaction ID or metadata found in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'No transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if status indicates payment completed
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('[VALORION-WEBHOOK] Transaction is PAID! Searching in database...');

      // Try multiple search strategies
      let transaction = null;

      // Strategy 1: Search by txid (which should be the id_transaction from Valorion)
      if (transactionId) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', transactionId)
          .eq('acquirer', 'valorion')
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by txid:', data.id);
          transaction = data;
        }
      }

      // Strategy 2: Search by metadata (our local generated txid)
      if (!transaction && metadata) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', metadata)
          .eq('acquirer', 'valorion')
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by metadata:', data.id);
          transaction = data;
        }
      }

      // Strategy 3: Search by partial txid match (in case of truncation)
      if (!transaction && transactionId) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .ilike('txid', `%${transactionId.substring(0, 20)}%`)
          .eq('acquirer', 'valorion')
          .eq('status', 'generated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by partial match:', data.id);
          transaction = data;
        }
      }

      if (!transaction) {
        console.error('[VALORION-WEBHOOK] Transaction not found in database');
        console.log('[VALORION-WEBHOOK] Searched for txid:', transactionId);
        console.log('[VALORION-WEBHOOK] Searched for metadata:', metadata);
        
        // Log the failed lookup
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'valorion',
          event_type: 'failure',
          error_message: `Webhook: transaction not found for id=${transactionId}, metadata=${metadata}`,
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already paid
      if (transaction.status === 'paid') {
        console.log('[VALORION-WEBHOOK] Transaction already marked as paid');
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
        console.error('[VALORION-WEBHOOK] Error marking transaction as paid via RPC:', rpcError);
        
        // Try direct update as fallback
        const { error: updateError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: new Date().toISOString() 
          })
          .eq('id', transaction.id);
          
        if (updateError) {
          console.error('[VALORION-WEBHOOK] Direct update also failed:', updateError);
        } else {
          console.log('[VALORION-WEBHOOK] Transaction marked as paid via direct update');
        }
      } else {
        console.log('[VALORION-WEBHOOK] Transaction marked as paid via RPC');
      }

      // Dispatch webhook to API clients
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

          console.log('[VALORION-WEBHOOK] Webhook dispatch response:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[VALORION-WEBHOOK] Error dispatching webhook:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'success',
        error_message: `Webhook: payment confirmed for txid=${transaction.txid}, id=${transaction.id}`,
      });

    } else {
      console.log('[VALORION-WEBHOOK] Status is not paid:', status);
      
      // Log the webhook event for non-paid statuses
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'retry',
        error_message: `Webhook: status ${status} for id=${transactionId}, metadata=${metadata}`,
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
