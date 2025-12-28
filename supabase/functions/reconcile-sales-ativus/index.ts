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

async function getGlobalAtivusApiKey(supabase: any): Promise<string | null> {
  const { data: globalData } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (globalData?.value) return globalData.value;
  return Deno.env.get('ATIVUS_API_KEY') || null;
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
  
  return getGlobalAtivusApiKey(supabase);
}

function mapAtivusStatus(situacao: string): 'generated' | 'paid' | 'expired' {
  const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
  const expiredStatuses = ['EXPIRADO', 'EXPIRED', 'CANCELADO', 'REFUSED', 'CANCELLED'];
  
  if (paidStatuses.includes(situacao.toUpperCase())) return 'paid';
  if (expiredStatuses.includes(situacao.toUpperCase())) return 'expired';
  return 'generated';
}

// Extract user_id from id_seller field (format: "seller_uuid")
function extractUserIdFromSeller(idSeller: string | undefined | null): string | null {
  if (!idSeller) return null;
  
  // Format: seller_27a41ae8-35bc-4fb1-b57d-d7bee2856c0c
  if (idSeller.startsWith('seller_')) {
    const uuid = idSeller.replace('seller_', '');
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uuid)) {
      return uuid;
    }
  }
  
  return null;
}

// Extract user_id from metadata
function extractUserIdFromMetadata(metadata: any): string | null {
  if (!metadata) return null;
  
  // Try different possible field names
  const userId = metadata.user_id || metadata.userId || metadata.seller_id || metadata.sellerId;
  if (userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userId)) {
      return userId;
    }
  }
  
  return null;
}

