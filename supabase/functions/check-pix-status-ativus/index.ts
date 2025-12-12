import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ativus Hub correct API URL for status check - from documentation
const ATIVUS_STATUS_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAtivusApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try to get from admin_settings for specific user
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'ativus_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      console.log('Using Ativus API key from admin_settings for user:', userId);
      return data.value;
    }
  }
  
  // Try global setting (user_id is NULL)
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    console.log('Using Ativus API key from global admin_settings');
    return globalData.value;
  }
  
  // Fall back to environment variable
  const envKey = Deno.env.get('ATIVUS_API_KEY');
  if (envKey) {
    console.log('Using Ativus API key from environment variable');
    return envKey;
  }
  
  return null;
}

async function checkAtivusStatus(
  idTransaction: string, 
  apiKey: string, 
  supabase: any
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Ativus Hub, id_transaction:', idTransaction);

  // Check if API key is already Base64 encoded
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  // Use the correct endpoint from documentation
  const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${encodeURIComponent(idTransaction)}`;
  console.log('Ativus status URL:', statusUrl);

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Ativus status response:', response.status, responseText);

    if (!response.ok) {
      console.error('Ativus status check failed:', response.status, responseText);
      return { isPaid: false, status: 'pending' };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Ativus response');
      return { isPaid: false, status: 'pending' };
    }

    // According to documentation, response format is:
    // { "situacao": "AGUARDANDO_PAGAMENTO" | "CONCLUIDO" | etc, "tipo": "CASH IN", ... }
    const situacao = (data.situacao || data.status || '').toString().toUpperCase();
    
    console.log('Ativus transaction situacao:', situacao);
    
    // Check for paid statuses - Ativus uses "CONCLUIDO" or "PAGO" for paid transactions
    const paidStatuses = ['CONCLUIDO', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED'];
    const isPaid = paidStatuses.includes(situacao);

    if (isPaid) {
      console.log('Transaction is PAID! Marking as paid in database');
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: idTransaction });
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    // Map Ativus status to our status
    let mappedStatus = 'pending';
    if (isPaid) {
      mappedStatus = 'paid';
    } else if (situacao === 'AGUARDANDO_PAGAMENTO') {
      mappedStatus = 'generated';
    } else if (situacao === 'EXPIRADO' || situacao === 'EXPIRED' || situacao === 'CANCELADO') {
      mappedStatus = 'expired';
    }

    return {
      isPaid,
      status: mappedStatus,
      paidAt: data.data_transacao || undefined,
    };
  } catch (error) {
    console.error('Error checking Ativus status:', error);
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

    console.log('Checking Ativus status for transaction:', transactionId);

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

    // Get Ativus API key
    const effectiveUserId = userId || transaction.user_id;
    const apiKey = await getAtivusApiKey(supabase, effectiveUserId);
    
    if (!apiKey) {
      console.error('No Ativus API key available');
      return new Response(
        JSON.stringify({ error: 'Ativus API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await checkAtivusStatus(txid, apiKey, supabase);

    return new Response(
      JSON.stringify({
        status: result.status,
        isPaid: result.isPaid,
        paid_at: result.paidAt || (result.isPaid ? new Date().toISOString() : undefined),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking Ativus PIX status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
