import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valorion create charge URL (from documentation)
const DEFAULT_VALORION_CREATE_URL = 'https://api-fila-cash-in-out.onrender.com/v2/pix/charge';

// Retry configuration for Render.com cold starts
const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 2000, // 2 seconds between retries
  retryOnStatus: [502, 503, 504, 408], // Gateway errors and timeouts
};

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

// Generate random CPF (valid format)
function generateRandomCPF(): string {
  let cpf: string;
  let isValid = false;
  
  while (!isValid) {
    cpf = '';
    for (let i = 0; i < 9; i++) {
      cpf += Math.floor(Math.random() * 10);
    }
    
    // Calculate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 >= 10) digit1 = 0;
    cpf += digit1;
    
    // Calculate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 >= 10) digit2 = 0;
    cpf += digit2;
    
    // Check if all digits are the same (invalid pattern)
    const allSame = cpf.split('').every(d => d === cpf[0]);
    isValid = !allSame;
  }
  
  return cpf!;
}

// Generate random email
function generateRandomEmail(name: string): string {
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[^\p{L}\s]/gu, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  const randomNum = Math.floor(Math.random() * 1000);
  return `${cleanName}${randomNum}@email.com`;
}

interface GeneratePixRequest {
  amount: number;
  donorName?: string;
  userId?: string;
  utmData?: Record<string, string>;
  productName?: string;
  popupModel?: string;
}

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

function generateTxId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'VLR'; // Prefix for Valorion
  for (let i = 0; i < 23; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Sleep utility for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        console.log('Using user-specific fee config:', feeConfig);
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
    console.log('Using default fee config:', defaultConfig);
    return defaultConfig as FeeConfig;
  }
  
  console.log('No fee config found');
  return null;
}

// Get Valorion API key from admin_settings or env vars
async function getValorionApiKey(supabase: any, userId?: string): Promise<string> {
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
  
  throw new Error('Chave API da Valorion não configurada');
}

// Get Valorion create endpoint URL (admin_settings: valorion_api_url) or default
async function getValorionApiUrl(supabase: any, userId?: string): Promise<string> {
  const normalize = (v?: string | null) => (v ?? '').trim();

  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'valorion_api_url')
      .maybeSingle();

    const url = normalize(!error ? data?.value : null);
    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('URL da API Valorion inválida (use URL completa com https://)');
      }
      console.log('Using Valorion API URL from admin_settings for user:', userId);
      return url;
    }
  }

  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'valorion_api_url')
    .maybeSingle();

  const globalUrl = normalize(!globalError ? globalData?.value : null);
  if (globalUrl) {
    if (!/^https?:\/\//i.test(globalUrl)) {
      throw new Error('URL da API Valorion inválida (use URL completa com https://)');
    }
    console.log('Using Valorion API URL from global admin_settings');
    return globalUrl;
  }

  const envUrl = normalize(Deno.env.get('VALORION_API_URL'));
  if (envUrl) {
    console.log('Using Valorion API URL from environment variable');
    return envUrl;
  }

  return DEFAULT_VALORION_CREATE_URL;
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
  acquirer: string = 'valorion'
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
      p_acquirer: acquirer,
    });

    if (error) {
      console.error('Erro ao registrar PIX:', error);
    } else {
      console.log('PIX registrado com sucesso, ID:', data);
    }
    return data;
  } catch (err) {
    console.error('Exceção ao registrar PIX:', err);
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
      console.log('Using product name from checkout offer:', offerData.product_name);
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
      console.log('Using product name from user checkout offer (fallback):', anyOfferData.product_name);
      return anyOfferData.product_name;
    }
  }
  
  console.log('Using default product name:', DEFAULT_PRODUCT_NAME);
  return DEFAULT_PRODUCT_NAME;
}

