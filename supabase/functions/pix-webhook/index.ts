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

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // SpedPay webhook payload structure (adjust based on actual SpedPay webhook format)
    const transactionId = body.id || body.transaction_id || body.external_id;
    const status = body.status || body.payment_status;
    
    if (!transactionId) {
      console.error('No transaction ID in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing webhook for transaction: ${transactionId}, status: ${status}`);

    // Check if payment was successful (SpedPay sends AUTHORIZED for successful PIX payments)
    const isPaid = status === 'paid' || status === 'PAID' || status === 'approved' || status === 'APPROVED' || status === 'completed' || status === 'COMPLETED' || status === 'authorized' || status === 'AUTHORIZED';

    if (isPaid) {
      const supabase = getSupabaseClient();
      
      // Try to find and update by txid (SpedPay transaction ID)
      const { data, error } = await supabase.rpc('mark_pix_paid', {
        p_txid: transactionId
      });

      if (error) {
        console.error('Error marking payment as paid:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment status', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Payment marked as paid: ${data}`);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Payment confirmed', updated: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other statuses, just acknowledge receipt
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received for status: ${status}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
