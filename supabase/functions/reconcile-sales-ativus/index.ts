import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ativus Hub API URLs
const ATIVUS_LIST_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactions.php';
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

function mapAtivusStatus(situacao: string): 'generated' | 'paid' | 'expired' {
  const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
  const expiredStatuses = ['EXPIRADO', 'EXPIRED', 'CANCELADO', 'REFUSED', 'CANCELLED'];
  
  if (paidStatuses.includes(situacao.toUpperCase())) return 'paid';
  if (expiredStatuses.includes(situacao.toUpperCase())) return 'expired';
  return 'generated';
}

async function fetchAtivusTransactionsByPeriod(
  apiKey: string, 
  startDate: string, 
  endDate: string
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  console.log('[RECONCILE] Fetching transactions from Ativus for period:', startDate, 'to', endDate);
  
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

  // Try the list endpoint with date filters
  const listUrl = `${ATIVUS_LIST_URL}?data_inicio=${encodeURIComponent(startDate)}&data_fim=${encodeURIComponent(endDate)}`;
  
  try {
    console.log('[RECONCILE] Calling Ativus list URL:', listUrl);
    
    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('[RECONCILE] Ativus list response status:', response.status);
    console.log('[RECONCILE] Ativus list response body:', responseText.substring(0, 500));

    if (!response.ok) {
      // If list endpoint doesn't exist, return error with guidance
      if (response.status === 404) {
        return { 
          success: false, 
          error: 'Endpoint de listagem não disponível na Ativus. Use a recuperação manual por IDs de transação.' 
        };
      }
      return { success: false, error: `Ativus API error: ${response.status} - ${responseText}` };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: 'Failed to parse Ativus response' };
    }

    // Handle different response formats from Ativus
    let transactions = [];
    
    if (Array.isArray(data)) {
      transactions = data;
    } else if (data.transactions && Array.isArray(data.transactions)) {
      transactions = data.transactions;
    } else if (data.data && Array.isArray(data.data)) {
      transactions = data.data;
    } else if (data.resultado && Array.isArray(data.resultado)) {
      transactions = data.resultado;
    } else if (data.erro || data.error) {
      return { success: false, error: data.erro || data.error };
    }

    console.log('[RECONCILE] Found', transactions.length, 'transactions from Ativus');

    return {
      success: true,
      transactions: transactions.map((tx: any) => ({
        id_transaction: tx.id_transaction || tx.id || tx.txid,
        nome: tx.nome || tx.customer_name || tx.pagador || 'Não informado',
        valor: parseFloat(tx.valor || tx.amount || tx.value || '0'),
        situacao: (tx.situacao || tx.status || 'AGUARDANDO_PAGAMENTO').toString().toUpperCase(),
        data_transacao: tx.data_transacao || tx.created_at || tx.data_criacao || new Date().toISOString(),
        cpf: tx.cpf || tx.documento || null,
        email: tx.email || null,
      }))
    };
  } catch (error) {
    console.error('[RECONCILE] Error fetching from Ativus:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchSingleTransaction(transactionId: string, apiKey: string): Promise<any | null> {
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

    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.erro || data.error || !data.id_transaction) return null;

    return {
      id_transaction: data.id_transaction || transactionId,
      nome: data.nome || data.customer_name || 'Não informado',
      valor: parseFloat(data.valor || data.amount || '0'),
      situacao: (data.situacao || data.status || 'AGUARDANDO_PAGAMENTO').toString().toUpperCase(),
      data_transacao: data.data_transacao || data.created_at || new Date().toISOString(),
      cpf: data.cpf || data.documento || null,
      email: data.email || null,
    };
  } catch {
    return null;
  }
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

    const { targetUserId, startDate, endDate, transactionIds } = await req.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'targetUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Either period or transactionIds must be provided
    const hasPeriod = startDate && endDate;
    const hasIds = transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0;

    if (!hasPeriod && !hasIds) {
      return new Response(
        JSON.stringify({ error: 'Either startDate/endDate or transactionIds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RECONCILE] Processing reconciliation for user:', targetUserId);
    console.log('[RECONCILE] Period:', startDate, 'to', endDate);
    console.log('[RECONCILE] Transaction IDs provided:', hasIds ? transactionIds.length : 0);

    // Get Ativus API key for the target user
    const apiKey = await getAtivusApiKey(supabase, targetUserId);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ativus API key not configured for this user' }),
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

    let ativusTransactions: any[] = [];
    let listEndpointAvailable = true;

    // Try to fetch by period first
    if (hasPeriod) {
      const periodResult = await fetchAtivusTransactionsByPeriod(apiKey, startDate, endDate);
      
      if (periodResult.success && periodResult.transactions) {
        ativusTransactions = periodResult.transactions;
        console.log('[RECONCILE] Got', ativusTransactions.length, 'transactions from period search');
      } else {
        listEndpointAvailable = false;
        console.log('[RECONCILE] List endpoint not available:', periodResult.error);
      }
    }

    // If we have transaction IDs (either provided or list endpoint failed), fetch individually
    if (hasIds) {
      console.log('[RECONCILE] Fetching', transactionIds.length, 'transactions by ID');
      for (const txId of transactionIds) {
        const trimmedId = txId.trim();
        if (!trimmedId) continue;
        
        // Check if we already have this from period search
        const alreadyFetched = ativusTransactions.find(t => t.id_transaction === trimmedId);
        if (alreadyFetched) continue;
        
        const tx = await fetchSingleTransaction(trimmedId, apiKey);
        if (tx) {
          ativusTransactions.push(tx);
        }
      }
    }

    console.log('[RECONCILE] Total Ativus transactions to process:', ativusTransactions.length);

    if (ativusTransactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: listEndpointAvailable 
            ? 'Nenhuma transação encontrada na Ativus para o período especificado' 
            : 'Endpoint de listagem não disponível. Forneça os IDs das transações manualmente.',
          listEndpointAvailable,
          results: [],
          summary: { total: 0, imported: 0, already_exists: 0, skipped: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing transactions from our database for comparison
    const txIds = ativusTransactions.map(tx => tx.id_transaction).filter(Boolean);
    
    const { data: existingTxs } = await supabase
      .from('pix_transactions')
      .select('txid, id, status')
      .eq('user_id', targetUserId)
      .in('txid', txIds);

    const existingTxMap = new Map((existingTxs || []).map(tx => [tx.txid, tx]));

    const results: {
      transactionId: string;
      status: 'imported' | 'already_exists' | 'skipped' | 'error';
      message: string;
      data?: any;
    }[] = [];

    // Process each transaction
    for (const tx of ativusTransactions) {
      const txId = tx.id_transaction;
      if (!txId) {
        results.push({
          transactionId: 'unknown',
          status: 'skipped',
          message: 'ID de transação não encontrado'
        });
        continue;
      }

      // Check if already exists
      const existing = existingTxMap.get(txId);
      if (existing) {
        results.push({
          transactionId: txId,
          status: 'already_exists',
          message: `Já existe no sistema (status: ${existing.status})`,
          data: { id: existing.id, status: existing.status }
        });
        continue;
      }

      // Skip if amount is 0 or invalid
      if (!tx.valor || tx.valor <= 0) {
        results.push({
          transactionId: txId,
          status: 'skipped',
          message: 'Valor inválido ou zero'
        });
        continue;
      }

      const mappedStatus = mapAtivusStatus(tx.situacao);
      
      // Parse transaction date for Brazil timezone
      let txDate: Date;
      try {
        txDate = new Date(tx.data_transacao);
        if (isNaN(txDate.getTime())) {
          txDate = new Date();
        }
      } catch {
        txDate = new Date();
      }
      
      const brazilDate = txDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Insert into pix_transactions
      const { data: inserted, error: insertError } = await supabase
        .from('pix_transactions')
        .insert({
          user_id: targetUserId,
          txid: txId,
          amount: tx.valor,
          donor_name: tx.nome,
          donor_cpf: tx.cpf,
          donor_email: tx.email,
          status: mappedStatus,
          acquirer: 'ativus',
          fee_percentage: feePercentage,
          fee_fixed: feeFixed,
          created_at: txDate.toISOString(),
          created_date_brazil: brazilDate,
          paid_at: mappedStatus === 'paid' ? txDate.toISOString() : null,
          paid_date_brazil: mappedStatus === 'paid' ? brazilDate : null,
          product_name: 'Recuperado via Reconciliação',
          popup_model: 'reconciled'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[RECONCILE] Insert error for', txId, ':', insertError);
        results.push({
          transactionId: txId,
          status: 'error',
          message: insertError.message
        });
        continue;
      }

      results.push({
        transactionId: txId,
        status: 'imported',
        message: `Importado com sucesso (${mappedStatus})`,
        data: {
          id: inserted.id,
          amount: tx.valor,
          donor_name: tx.nome,
          status: mappedStatus
        }
      });
    }

    const summary = {
      total: results.length,
      imported: results.filter(r => r.status === 'imported').length,
      already_exists: results.filter(r => r.status === 'already_exists').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('[RECONCILE] Summary:', summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        listEndpointAvailable,
        results, 
        summary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RECONCILE] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
