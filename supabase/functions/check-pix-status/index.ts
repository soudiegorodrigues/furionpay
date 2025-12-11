import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';
const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

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

async function getUserAcquirer(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'user_acquirer')
    .eq('user_id', userId)
    .single();
  
  if (error || !data?.value) {
    return 'spedpay';
  }
  
  return data.value || 'spedpay';
}

async function getAtivusApiKey(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'ativus_api_key')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data?.value) {
    // Try global setting
    const { data: globalData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ativus_api_key')
      .is('user_id', null)
      .maybeSingle();
    return globalData?.value || null;
  }
  
  return data.value;
}

// Get Inter credentials from admin_settings or fall back to env vars
async function getInterCredentialsFromDb(supabase: any, userId?: string): Promise<{
  clientId: string;
  clientSecret: string;
  certificate: string;
  privateKey: string;
  pixKey: string;
} | null> {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', ['inter_client_id', 'inter_client_secret', 'inter_certificate', 'inter_private_key', 'inter_pix_key']);
  
  if (error || !data || data.length === 0) return null;
  
  const settings: Record<string, string> = {};
  data.forEach((item: { key: string; value: string }) => {
    settings[item.key] = item.value;
  });
  
  if (settings.inter_client_id && settings.inter_client_secret && 
      settings.inter_certificate && settings.inter_private_key && settings.inter_pix_key) {
    return {
      clientId: settings.inter_client_id,
      clientSecret: settings.inter_client_secret,
      certificate: settings.inter_certificate,
      privateKey: settings.inter_private_key,
      pixKey: settings.inter_pix_key,
    };
  }
  
  return null;
}

