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
    const supabase = getSupabaseClient();
    
    // Get all pending transactions
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('pix_transactions')
      .select('id, txid, user_id, amount')
      .eq('status', 'generated')
      .not('txid', 'is', null);
    
    if (fetchError) {
      console.error('Error fetching pending transactions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending transactions to check`);

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending transactions found', checked: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group transactions by user_id to optimize API key fetching
    const userApiKeys: Record<string, string | null> = {};
    const defaultApiKey = Deno.env.get('SPEDPAY_API_KEY') || null;

    let checkedCount = 0;
    let updatedCount = 0;
    const results: any[] = [];

    for (const transaction of pendingTransactions) {
      checkedCount++;
      
      // Get API key for this user (cached)
      let apiKey: string | null = null;
      if (transaction.user_id) {
        if (!(transaction.user_id in userApiKeys)) {
          userApiKeys[transaction.user_id] = await getApiKeyForUser(supabase, transaction.user_id);
        }
        apiKey = userApiKeys[transaction.user_id];
      }
      
      if (!apiKey) {
        apiKey = defaultApiKey;
      }
      
      if (!apiKey) {
        console.log(`Skipping transaction ${transaction.id} - no API key available`);
        results.push({ id: transaction.id, status: 'skipped', reason: 'no_api_key' });
        continue;
      }

      try {
        console.log(`Checking SpedPay status for txid: ${transaction.txid}`);
        
        const response = await fetch(`${SPEDPAY_API_URL}/v1/transactions/${transaction.txid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-secret': apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SpedPay API error for ${transaction.txid}:`, response.status, errorText);
          results.push({ id: transaction.id, txid: transaction.txid, status: 'error', reason: errorText });
          continue;
        }

        const spedpayData = await response.json();
        const spedpayStatus = spedpayData.status?.toLowerCase() || '';
        
        console.log(`Transaction ${transaction.txid} SpedPay status: ${spedpayStatus}`);

        const isPaid = ['paid', 'authorized', 'approved', 'completed', 'confirmed'].includes(spedpayStatus);

        if (isPaid) {
          console.log(`Marking transaction ${transaction.txid} as paid`);
          
          const { data: updated, error: updateError } = await supabase.rpc('mark_pix_paid', {
            p_txid: transaction.txid
          });

          if (updateError) {
            console.error(`Error updating transaction ${transaction.txid}:`, updateError);
            results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
          } else {
            updatedCount++;
            results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount });
          }
        } else {
          results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', spedpay_status: spedpayStatus });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error checking transaction ${transaction.txid}:`, err);
        results.push({ id: transaction.id, txid: transaction.txid, status: 'error', reason: String(err) });
      }
    }

    console.log(`Batch check complete: ${checkedCount} checked, ${updatedCount} updated to paid`);

    return new Response(
      JSON.stringify({ 
        message: 'Batch check complete',
        checked: checkedCount, 
        updated: updatedCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
