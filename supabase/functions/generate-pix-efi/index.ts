import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EFI Pay API URLs
const EFI_PRODUCTION_URL = 'https://pix.api.efipay.com.br';
const EFI_SANDBOX_URL = 'https://pix-h.api.efipay.com.br';

// Random names for anonymous donations
const RANDOM_NAMES = [
  'João Pedro Silva', 'Carlos Eduardo Santos', 'Rafael Henrique Oliveira', 
  'Lucas Gabriel Costa', 'Fernando Augusto Souza', 'Marcos Vinicius Lima',
  'Bruno Felipe Alves', 'Gustavo Henrique Rocha', 'Diego Rodrigues Ferreira',
  'André Luis Gomes', 'Thiago Martins Barbosa', 'Ricardo Almeida Pereira',
  'Paulo Roberto Nascimento', 'Matheus Henrique Carvalho', 'Leonardo Silva Ribeiro',
  'Maria Eduarda Santos', 'Ana Carolina Oliveira', 'Juliana Cristina Costa',
  'Camila Fernanda Souza', 'Beatriz Helena Lima', 'Larissa Cristiane Alves',
  'Patricia Regina Rocha', 'Fernanda Aparecida Ferreira', 'Amanda Cristina Gomes',
  'Gabriela Santos Martins', 'Mariana Silva Barbosa', 'Carolina Almeida Pereira',
  'Isabela Nascimento Costa', 'Leticia Carvalho Ribeiro', 'Vanessa Lima Santos'
];

const getRandomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

interface OrderBumpData {
  id: string;
  title: string;
  price: number;
  productId?: string;
}

interface GeneratePixRequest {
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  donorCpf?: string;
  donorBirthdate?: string;
  donorAddress?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  userId?: string;
  utmData?: Record<string, string>;
  productName?: string;
  popupModel?: string;
  healthCheck?: boolean;
  fingerprint?: string;
  clientIp?: string;
  orderBumps?: OrderBumpData[];
}

interface EfiCredentials {
  clientId: string;
  clientSecret: string;
  certificate: string;
  privateKey: string;
  pixKey: string;
  environment: 'production' | 'sandbox';
}

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

function generateTxId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 35; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get user fee config or default
async function getUserFeeConfig(supabase: any, userId?: string): Promise<FeeConfig | null> {
  if (userId) {
    const { data: userSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'user_fee_config')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userSetting?.value) {
      const { data: feeConfig } = await supabase
        .from('fee_configs')
        .select('pix_percentage, pix_fixed')
        .eq('id', userSetting.value)
        .maybeSingle();
      
      if (feeConfig) {
        console.log('[EFI] Using user-specific fee config:', feeConfig);
        return feeConfig as FeeConfig;
      }
    }
  }
  
  const { data: defaultConfig } = await supabase
    .from('fee_configs')
    .select('pix_percentage, pix_fixed')
    .eq('is_default', true)
    .maybeSingle();
  
  if (defaultConfig) {
    console.log('[EFI] Using default fee config:', defaultConfig);
    return defaultConfig as FeeConfig;
  }
  
  return null;
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
        console.log('[EFI] Using credentials from admin_settings for user:', userId);
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
      console.log('[EFI] Using global credentials from admin_settings');
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
  
  console.log('[EFI] No credentials found');
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
  if (!credentials.certificate || !credentials.privateKey) {
    throw new Error('Certificados mTLS da EFI Pay não configurados');
  }

  console.log('[EFI] Certificate length:', credentials.certificate.length);
  console.log('[EFI] Private key length:', credentials.privateKey.length);

  const certPem = normalizePem(credentials.certificate);
  const keyPem = normalizePem(credentials.privateKey);

  console.log('[EFI] Normalized cert length:', certPem.length);
  console.log('[EFI] Normalized key length:', keyPem.length);

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
  } catch (err) {
    console.log('[EFI] Error reading token cache:', err);
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
    
    console.log('[EFI] Token cached successfully, expires at:', new Date(expiresAt).toISOString());
  } catch (err) {
    console.log('[EFI] Error saving token cache:', err);
  }
}