// Get cached Inter token from database (check any recent valid token)
async function getCachedInterToken(supabase: any): Promise<{ token: string; expiresAt: number } | null> {
  // Get all inter_token_cache entries and find the most recent valid one
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value, updated_at')
    .eq('key', 'inter_token_cache')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  const now = Date.now();
  
  for (const item of data) {
    try {
      const cached = JSON.parse(item.value);
      // Check if token is still valid with 5 minute buffer
      if (cached.token && cached.expiresAt && cached.expiresAt > now + 300000) {
        console.log('Found valid cached token, expires in', Math.round((cached.expiresAt - now) / 1000), 'seconds');
        return cached;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

// Save Inter token to database cache
async function saveInterTokenCache(supabase: any, token: string, expiresAt: number): Promise<void> {
  const cacheValue = JSON.stringify({ token, expiresAt });
  
  // Insert new token cache entry (use insert to avoid conflicts)
  const { error } = await supabase
    .from('admin_settings')
    .insert({
      key: 'inter_token_cache',
      value: cacheValue,
      user_id: null,
      updated_at: new Date().toISOString(),
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

function createMtlsClient(): Deno.HttpClient {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    throw new Error('Certificados mTLS do Banco Inter não configurados');
  }

  const certPem = normalizePem(certificate);
  const keyPem = normalizePem(privateKey);

  return Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });
}

async function getInterAccessToken(client: Deno.HttpClient, supabase: any): Promise<string> {
  const now = Date.now();
  
  // Check database cache first
  const cached = await getCachedInterToken(supabase);
  if (cached) {
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
    
    // If rate limited, try to use any cached token even if expired
    if (response.status === 429) {
      console.log('Rate limited, checking for any cached token...');
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'inter_token_cache')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed.token) {
            console.log('Using potentially expired cached token due to rate limit');
            return parsed.token;
          }
        } catch {}
      }
    }
    
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

async function checkInterStatus(txid: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Banco Inter, txid:', txid);
  
  const mtlsClient = createMtlsClient();
  const accessToken = await getInterAccessToken(mtlsClient, supabase);
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
    console.error('Erro ao consultar PIX Inter:', response.status, errorText);
    return { isPaid: false, status: 'error' };
  }

  const data = await response.json();
  console.log('Status Inter:', data.status);

  const isPaid = data.status === 'CONCLUIDA';
  
  if (isPaid) {
    const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
    if (error) {
      console.error('Erro ao marcar PIX como pago:', error);
    } else {
      console.log('PIX marcado como pago com sucesso');
    }
  }

  return {
    isPaid,
    status: isPaid ? 'paid' : data.status,
    paidAt: data.pix?.[0]?.horario || undefined,
  };
}

async function checkSpedPayStatus(txid: string, apiKey: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no SpedPay, txid:', txid);

  const response = await fetch(`${SPEDPAY_API_URL}/v1/transactions/${txid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'api-secret': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('SpedPay API error:', response.status, errorText);
    return { isPaid: false, status: 'error' };
  }

  const data = await response.json();
  const spedpayStatus = data.status?.toLowerCase() || '';
  const isPaid = ['paid', 'authorized', 'approved', 'completed', 'confirmed'].includes(spedpayStatus);

  if (isPaid) {
    const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
    if (error) {
      console.error('Erro ao marcar PIX como pago:', error);
    } else {
      console.log('PIX marcado como pago com sucesso');
    }
  }

  return {
    isPaid,
    status: isPaid ? 'paid' : spedpayStatus,
  };
}

async function checkAtivusStatus(txid: string, apiKey: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Ativus Hub, txid:', txid);

  const apiKeyBase64 = btoa(apiKey);
  const statusUrl = `https://api.ativushub.com.br/v1/gateway/api/transaction/${txid}`;

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${apiKeyBase64}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ativus API error:', response.status, errorText);
    return { isPaid: false, status: 'error' };
  }

  const data = await response.json();
  const ativusStatus = (data.status || data.status_transaction || '').toString().toLowerCase();
  
  const paidStatuses = ['paid', 'pago', 'approved', 'aprovado', 'completed', 'concluida'];
  const isPaid = paidStatuses.some(s => ativusStatus.includes(s));

  if (isPaid) {
    const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
    if (error) {
      console.error('Erro ao marcar PIX como pago:', error);
    } else {
      console.log('PIX marcado como pago com sucesso');
    }
  }

  return {
    isPaid,
    status: isPaid ? 'paid' : ativusStatus || 'pending',
  };
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
    
    let transaction = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(transactionId);
    
    if (isUuid) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      transaction = result.data;
    }
    
    if (!transaction) {
      const result = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('txid', transactionId)
        .single();
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

    let acquirer = 'spedpay';
    if (transaction.user_id) {
      acquirer = await getUserAcquirer(supabase, transaction.user_id);
    }

    console.log('Using acquirer:', acquirer);

    let result: { isPaid: boolean; status: string; paidAt?: string };

    if (acquirer === 'inter') {
      result = await checkInterStatus(txid, supabase);
    } else if (acquirer === 'ativus') {
      let apiKey: string | null = null;
      if (transaction.user_id) {
        apiKey = await getAtivusApiKey(supabase, transaction.user_id);
      }
      if (!apiKey) {
        console.error('No Ativus API key available');
        return new Response(
          JSON.stringify({ error: 'Ativus API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = await checkAtivusStatus(txid, apiKey, supabase);
    } else {
      let apiKey: string | null = null;
      if (transaction.user_id) {
        apiKey = await getApiKeyForUser(supabase, transaction.user_id);
      }
      if (!apiKey) {
        apiKey = Deno.env.get('SPEDPAY_API_KEY') || null;
      }
      
      if (!apiKey) {
        console.error('No SpedPay API key available');
        return new Response(
          JSON.stringify({ error: 'API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = await checkSpedPayStatus(txid, apiKey, supabase);
    }

    return new Response(
      JSON.stringify({
        status: result.status,
        isPaid: result.isPaid,
        paid_at: result.paidAt || (result.isPaid ? new Date().toISOString() : undefined),
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
