import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';
const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';
const ATIVUS_STATUS_URL = 'https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php';

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
    .maybeSingle();
  
  if (error || !data?.value) {
    return null;
  }
  
  return data.value;
}

async function getUserAcquirer(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'user_acquirer')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data?.value) {
    return 'spedpay';
  }
  
  return data.value;
}

// Detect acquirer by txid format
// Ativus: 26+ alphanumeric chars without hyphens (e.g., "409b79aefec44a99baf6700f95")
// SpedPay/Inter: UUID format with hyphens (e.g., "8172e8d2-8b97-4725-b735-2f4a20938b89")
function detectAcquirerByTxid(txid: string): string | null {
  if (!txid) return null;
  
  // UUID format (with hyphens) = SpedPay or Inter
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(txid)) {
    return null; // Can't determine between SpedPay and Inter by txid alone
  }
  
  // Ativus format: 26+ alphanumeric chars without hyphens
  const ativusPattern = /^[a-zA-Z0-9]{20,}$/;
  if (ativusPattern.test(txid) && !txid.includes('-')) {
    return 'ativus';
  }
  
  return null;
}

async function getAtivusApiKey(supabase: any, userId?: string): Promise<string | null> {
  // Try user-specific setting first
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'ativus_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      return data.value;
    }
  }
  
  // Try global setting
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    return globalData.value;
  }
  
  return null;
}

// Get cached Inter token from database
async function getCachedInterToken(supabase: any): Promise<{ token: string; expiresAt: number } | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'inter_token_cache')
    .is('user_id', null)
    .maybeSingle();
  
  if (error || !data?.value) {
    return null;
  }
  
  try {
    const cached = JSON.parse(data.value);
    if (cached.token && cached.expiresAt) {
      return cached;
    }
  } catch {
    return null;
  }
  
  return null;
}

// Save Inter token to database cache
async function saveInterTokenCache(supabase: any, token: string, expiresAt: number): Promise<void> {
  const cacheValue = JSON.stringify({ token, expiresAt });
  
  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      key: 'inter_token_cache',
      value: cacheValue,
      user_id: null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'key,user_id',
    });
  
  if (error) {
    console.error('Error saving token cache:', error);
  }
}

function normalizePem(pem: string): string {
  let normalized = pem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  const certMatch = normalized.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
  const privKeyMatch = normalized.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const rsaKeyMatch = normalized.match(/-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/);
  
  if (certMatch) {
    const base64Content = certMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN CERTIFICATE-----\n${wrappedContent}\n-----END CERTIFICATE-----`;
  }
  
  if (privKeyMatch) {
    const base64Content = privKeyMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN PRIVATE KEY-----\n${wrappedContent}\n-----END PRIVATE KEY-----`;
  }
  
  if (rsaKeyMatch) {
    const base64Content = rsaKeyMatch[1].replace(/\s/g, '');
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrappedContent}\n-----END RSA PRIVATE KEY-----`;
  }
  
  return normalized;
}

function createMtlsClient(): Deno.HttpClient | null {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    console.log('Inter certificates not configured');
    return null;
  }

  try {
    const certPem = normalizePem(certificate);
    const keyPem = normalizePem(privateKey);

    return Deno.createHttpClient({
      cert: certPem,
      key: keyPem,
    });
  } catch (err) {
    console.error('Error creating mTLS client:', err);
    return null;
  }
}

async function getInterAccessToken(client: Deno.HttpClient, supabase: any): Promise<string> {
  const now = Date.now();
  
  // Check database cache first (with 5 minute buffer)
  const cached = await getCachedInterToken(supabase);
  if (cached && cached.expiresAt > now + 300000) {
    console.log('Using cached Inter token from database');
    return cached.token;
  }

  const clientId = Deno.env.get('INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('INTER_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('Obtendo novo token de acesso do Banco Inter...');

  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'cob.read pix.read',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao obter token Inter:', response.status, errorText);
    throw new Error(`Erro ao obter token Inter: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Cache the token in database (Inter tokens typically last 3600 seconds)
  const expiresIn = data.expires_in || 3600;
  const expiresAt = now + (expiresIn * 1000);
  
  await saveInterTokenCache(supabase, data.access_token, expiresAt);
  
  console.log('Token Inter obtido e salvo no cache');
  return data.access_token;
}

