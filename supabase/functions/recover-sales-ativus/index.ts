import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ativus Hub API URL for status check
const ATIVUS_STATUS_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAtivusApiKey(supabase: any, userId?: string): Promise<string | null> {
  if (userId) {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'ativus_api_key')
      .maybeSingle();
    if (data?.value) return data.value;
  }
  
  const { data: globalData } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (globalData?.value) return globalData.value;
  return Deno.env.get('ATIVUS_API_KEY') || null;
}

async function fetchAtivusTransaction(transactionId: string, apiKey: string): Promise<{
  success: boolean;
  data?: {
    id_transaction: string;
    nome: string;
    valor: number;
    situacao: string;
    data_transacao: string;
  };
  error?: string;
}> {
  console.log('[RECOVER] Fetching transaction from Ativus:', transactionId);
  
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${encodeURIComponent(transactionId)}`;
  
  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('[RECOVER] Ativus response:', response.status, responseText);

    if (!response.ok) {
      return { success: false, error: `Ativus API error: ${response.status}` };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: 'Failed to parse Ativus response' };
    }

    // Check if transaction was found
    if (data.erro || data.error || !data.id_transaction) {
      return { success: false, error: data.erro || data.error || 'Transaction not found in Ativus' };
    }

    return {
      success: true,
      data: {
        id_transaction: data.id_transaction || transactionId,
        nome: data.nome || data.customer_name || 'Não informado',
        valor: parseFloat(data.valor || data.amount || '0'),
        situacao: (data.situacao || data.status || 'AGUARDANDO_PAGAMENTO').toString().toUpperCase(),
        data_transacao: data.data_transacao || data.created_at || new Date().toISOString(),
      }
    };
  } catch (error) {
    console.error('[RECOVER] Error fetching from Ativus:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function mapAtivusStatus(situacao: string): 'generated' | 'paid' | 'expired' {
  const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
  const expiredStatuses = ['EXPIRADO', 'EXPIRED', 'CANCELADO', 'REFUSED', 'CANCELLED'];
  
  if (paidStatuses.includes(situacao)) return 'paid';
  if (expiredStatuses.includes(situacao)) return 'expired';
  return 'generated';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin_authenticated');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, transactionIds } = await req.json();

    if (!targetUserId || !transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'targetUserId and transactionIds array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RECOVER] Processing recovery for user:', targetUserId, 'transactions:', transactionIds.length);

    // Get Ativus API key for the target user
    const apiKey = await getAtivusApiKey(supabase, targetUserId);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ativus API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's fee config
    const { data: feeConfigData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', targetUserId)
      .eq('key', 'user_fee_config')
      .maybeSingle();

    let feePercentage = 6.99;
    let feeFixed = 2.49;

    if (feeConfigData?.value) {
      const { data: feeConfig } = await supabase
        .from('fee_configs')
        .select('pix_percentage, pix_fixed')
        .eq('id', feeConfigData.value)
        .maybeSingle();
      if (feeConfig) {
        feePercentage = feeConfig.pix_percentage;
        feeFixed = feeConfig.pix_fixed;
      }
    } else {
      const { data: defaultFee } = await supabase
        .from('fee_configs')
        .select('pix_percentage, pix_fixed')
        .eq('is_default', true)
        .maybeSingle();
      if (defaultFee) {
        feePercentage = defaultFee.pix_percentage;
        feeFixed = defaultFee.pix_fixed;
      }
    }

    const results: {
      transactionId: string;
      status: 'imported' | 'already_exists' | 'not_found' | 'error';
      message: string;
      data?: any;
    }[] = [];

    for (const transactionId of transactionIds) {
      const trimmedId = transactionId.trim();
      if (!trimmedId) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from('pix_transactions')
        .select('id, status')
        .eq('txid', trimmedId)
        .maybeSingle();

      if (existing) {
        results.push({
          transactionId: trimmedId,
          status: 'already_exists',
          message: `Já existe no sistema (status: ${existing.status})`,
          data: { id: existing.id, status: existing.status }
        });
        continue;
      }

      // Fetch from Ativus
      const ativusResult = await fetchAtivusTransaction(trimmedId, apiKey);
      
      if (!ativusResult.success || !ativusResult.data) {
        results.push({
          transactionId: trimmedId,
          status: 'not_found',
          message: ativusResult.error || 'Transação não encontrada na Ativus'
        });
        continue;
      }

      const txData = ativusResult.data;
      const mappedStatus = mapAtivusStatus(txData.situacao);
      const now = new Date();
      
      // Parse transaction date for Brazil timezone
      const txDate = new Date(txData.data_transacao);
      const brazilDate = txDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Insert into pix_transactions
      const { data: inserted, error: insertError } = await supabase
        .from('pix_transactions')
        .insert({
          user_id: targetUserId,
          txid: trimmedId,
          amount: txData.valor,
          donor_name: txData.nome,
          status: mappedStatus,
          acquirer: 'ativus',
          fee_percentage: feePercentage,
          fee_fixed: feeFixed,
          created_at: txData.data_transacao,
          created_date_brazil: brazilDate,
          paid_at: mappedStatus === 'paid' ? txData.data_transacao : null,
          paid_date_brazil: mappedStatus === 'paid' ? brazilDate : null,
          product_name: 'Recuperado via Admin',
          popup_model: 'recovered'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[RECOVER] Insert error:', insertError);
        results.push({
          transactionId: trimmedId,
          status: 'error',
          message: insertError.message
        });
        continue;
      }

      results.push({
        transactionId: trimmedId,
        status: 'imported',
        message: `Importado com sucesso (${mappedStatus})`,
        data: {
          id: inserted.id,
          amount: txData.valor,
          donor_name: txData.nome,
          status: mappedStatus
        }
      });
    }

    const summary = {
      total: results.length,
      imported: results.filter(r => r.status === 'imported').length,
      already_exists: results.filter(r => r.status === 'already_exists').length,
      not_found: results.filter(r => r.status === 'not_found').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('[RECOVER] Summary:', summary);

    return new Response(
      JSON.stringify({ success: true, results, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RECOVER] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