async function getAccessToken(supabase: any, client: Deno.HttpClient, credentials: EfiCredentials): Promise<string> {
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('Credenciais da EFI Pay não configuradas');
  }

  // Check for cached token first (with 5 minute buffer before expiry)
  const cached = await getCachedEfiToken(supabase);
  if (cached && cached.token && cached.expiresAt > (Date.now() + 5 * 60 * 1000)) {
    console.log('[EFI] Using cached token, expires at:', new Date(cached.expiresAt).toISOString());
    return cached.token;
  }

  console.log('[EFI] Obtendo novo token de acesso...');

  const baseUrl = credentials.environment === 'sandbox' ? EFI_SANDBOX_URL : EFI_PRODUCTION_URL;
  const tokenUrl = `${baseUrl}/oauth/token`;
  
  // EFI uses Basic auth for token request
  const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`);

  const body = JSON.stringify({
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body,
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[EFI] Erro ao obter token:', response.status, errorText);
    throw new Error(`Erro ao obter token EFI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[EFI] Novo token obtido com sucesso');
  
  // Cache the new token (EFI tokens typically last 3600 seconds)
  const expiresIn = data.expires_in || 3600;
  await saveEfiTokenCache(supabase, data.access_token, expiresIn);
  
  return data.access_token;
}