async function fetchAtivusTransactionsByPeriod(
  apiKey: string, 
  startDate: string, 
  endDate: string
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  console.log('[RECONCILE] Fetching transactions from Ativus for period:', startDate, 'to', endDate);
  
  const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
  const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

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
        id_seller: tx.id_seller || null,
        metadata: tx.metadata || null,
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

  // Try first as id_transaction (Ativus format)
  const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${encodeURIComponent(transactionId)}`;
  
  try {
    console.log('[RECONCILE] Fetching transaction by id_transaction:', transactionId);
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[RECONCILE] Ativus response for', transactionId, ':', JSON.stringify(data).substring(0, 500));
      
      if (data.id_transaction && !data.erro && !data.error) {
        return {
          id_transaction: data.id_transaction || transactionId,
          nome: data.nome || data.customer_name || 'Não informado',
          valor: parseFloat(data.valor || data.amount || '0'),
          situacao: (data.situacao || data.status || 'AGUARDANDO_PAGAMENTO').toString().toUpperCase(),
          data_transacao: data.data_transacao || data.created_at || new Date().toISOString(),
          cpf: data.cpf || data.documento || null,
          email: data.email || null,
          id_seller: data.id_seller || null,
          metadata: data.metadata || null,
          externaRef: data.externaRef || data.externa_ref || data.external_ref || null,
        };
      }
    }
    
    // If not found by id_transaction, try as externaRef (TXID from FurionPay)
    console.log('[RECONCILE] Not found by id_transaction, trying as externaRef:', transactionId);
    const externaRefUrl = `${ATIVUS_STATUS_URL}?externaRef=${encodeURIComponent(transactionId)}`;
    
    const response2 = await fetch(externaRefUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    if (response2.ok) {
      const data = await response2.json();
      console.log('[RECONCILE] Ativus response by externaRef:', JSON.stringify(data).substring(0, 500));
      
      if (data.id_transaction && !data.erro && !data.error) {
        return {
          id_transaction: data.id_transaction,
          nome: data.nome || data.customer_name || 'Não informado',
          valor: parseFloat(data.valor || data.amount || '0'),
          situacao: (data.situacao || data.status || 'AGUARDANDO_PAGAMENTO').toString().toUpperCase(),
          data_transacao: data.data_transacao || data.created_at || new Date().toISOString(),
          cpf: data.cpf || data.documento || null,
          email: data.email || null,
          id_seller: data.id_seller || null,
          metadata: data.metadata || null,
          externaRef: data.externaRef || data.externa_ref || data.external_ref || transactionId,
        };
      }
    }
    
    console.log('[RECONCILE] Transaction not found:', transactionId);
    return null;
  } catch (error) {
    console.error('[RECONCILE] Error fetching transaction:', transactionId, error);
    return null;
  }
}

async function getUserInfo(supabase: any, userId: string): Promise<{ email: string; full_name: string | null } | null> {
  try {
    const { data } = await supabase.rpc('get_all_users_auth');
    const user = (data || []).find((u: any) => u.id === userId);
    if (user) {
      return { email: user.email, full_name: user.full_name };
    }
  } catch (error) {
    console.error('[RECONCILE] Error getting user info:', error);
  }
  return null;
}

async function getFeeConfig(supabase: any, userId: string): Promise<{ feePercentage: number; feeFixed: number }> {
  const { data: feeConfigData } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('user_id', userId)
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

  return { feePercentage, feeFixed };
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

    // Check if user is admin using has_role function
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, startDate, endDate, transactionIds, autoIdentify } = await req.json();

    // Either period or transactionIds must be provided
    const hasPeriod = startDate && endDate;
    const hasIds = transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0;

    if (!hasPeriod && !hasIds) {
      return new Response(
        JSON.stringify({ error: 'Either startDate/endDate or transactionIds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If autoIdentify is enabled, targetUserId is optional
    const shouldAutoIdentify = autoIdentify === true || !targetUserId;
    
    if (!targetUserId && !shouldAutoIdentify) {
      return new Response(
        JSON.stringify({ error: 'targetUserId is required when autoIdentify is false' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RECONCILE] Processing reconciliation');
    console.log('[RECONCILE] Target user:', targetUserId || 'AUTO-IDENTIFY');
    console.log('[RECONCILE] Auto-identify:', shouldAutoIdentify);
    console.log('[RECONCILE] Period:', startDate, 'to', endDate);
    console.log('[RECONCILE] Transaction IDs provided:', hasIds ? transactionIds.length : 0);

    // Get global Ativus API key for auto-identify mode
    const apiKey = shouldAutoIdentify 
      ? await getGlobalAtivusApiKey(supabase)
      : await getAtivusApiKey(supabase, targetUserId);
      
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ativus API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // If we have transaction IDs, fetch individually
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
        } else {
          // Add as not found so we can report it
          ativusTransactions.push({
            id_transaction: trimmedId,
            not_found: true
          });
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
          summary: { total: 0, imported: 0, already_exists: 0, skipped: 0, errors: 0, user_not_found: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: {
      transactionId: string;
      status: 'imported' | 'already_exists' | 'skipped' | 'error' | 'not_found' | 'user_not_found';
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

      // Handle not found transactions
      if (tx.not_found) {
        results.push({
          transactionId: txId,
          status: 'not_found',
          message: 'Transação não encontrada na Ativus'
        });
        continue;
      }

      // Determine the user_id for this transaction
      let resolvedUserId = targetUserId;
      let identifiedUserEmail: string | null = null;
      let identifiedUserName: string | null = null;

      if (shouldAutoIdentify) {
        // Try to extract user_id from id_seller or metadata
        const userIdFromSeller = extractUserIdFromSeller(tx.id_seller);
        const userIdFromMetadata = extractUserIdFromMetadata(tx.metadata);
        
        resolvedUserId = userIdFromSeller || userIdFromMetadata;
        
        console.log('[RECONCILE] Auto-identify for', txId);
        console.log('[RECONCILE] id_seller:', tx.id_seller, '-> userId:', userIdFromSeller);
        console.log('[RECONCILE] metadata:', JSON.stringify(tx.metadata), '-> userId:', userIdFromMetadata);
        console.log('[RECONCILE] Resolved userId:', resolvedUserId);

        if (!resolvedUserId) {
          results.push({
            transactionId: txId,
            status: 'user_not_found',
            message: 'Não foi possível identificar o usuário automaticamente. Verifique se a transação foi gerada pelo sistema.',
            data: {
              id_seller: tx.id_seller,
              metadata: tx.metadata
            }
          });
          continue;
        }

        // Get user info for display
        const userInfo = await getUserInfo(supabase, resolvedUserId);
        if (userInfo) {
          identifiedUserEmail = userInfo.email;
          identifiedUserName = userInfo.full_name;
        } else {
          results.push({
            transactionId: txId,
            status: 'user_not_found',
            message: `Usuário ${resolvedUserId} não existe no sistema`,
            data: { resolved_user_id: resolvedUserId }
          });
          continue;
        }
      }

      // Check if transaction already exists (by txid or externaRef)
      const { data: existingByTxid } = await supabase
        .from('pix_transactions')
        .select('id, status, user_id')
        .eq('txid', txId)
        .maybeSingle();

      if (existingByTxid) {
        results.push({
          transactionId: txId,
          status: 'already_exists',
          message: `Já existe no sistema (status: ${existingByTxid.status})`,
          data: { id: existingByTxid.id, status: existingByTxid.status }
        });
        continue;
      }

      // Also check by externaRef if available
      if (tx.externaRef) {
        const { data: existingByRef } = await supabase
          .from('pix_transactions')
          .select('id, status, user_id')
          .eq('txid', tx.externaRef)
          .maybeSingle();

        if (existingByRef) {
          results.push({
            transactionId: txId,
            status: 'already_exists',
            message: `Já existe no sistema pelo TXID (status: ${existingByRef.status})`,
            data: { id: existingByRef.id, status: existingByRef.status }
          });
          continue;
        }
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

      // Get fee config for the resolved user
      const { feePercentage, feeFixed } = await getFeeConfig(supabase, resolvedUserId);

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
          user_id: resolvedUserId,
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
        message: shouldAutoIdentify 
          ? `Importado para ${identifiedUserName || identifiedUserEmail} (${mappedStatus})`
          : `Importado com sucesso (${mappedStatus})`,
        data: {
          id: inserted.id,
          amount: tx.valor,
          donor_name: tx.nome,
          status: mappedStatus,
          matched_user_id: resolvedUserId,
          matched_user_email: identifiedUserEmail,
          matched_user_name: identifiedUserName
        }
      });
    }

    const summary = {
      total: results.length,
      imported: results.filter(r => r.status === 'imported').length,
      already_exists: results.filter(r => r.status === 'already_exists').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      not_found: results.filter(r => r.status === 'not_found').length,
      user_not_found: results.filter(r => r.status === 'user_not_found').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('[RECONCILE] Summary:', summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        listEndpointAvailable,
        autoIdentifyMode: shouldAutoIdentify,
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
