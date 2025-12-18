import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valorion Status Check API URL from documentation
const VALORION_STATUS_URL = 'https://app.valorion.com.br/api/s1/getTransactionStatus.php';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getValorionApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try to get from admin_settings for specific user
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'valorion_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      console.log('Using Valorion API key from admin_settings for user:', userId);
      return data.value;
    }
  }
  
  // Try global setting (user_id is NULL)
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'valorion_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    console.log('Using Valorion API key from global admin_settings');
    return globalData.value;
  }
  
  // Fall back to environment variable
  const envKey = Deno.env.get('VALORION_API_KEY');
  if (envKey) {
    console.log('Using Valorion API key from environment variable');
    return envKey;
  }
  
  return null;
}

async function checkValorionStatus(
  idTransaction: string, 
  apiKey: string, 
  supabase: any
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Valorion, id_transaction:', idTransaction);

  // Build status URL with query parameter
  const statusUrl = `${VALORION_STATUS_URL}?id_transaction=${encodeURIComponent(idTransaction)}`;
  console.log('Valorion status URL:', statusUrl);

  try {
    // Valorion uses Basic auth for status check
    const authHeader = btoa(apiKey);
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Valorion FULL response:', response.status, responseText);

    if (!response.ok) {
      console.error('Valorion status check failed:', response.status, responseText);
      return { isPaid: false, status: 'pending' };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Valorion response');
      return { isPaid: false, status: 'pending' };
    }

    // Check status field - Valorion uses "PAID_OUT" for paid transactions
    const situacao = (data.situacao || data.status || data.data?.status || '').toString().toUpperCase();
    const paidAt = data.data_transacao || data.paidAt || data.data?.paidAt || null;
    
    console.log('Valorion parsed status:', situacao, 'paidAt:', paidAt);
    
    // Check for all possible paid status values
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log('*** Transaction is PAID! Marking as paid in database ***');
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: idTransaction });
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    // Map Valorion status to our status
    let mappedStatus = 'pending';
    if (isPaid) {
      mappedStatus = 'paid';
    } else if (['AGUARDANDO_PAGAMENTO', 'PENDING', 'WAITING'].includes(situacao)) {
      mappedStatus = 'generated';
    } else if (['EXPIRADO', 'EXPIRED', 'CANCELADO', 'REFUSED', 'CANCELLED', 'CANCELED'].includes(situacao)) {
      mappedStatus = 'expired';
    }

    return {
      isPaid,
      status: mappedStatus,
      paidAt: paidAt || undefined,
    };
  } catch (error) {
    console.error('Error checking Valorion status:', error);
    return { isPaid: false, status: 'pending' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId, userId } = await req.json();
    
    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking Valorion status for transaction:', transactionId);

    const supabase = getSupabaseClient();
    
    // Find transaction in database
    let transaction = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(transactionId);
    
    if (isUuid) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();
      transaction = result.data;
    }
    
    if (!transaction) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('txid', transactionId)
        .maybeSingle();
      transaction = result.data;
    }
    
    if (!transaction) {
      console.error('Transaction not found for:', transactionId);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found transaction:', transaction.id, 'txid:', transaction.txid, 'status:', transaction.status);

    // If already paid, return immediately
    if (transaction.status === 'paid') {
      console.log('Transaction already marked as paid');
      return new Response(
        JSON.stringify({ status: 'paid', paid_at: transaction.paid_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txid = transaction.txid;
    if (!txid) {
      return new Response(
        JSON.stringify({ status: transaction.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Valorion API key
    const effectiveUserId = userId || transaction.user_id;
    const apiKey = await getValorionApiKey(supabase, effectiveUserId);
    
    if (!apiKey) {
      console.error('No Valorion API key available');
      return new Response(
        JSON.stringify({ error: 'Valorion API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await checkValorionStatus(txid, apiKey, supabase);

    return new Response(
      JSON.stringify({
        status: result.status,
        isPaid: result.isPaid,
        paid_at: result.paidAt || (result.isPaid ? new Date().toISOString() : undefined),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking Valorion PIX status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
