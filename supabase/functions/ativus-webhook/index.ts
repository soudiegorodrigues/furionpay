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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== ATIVUS WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

  try {
    let payload: any;
    const contentType = req.headers.get('content-type') || '';
    
    // Try to parse the body
    const rawBody = await req.text();
    console.log('Raw body:', rawBody);

    if (contentType.includes('application/json')) {
      payload = JSON.parse(rawBody);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    } else {
      // Try JSON anyway
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = { raw: rawBody };
      }
    }

    console.log('Parsed payload:', JSON.stringify(payload));

    // Extract transaction info from Ativus webhook
    // Ativus can send different formats, try to extract the key fields
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
    console.log('Paid At:', paidAt);

    if (!transactionId) {
      console.log('No transaction ID found in webhook payload');
      // Still return 200 to prevent Ativus from retrying
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no transaction ID found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Check if this is a payment confirmation
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('*** PAYMENT CONFIRMED via webhook! Marking as paid ***');
      
      // Try to find and update the transaction
      // First try by txid
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

      // Send to Utmify (async, don't wait for response)
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        
        // Get transaction details for Utmify
        const { data: txData } = await supabase
          .from('pix_transactions')
          .select('amount, donor_name, product_name, utm_data, user_id')
          .eq('txid', transactionId)
          .maybeSingle();
        
        if (txData) {
          fetch(`${supabaseUrl}/functions/v1/utmify-send-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              txid: transactionId,
              amount: txData.amount,
              status: 'paid',
              customerName: txData.donor_name,
              productName: txData.product_name,
              paidAt: paidAt || new Date().toISOString(),
              utmData: txData.utm_data,
              userId: txData.user_id,
            }),
          }).catch(err => console.log('[UTMIFY] Error sending paid order (non-blocking):', err));
        }
      } catch (utmifyError) {
        console.log('[UTMIFY] Error preparing paid request (non-blocking):', utmifyError);
      }
    } else {
      console.log('Webhook received but status is not paid:', status);
    }

    // Log the webhook event for debugging
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: isPaid ? 'webhook_paid' : 'webhook_received',
        error_message: JSON.stringify({ 
          transactionId, 
          status, 
          paidAt,
          isPaid 
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