async function checkInterStatus(
  txid: string, 
  supabase: any, 
  mtlsClient: Deno.HttpClient,
  accessToken: string
): Promise<{ isPaid: boolean; status: string }> {
  const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;

  const response = await fetch(cobUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    client: mtlsClient,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Inter API error for ${txid}:`, response.status, errorText);
    return { isPaid: false, status: 'error' };
  }

  const data = await response.json();
  const isPaid = data.status === 'CONCLUIDA';

  return {
    isPaid,
    status: data.status,
  };
}

async function checkAtivusStatus(
  idTransaction: string,
  apiKey: string
): Promise<{ isPaid: boolean; status: string }> {
  try {
    // Build auth header - check if API key is already Base64 encoded
    const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
    const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);

    const statusUrl = `${ATIVUS_STATUS_URL}?id_transaction=${idTransaction}`;
    
    console.log(`Checking Ativus status for id_transaction: ${idTransaction}`);

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Ativus API error for ${idTransaction}:`, response.status);
      return { isPaid: false, status: 'error' };
    }

    const data = await response.json();
    console.log(`Ativus status response for ${idTransaction}:`, data.situacao);

    // Map Ativus status to our internal status
    const situacao = (data.situacao || '').toUpperCase();
    const isPaid = ['CONCLUIDO', 'PAGO', 'CONCLUÍDA', 'PAID', 'APPROVED'].includes(situacao);

    return {
      isPaid,
      status: situacao,
    };
  } catch (err) {
    console.error(`Error checking Ativus status for ${idTransaction}:`, err);
    return { isPaid: false, status: 'error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get all pending transactions (limit to 100 per batch to avoid timeout)
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('pix_transactions')
      .select('id, txid, user_id, amount')
      .eq('status', 'generated')
      .not('txid', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
    
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

    // Cache user acquirers and API keys to avoid repeated queries
    const userAcquirers: Record<string, string> = {};
    const userApiKeys: Record<string, string | null> = {};
    const userAtivusKeys: Record<string, string | null> = {};
    const defaultApiKey = Deno.env.get('SPEDPAY_API_KEY') || null;

    // Setup Inter client once if needed
    let mtlsClient: Deno.HttpClient | null = null;
    let interAccessToken: string | null = null;

    let checkedCount = 0;
    let updatedCount = 0;
    const results: any[] = [];

    for (const transaction of pendingTransactions) {
      checkedCount++;
      
      // Determine acquirer for this transaction
      // First, try to detect by txid format (most reliable for Ativus)
      let acquirer = detectAcquirerByTxid(transaction.txid);
      
      // If not detected by txid, check user settings
      if (!acquirer && transaction.user_id) {
        if (!(transaction.user_id in userAcquirers)) {
          userAcquirers[transaction.user_id] = await getUserAcquirer(supabase, transaction.user_id);
        }
        acquirer = userAcquirers[transaction.user_id];
      }
      
      // Default to spedpay if still not determined
      if (!acquirer) {
        acquirer = 'spedpay';
      }

      try {
        if (acquirer === 'ativus') {
          // Check with Ativus Hub
          let ativusApiKey: string | null = null;
          
          if (transaction.user_id) {
            if (!(transaction.user_id in userAtivusKeys)) {
              userAtivusKeys[transaction.user_id] = await getAtivusApiKey(supabase, transaction.user_id);
            }
            ativusApiKey = userAtivusKeys[transaction.user_id];
          }
          
          if (!ativusApiKey) {
            ativusApiKey = await getAtivusApiKey(supabase);
          }
          
          if (!ativusApiKey) {
            console.log(`Skipping Ativus transaction ${transaction.id} - no API key available`);
            results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'no_ativus_key', acquirer: 'ativus' });
            continue;
          }

          const ativusResult = await checkAtivusStatus(transaction.txid, ativusApiKey);
          
          if (ativusResult.isPaid) {
            console.log(`Marking transaction ${transaction.txid} as paid (Ativus)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'ativus' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', ativus_status: ativusResult.status, acquirer: 'ativus' });
          }
        } else if (acquirer === 'inter') {
          // Check with Banco Inter
          if (!mtlsClient) {
            mtlsClient = createMtlsClient();
            if (!mtlsClient) {
              console.log(`Skipping Inter transaction ${transaction.id} - mTLS client not available`);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'skipped', reason: 'inter_not_configured' });
              continue;
            }
          }

          if (!interAccessToken) {
            try {
              interAccessToken = await getInterAccessToken(mtlsClient, supabase);
            } catch (tokenErr) {
              console.error('Error getting Inter token:', tokenErr);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'error', reason: 'inter_token_error' });
              continue;
            }
          }

          console.log(`Checking Inter status for txid: ${transaction.txid}`);
          const interResult = await checkInterStatus(transaction.txid, supabase, mtlsClient, interAccessToken);
          
          console.log(`Transaction ${transaction.txid} Inter status: ${interResult.status}`);

          if (interResult.isPaid) {
            console.log(`Marking transaction ${transaction.txid} as paid (Inter)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'inter' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', inter_status: interResult.status, acquirer: 'inter' });
          }
        } else {
          // Check with SpedPay
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
            console.log(`Marking transaction ${transaction.txid} as paid (SpedPay)`);
            
            const { error: updateError } = await supabase.rpc('mark_pix_paid', {
              p_txid: transaction.txid
            });

            if (updateError) {
              console.error(`Error updating transaction ${transaction.txid}:`, updateError);
              results.push({ id: transaction.id, txid: transaction.txid, status: 'update_error', reason: updateError.message });
            } else {
              updatedCount++;
              results.push({ id: transaction.id, txid: transaction.txid, status: 'updated_to_paid', amount: transaction.amount, acquirer: 'spedpay' });
            }
          } else {
            results.push({ id: transaction.id, txid: transaction.txid, status: 'still_pending', spedpay_status: spedpayStatus, acquirer: 'spedpay' });
          }
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

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