async function createPixCob(
  client: Deno.HttpClient, 
  accessToken: string, 
  amount: number, 
  pixKey: string,
  environment: 'production' | 'sandbox'
): Promise<{ txid: string; pixCopiaECola: string }> {
  const baseUrl = environment === 'sandbox' ? EFI_SANDBOX_URL : EFI_PRODUCTION_URL;
  const cobUrl = `${baseUrl}/v2/cob`;
  
  const expirationSeconds = 3600;
  
  const payload = {
    calendario: {
      expiracao: expirationSeconds,
    },
    valor: {
      original: amount.toFixed(2),
    },
    chave: pixKey,
  };

  console.log('[EFI] Criando cobrança PIX:', JSON.stringify(payload));

  const response = await fetch(cobUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[EFI] Erro ao criar cobrança:', response.status, errorText);
    throw new Error(`Erro ao criar cobrança EFI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[EFI] Cobrança criada com sucesso:', JSON.stringify(data));
  
  return {
    txid: data.txid,
    pixCopiaECola: data.pixCopiaECola,
  };
}

async function logPixGenerated(
  supabase: any,
  amount: number,
  txid: string,
  pixCode: string,
  donorName: string,
  utmData?: Record<string, string>,
  productName?: string,
  userId?: string,
  popupModel?: string,
  feePercentage?: number,
  feeFixed?: number,
  fingerprint?: string,
  clientIp?: string,
  donorEmail?: string,
  donorPhone?: string,
  donorCpf?: string,
  donorBirthdate?: string,
  donorAddress?: { cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; }
) {
  try {
    const { data, error } = await supabase.rpc('log_pix_generated_user', {
      p_amount: amount,
      p_txid: txid,
      p_pix_code: pixCode,
      p_donor_name: donorName,
      p_utm_data: utmData || null,
      p_product_name: productName || null,
      p_user_id: userId || null,
      p_popup_model: popupModel || null,
      p_fee_percentage: feePercentage ?? null,
      p_fee_fixed: feeFixed ?? null,
      p_acquirer: 'efi',
      p_fingerprint_hash: fingerprint || null,
      p_client_ip: clientIp || null,
      p_donor_email: donorEmail || null,
      p_donor_phone: donorPhone || null,
      p_donor_cpf: donorCpf || null,
      p_donor_birthdate: donorBirthdate || null,
      p_donor_cep: donorAddress?.cep || null,
      p_donor_street: donorAddress?.street || null,
      p_donor_number: donorAddress?.number || null,
      p_donor_complement: donorAddress?.complement || null,
      p_donor_neighborhood: donorAddress?.neighborhood || null,
      p_donor_city: donorAddress?.city || null,
      p_donor_state: donorAddress?.state || null,
    });

    if (error) {
      console.error('[EFI] Erro ao registrar PIX:', error);
    } else {
      console.log('[EFI] PIX registrado com sucesso, ID:', data);
    }
    return data;
  } catch (err) {
    console.error('[EFI] Exceção ao registrar PIX:', err);
    return null;
  }
}

async function getProductNameFromOffer(supabase: any, userId?: string, popupModel?: string): Promise<string> {
  const DEFAULT_PRODUCT_NAME = 'Anônimo';
  
  if (userId && popupModel) {
    const { data: offerData, error: offerError } = await supabase
      .from('checkout_offers')
      .select('product_name')
      .eq('user_id', userId)
      .eq('popup_model', popupModel)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!offerError && offerData?.product_name && offerData.product_name.trim() !== '') {
      console.log('[EFI] Using product name from checkout offer:', offerData.product_name);
      return offerData.product_name;
    }
  }
  
  if (userId) {
    const { data: anyOfferData, error: anyOfferError } = await supabase
      .from('checkout_offers')
      .select('product_name')
      .eq('user_id', userId)
      .not('product_name', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!anyOfferError && anyOfferData?.product_name && anyOfferData.product_name.trim() !== '') {
      console.log('[EFI] Using product name from user checkout offer (fallback):', anyOfferData.product_name);
      return anyOfferData.product_name;
    }
  }
  
  console.log('[EFI] Using default product name:', DEFAULT_PRODUCT_NAME);
  return DEFAULT_PRODUCT_NAME;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, donorName, donorEmail, donorPhone, donorCpf, donorBirthdate, donorAddress, userId, utmData, productName, popupModel, healthCheck, fingerprint, clientIp } = await req.json() as GeneratePixRequest;

    console.log('[EFI] Gerando PIX - Valor:', amount, 'Usuário:', userId, 'HealthCheck:', healthCheck, 'IP:', clientIp);

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user fee config
    const feeConfig = await getUserFeeConfig(supabase, userId);
    console.log('[EFI] Fee config for transaction:', feeConfig);

    // Get EFI credentials
    const credentials = await getEfiCredentials(supabase, userId);
    
    if (!credentials) {
      return new Response(
        JSON.stringify({ error: 'Credenciais da EFI Pay não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente mTLS
    const mtlsClient = createMtlsClient(credentials);

    // Obter token de acesso (com cache)
    const accessToken = await getAccessToken(supabase, mtlsClient, credentials);

    // Criar cobrança PIX
    const { txid, pixCopiaECola } = await createPixCob(
      mtlsClient, 
      accessToken, 
      amount, 
      credentials.pixKey,
      credentials.environment
    );

    // Get product name from checkout_offers if not provided
    const finalProductName = productName || await getProductNameFromOffer(supabase, userId, popupModel);

    // Registrar transação - usa nome aleatório se não fornecido (skip for health checks)
    const finalDonorName = donorName || getRandomName();
    console.log('[EFI] Using donor name:', finalDonorName);
    
    if (!healthCheck) {
      await logPixGenerated(
        supabase,
        amount,
        txid,
        pixCopiaECola,
        finalDonorName,
        utmData,
        finalProductName,
        userId,
        popupModel,
        feeConfig?.pix_percentage,
        feeConfig?.pix_fixed,
        fingerprint,
        clientIp,
        donorEmail,
        donorPhone,
        donorCpf,
        donorBirthdate,
        donorAddress
      );
    } else {
      console.log('[EFI] Health check mode - skipping transaction log');
    }

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: pixCopiaECola,
        qrCodeUrl: null,
        txid,
        transactionId: txid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EFI] Erro ao gerar PIX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
