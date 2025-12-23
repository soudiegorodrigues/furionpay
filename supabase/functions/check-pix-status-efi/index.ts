import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EFI Pay API URLs
const EFI_PRODUCTION_URL = 'https://pix.api.efipay.com.br';
const EFI_SANDBOX_URL = 'https://pix-h.api.efipay.com.br';

interface EfiCredentials {
  clientId: string;
  clientSecret: string;
  certificate: string;
  privateKey: string;
  pixKey: string;
  environment: 'production' | 'sandbox';
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get EFI credentials from admin_settings
async function getEfiCredentials(supabase: any, userId?: string): Promise<EfiCredentials | null> {
  const keys = ['efi_client_id', 'efi_client_secret', 'efi_certificate', 'efi_private_key', 'efi_pix_key', 'efi_environment'];
  
  // Try user-specific settings first
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', keys);
    
    if (!error && data && data.length > 0) {
      const settings: Record<string, string> = {};
      data.forEach((item: { key: string; value: string }) => {
        settings[item.key] = item.value;
      });
      
      if (settings.efi_client_id && settings.efi_client_secret && 
          settings.efi_certificate && settings.efi_private_key && settings.efi_pix_key) {
        return {
          clientId: settings.efi_client_id,
          clientSecret: settings.efi_client_secret,
          certificate: settings.efi_certificate,
          privateKey: settings.efi_private_key,
          pixKey: settings.efi_pix_key,
          environment: (settings.efi_environment as 'production' | 'sandbox') || 'production',
        };
      }
    }
  }
  
  // Try global settings
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('key, value')
    .is('user_id', null)
    .in('key', keys);
  
  if (!globalError && globalData && globalData.length > 0) {
    const settings: Record<string, string> = {};
    globalData.forEach((item: { key: string; value: string }) => {
      settings[item.key] = item.value;
    });
    
    if (settings.efi_client_id && settings.efi_client_secret && 
        settings.efi_certificate && settings.efi_private_key && settings.efi_pix_key) {
      return {
        clientId: settings.efi_client_id,
        clientSecret: settings.efi_client_secret,
        certificate: settings.efi_certificate,
        privateKey: settings.efi_private_key,
        pixKey: settings.efi_pix_key,
        environment: (settings.efi_environment as 'production' | 'sandbox') || 'production',
      };
    }
  }
  
  return null;
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

function createMtlsClient(credentials: EfiCredentials): Deno.HttpClient {
  const certPem = normalizePem(credentials.certificate);
  const keyPem = normalizePem(credentials.privateKey);

  return Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });
}

// Get cached EFI token from database
async function getCachedEfiToken(supabase: any): Promise<{ token: string; expiresAt: number } | null> {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'efi_token_cache')
      .is('user_id', null)
      .maybeSingle();
    
    if (error || !data?.value) {
      return null;
    }
    
    const cached = JSON.parse(data.value);
    return cached;
  } catch {
    return null;
  }
}

// Save EFI token to database cache
async function saveEfiTokenCache(supabase: any, token: string, expiresInSeconds: number): Promise<void> {
  try {
    const expiresAt = Date.now() + (expiresInSeconds * 1000);
    const cacheValue = JSON.stringify({ token, expiresAt });
    
    await supabase
      .from('admin_settings')
      .upsert({
        key: 'efi_token_cache',
        value: cacheValue,
        user_id: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key,user_id'
      });
  } catch (err) {
    console.log('[EFI-STATUS] Error saving token cache:', err);
  }
}

async function getAccessToken(supabase: any, client: Deno.HttpClient, credentials: EfiCredentials): Promise<string> {
  // Check for cached token first
  const cached = await getCachedEfiToken(supabase);
  if (cached && cached.token && cached.expiresAt > (Date.now() + 5 * 60 * 1000)) {
    console.log('[EFI-STATUS] Using cached token');
    return cached.token;
  }

  console.log('[EFI-STATUS] Obtendo novo token de acesso...');

  const baseUrl = credentials.environment === 'sandbox' ? EFI_SANDBOX_URL : EFI_PRODUCTION_URL;
  const tokenUrl = `${baseUrl}/oauth/token`;
  
  const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao obter token EFI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const expiresIn = data.expires_in || 3600;
  await saveEfiTokenCache(supabase, data.access_token, expiresIn);
  
  return data.access_token;
}

