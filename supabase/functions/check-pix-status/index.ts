import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';
const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

// Token cache to avoid rate limiting
let cachedInterToken: { token: string; expiresAt: number } | null = null;

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
    return 'spedpay'; // Default to SpedPay
  }
  
  return data.value;
}

// Normalize PEM format for certificates
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

// Create mTLS client for Banco Inter
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

async function getInterAccessToken(client: Deno.HttpClient): Promise<string> {
  // Check if we have a valid cached token (with 60 second buffer)
  const now = Date.now();
  if (cachedInterToken && cachedInterToken.expiresAt > now + 60000) {
    console.log('Using cached Inter token');
    return cachedInterToken.token;
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
  
  // Cache the token (Inter tokens typically last 3600 seconds)
  const expiresIn = data.expires_in || 3600;
  cachedInterToken = {
    token: data.access_token,
    expiresAt: now + (expiresIn * 1000),
  };
  
  console.log('Token Inter obtido e cacheado com sucesso');
  return data.access_token;
}

async function checkInterStatus(txid: string, supabase: any): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('Verificando status no Banco Inter, txid:', txid);
  
  // Create mTLS client
  const mtlsClient = createMtlsClient();
  
  const accessToken = await getInterAccessToken(mtlsClient);
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
    
    // Get transaction from database - try by id first, then by txid
    let transaction = null;
    
    // Check if transactionId is a valid UUID (for id lookup)
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
    
    // If not found by id, try by txid
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

    // Determine which acquirer to use based on user settings
    let acquirer = 'spedpay';
    if (transaction.user_id) {
      acquirer = await getUserAcquirer(supabase, transaction.user_id);
    }

    console.log('Using acquirer:', acquirer);

    let result: { isPaid: boolean; status: string; paidAt?: string };

    if (acquirer === 'inter') {
      result = await checkInterStatus(txid, supabase);
    } else {
      // SpedPay
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
