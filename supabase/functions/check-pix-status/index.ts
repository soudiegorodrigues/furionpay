import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getApiKeyForUser(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'spedpay_api_key')
    .eq('user_id', userId)
    .single();
  
  if (error || !data?.value) {
    return null;
  }
  
  return data.value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();
    
    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking status for transaction:', transactionId);

    const supabase = getSupabaseClient();
    
    // Get transaction from database
    const { data: transaction, error: txError } = await supabase
      .from('pix_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (txError || !transaction) {
      console.error('Transaction not found:', txError?.message);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already paid, return immediately
    if (transaction.status === 'paid') {
      console.log('Transaction already marked as paid');
      return new Response(
        JSON.stringify({ status: 'paid', paid_at: transaction.paid_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key for user
    let apiKey: string | null = null;
    if (transaction.user_id) {
      apiKey = await getApiKeyForUser(supabase, transaction.user_id);
    }
    
    if (!apiKey) {
      apiKey = Deno.env.get('SPEDPAY_API_KEY') || null;
    }
    
    if (!apiKey) {
      console.error('No API key available');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query SpedPay API for transaction status using txid
    const spedpayTxId = transaction.txid;
    if (!spedpayTxId) {
      console.error('No SpedPay transaction ID found');
      return new Response(
        JSON.stringify({ status: transaction.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Querying SpedPay for transaction:', spedpayTxId);

    const response = await fetch(`${SPEDPAY_API_URL}/v1/transactions/${spedpayTxId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SpedPay API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ status: transaction.status, spedpay_error: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spedpayData = await response.json();
    console.log('SpedPay transaction status:', JSON.stringify(spedpayData, null, 2));

    // Check if payment is complete - SpedPay uses various status values
    const spedpayStatus = spedpayData.status?.toLowerCase() || '';
    const isPaid = ['paid', 'authorized', 'approved', 'completed', 'confirmed'].includes(spedpayStatus);

    if (isPaid && transaction.status !== 'paid') {
      console.log('Payment confirmed! Updating database...');
      
      // Mark as paid using RPC function
      const { data: updated, error: updateError } = await supabase.rpc('mark_pix_paid', {
        p_txid: spedpayTxId
      });

      if (updateError) {
        console.error('Error updating payment status:', updateError);
      } else {
        console.log('Payment marked as paid:', updated);
      }

      return new Response(
        JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), just_updated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: transaction.status, 
        spedpay_status: spedpayStatus,
        spedpay_data: spedpayData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking PIX status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