// Make API request with retry logic for Render.com cold starts
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt: number = 1
): Promise<{ response: Response; responseTime: number; attempts: number }> {
  const startTime = Date.now();
  
  console.log(`[VALORION] Attempt ${attempt}/${RETRY_CONFIG.maxAttempts} - Making request to: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    console.log(`[VALORION] Attempt ${attempt} - Response status: ${response.status}, Time: ${responseTime}ms`);
    
    // Check if we should retry (gateway errors typically indicate cold start)
    if (RETRY_CONFIG.retryOnStatus.includes(response.status) && attempt < RETRY_CONFIG.maxAttempts) {
      console.log(`[VALORION] Status ${response.status} is retryable. Waiting ${RETRY_CONFIG.delayMs}ms before retry...`);
      await sleep(RETRY_CONFIG.delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }
    
    return { response, responseTime, attempts: attempt };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[VALORION] Attempt ${attempt} - Network error:`, error);
    
    // Retry on network errors (connection refused, timeout, etc.)
    if (attempt < RETRY_CONFIG.maxAttempts) {
      console.log(`[VALORION] Network error. Waiting ${RETRY_CONFIG.delayMs}ms before retry...`);
      await sleep(RETRY_CONFIG.delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    const { amount, donorName, userId, utmData, productName, popupModel } = await req.json() as GeneratePixRequest;

    console.log('=== VALORION PIX GENERATION START ===');
    console.log(`[VALORION] Amount: R$${amount}, User: ${userId || 'anonymous'}`);

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
    console.log('[VALORION] Fee config:', feeConfig);

    // Get Valorion API key
    const apiKey = await getValorionApiKey(supabase, userId);
    console.log('[VALORION] API Key loaded:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT FOUND');

    // Get Valorion create endpoint URL
    const apiUrl = await getValorionApiUrl(supabase, userId);
    console.log('[VALORION] API URL:', apiUrl);

    // Gerar txid único
    const txid = generateTxId();
    console.log('[VALORION] Generated txid:', txid);

    // Get product name from checkout_offers if not provided
    const finalProductName = productName || await getProductNameFromOffer(supabase, userId, popupModel);
    
    // Use donor name without special characters to avoid API issues
    const rawDonorName = donorName || getRandomName();
    const finalDonorName = rawDonorName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '');
    
    console.log('[VALORION] Donor name:', finalDonorName);
    console.log('[VALORION] Product name:', finalProductName);
    
    // Generate customer data
    const customerCPF = generateRandomCPF();
    const customerEmail = generateRandomEmail(finalDonorName);
    const randomPhone = `119${Math.floor(10000000 + Math.random() * 90000000)}`;

    console.log('[VALORION] Customer CPF:', customerCPF);
    console.log('[VALORION] Customer Email:', customerEmail);

    // Build request payload according to Valorion API spec
    const payload = {
      amount: amount,
      customer: {
        name: finalDonorName,
        email: customerEmail,
        cpf: customerCPF,
        phone: randomPhone
      },
      items: [{
        title: finalProductName,
        quantity: 1,
        unitPrice: amount,
        tangible: false
      }],
      postbackUrl: `${supabaseUrl}/functions/v1/valorion-webhook`,
      ip: "177.38.123.45",
      metadata: txid,
      traceable: true
    };

    console.log('[VALORION] Request payload:', JSON.stringify(payload, null, 2));

    // Make request with retry logic
    const { response, responseTime, attempts } = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[VALORION] Final response after ${attempts} attempt(s) in ${responseTime}ms`);

    // Log response headers for debugging
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('[VALORION] Response headers:', JSON.stringify(responseHeaders));

    const responseText = await response.text();
    console.log('[VALORION] Response body (raw):', responseText.slice(0, 1000));

    if (!response.ok) {
      const preview = (responseText || '').slice(0, 600);
      const isHtml = /<!doctype|<html/i.test(preview);
      
      let hint = '';
      if (response.status === 404 && isHtml) {
        hint = ' Endpoint não encontrado (provável URL incorreta). Configure a URL do endpoint de criação no painel (Valorion → Config).';
      } else if (response.status === 502 || response.status === 503) {
        hint = ` Serviço temporariamente indisponível após ${attempts} tentativa(s). O servidor Render.com pode estar em cold start prolongado.`;
      }

      console.error(`[VALORION] API Error: ${response.status} after ${attempts} attempts. Body: ${preview}`);
      throw new Error(`Erro ao criar cobrança (Valorion): ${response.status}. URL: ${apiUrl}.${hint}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[VALORION] JSON parse error:', e);
      throw new Error('Resposta inválida da API Valorion');
    }

    console.log('[VALORION] Response parsed successfully:', JSON.stringify(data, null, 2));

    // Extract PIX code from response
    const pixCode = data.pix_copia_e_cola || 
                    data.pixCopiaECola || 
                    data.paymentCode ||
                    data.qrcode || 
                    data.qr_code ||
                    data.brcode ||
                    data.pix?.brcode ||
                    data.pix?.qrcode ||
                    data.transaction?.pix_copia_e_cola;
                    
    const qrCodeUrl = data.qrcode_url || 
                      data.qrcodeUrl || 
                      data.qr_code_url ||
                      data.pix?.qrcode_url ||
                      data.paymentCodeBase64 ||
                      null;
    
    const valorionTransactionId = data.id_transaction || data.idTransaction || data.id || data.transaction_id;
    const transactionId = valorionTransactionId || txid;
    
    console.log('[VALORION] Extracted values:');
    console.log('  - PIX code found:', !!pixCode);
    console.log('  - QR code URL found:', !!qrCodeUrl);
    console.log('  - Valorion transaction ID:', valorionTransactionId);
    console.log('  - Final transaction ID:', transactionId);

    if (!pixCode) {
      console.error('[VALORION] PIX code not found. Available fields:', Object.keys(data).join(', '));
      throw new Error('Código PIX não encontrado na resposta. Campos retornados: ' + Object.keys(data).join(', '));
    }

    // Registrar transação
    await logPixGenerated(
      supabase,
      amount,
      transactionId,
      pixCode,
      finalDonorName,
      utmData,
      finalProductName,
      userId,
      popupModel,
      feeConfig?.pix_percentage,
      feeConfig?.pix_fixed,
      'valorion'
    );

    const totalTime = Date.now() - requestStartTime;

    // Log API monitoring event with retry info
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'success',
        response_time_ms: totalTime,
        retry_attempt: attempts,
      });
    } catch (logError) {
      console.error('[VALORION] Error logging API event:', logError);
    }

    console.log(`=== VALORION PIX GENERATION SUCCESS (${totalTime}ms, ${attempts} attempt(s)) ===`);

    return new Response(
      JSON.stringify({
        success: true,
        pixCode,
        qrCodeUrl,
        txid: transactionId,
        transactionId: transactionId,
        _debug: {
          attempts,
          responseTime: totalTime,
          apiUrl,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`=== VALORION PIX GENERATION FAILED (${totalTime}ms) ===`);
    console.error('[VALORION] Error:', error);
    
    // Log failure event
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        response_time_ms: totalTime,
      });
    } catch (logError) {
      console.error('[VALORION] Error logging failure event:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao gerar PIX Valorion',
        _debug: {
          totalTime,
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