async function checkEfiStatus(
  txid: string, 
  credentials: EfiCredentials,
  client: Deno.HttpClient,
  accessToken: string,
  supabase: any
): Promise<{ isPaid: boolean; status: string; paidAt?: string }> {
  console.log('[EFI-STATUS] Verificando status, txid:', txid);

  const baseUrl = credentials.environment === 'sandbox' ? EFI_SANDBOX_URL : EFI_PRODUCTION_URL;
  const cobUrl = `${baseUrl}/v2/cob/${txid}`;

  try {
    const response = await fetch(cobUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      client,
    });

    const responseText = await response.text();
    console.log('[EFI-STATUS] Response:', response.status, responseText);

    if (!response.ok) {
      console.error('[EFI-STATUS] Status check failed:', response.status, responseText);
      return { isPaid: false, status: 'pending' };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[EFI-STATUS] Failed to parse response');
      return { isPaid: false, status: 'pending' };
    }

    // EFI status mapping:
    // ATIVA = generated/pending
    // CONCLUIDA = paid
    // REMOVIDA_PELO_USUARIO_RECEBEDOR = expired/cancelled
    const efiStatus = (data.status || '').toString().toUpperCase();
    console.log('[EFI-STATUS] EFI status:', efiStatus);

    let mappedStatus = 'pending';
    let isPaid = false;
    let paidAt: string | undefined;

    if (efiStatus === 'CONCLUIDA') {
      isPaid = true;
      mappedStatus = 'paid';
      paidAt = data.calendario?.criacao || new Date().toISOString();
      
      console.log('[EFI-STATUS] *** Transaction is PAID! Marking as paid in database ***');
      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
      if (error) {
        console.error('[EFI-STATUS] Erro ao marcar PIX como pago:', error);
      } else {
        console.log('[EFI-STATUS] PIX marcado como pago com sucesso');
      }
    } else if (efiStatus === 'ATIVA') {
      mappedStatus = 'generated';
    } else if (['REMOVIDA_PELO_USUARIO_RECEBEDOR', 'REMOVIDA_PELO_PSP', 'EXPIRADA'].includes(efiStatus)) {
      mappedStatus = 'expired';
    }

    return {
      isPaid,
      status: mappedStatus,
      paidAt,
    };
  } catch (error) {
    console.error('[EFI-STATUS] Error checking status:', error);
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

    console.log('[EFI-STATUS] Checking status for transaction:', transactionId);

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
      console.error('[EFI-STATUS] Transaction not found for:', transactionId);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[EFI-STATUS] Found transaction:', transaction.id, 'txid:', transaction.txid, 'status:', transaction.status);

    // If already paid, return immediately
    if (transaction.status === 'paid') {
      console.log('[EFI-STATUS] Transaction already marked as paid');
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

    // Get EFI credentials
    const effectiveUserId = userId || transaction.user_id;
    const credentials = await getEfiCredentials(supabase, effectiveUserId);
    
    if (!credentials) {
      console.error('[EFI-STATUS] No EFI credentials available');
      return new Response(
        JSON.stringify({ error: 'EFI credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create mTLS client and get token
    const mtlsClient = createMtlsClient(credentials);
    const accessToken = await getAccessToken(supabase, mtlsClient, credentials);

    const result = await checkEfiStatus(txid, credentials, mtlsClient, accessToken, supabase);

    return new Response(
      JSON.stringify({
        status: result.status,
        isPaid: result.isPaid,
        paid_at: result.paidAt || (result.isPaid ? new Date().toISOString() : undefined),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EFI-STATUS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
