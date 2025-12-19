import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SpedPay API URL
const SPEDPAY_API_URL = 'https://api.spedpay.space/v1/transactions';

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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  const randomNum = Math.floor(Math.random() * 1000);
  return `${cleanName}${randomNum}@email.com`;
}

// Generate random phone
function generateRandomPhone(): string {
  const ddd = Math.floor(Math.random() * 89) + 11;
  const part1 = Math.floor(Math.random() * 90000) + 10000;
  const part2 = Math.floor(Math.random() * 9000) + 1000;
  return `(${ddd}) 9${part1.toString().slice(0, 4)}-${part2}`;
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
  let result = 'SPD'; // Prefix for SpedPay
  for (let i = 0; i < 23; i++) {
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

// Get SpedPay API key from admin_settings or env vars
async function getSpedpayApiKey(supabase: any, userId?: string): Promise<string> {
  // Try to get from admin_settings for specific user
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'spedpay_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      console.log('Using SpedPay API key from admin_settings for user:', userId);
      return data.value;
    }
  }
  
  // Try global setting (user_id is NULL)
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'spedpay_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    console.log('Using SpedPay API key from global admin_settings');
    return globalData.value;
  }
  
  // Fall back to environment variable
  const envKey = Deno.env.get('SPEDPAY_API_KEY');
  if (envKey) {
    console.log('Using SpedPay API key from environment variable');
    return envKey;
  }
  
  throw new Error('Chave API da SpedPay não configurada');
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
  acquirer: string = 'spedpay'
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { amount, donorName, userId, utmData, productName, popupModel } = await req.json() as GeneratePixRequest;

    console.log('Gerando PIX SpedPay - Valor:', amount, 'Usuário:', userId);

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
    console.log('Fee config for transaction:', feeConfig);

    // Get SpedPay API key
    const apiKey = await getSpedpayApiKey(supabase, userId);

    // Gerar txid único
    const txid = generateTxId();

    // Get product name from checkout_offers if not provided
    const finalProductName = productName || await getProductNameFromOffer(supabase, userId, popupModel);
    
    // Use donor name without special characters to avoid API issues
    const rawDonorName = donorName || getRandomName();
    const finalDonorName = rawDonorName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '');
    
    console.log('Using donor name:', finalDonorName);
    
    // Generate customer data
    const customerCPF = generateRandomCPF();
    console.log('Generated CPF:', customerCPF);
    const customerEmail = generateRandomEmail(finalDonorName);
    const customerPhone = generateRandomPhone();

    // Build request payload according to SpedPay API spec (mesmo schema usado em generate-pix)
    const externalId = txid;
    const webhookUrl = `${supabaseUrl}/functions/v1/api-webhook-dispatch`;

    const customerData: Record<string, any> = {
      name: finalDonorName,
      email: customerEmail,
      phone: customerPhone.replace(/\D/g, ''),
      document_type: 'CPF',
      document: customerCPF,
    };

    // Mapear UTM para o payload no padrão aceito pela SpedPay
    if (utmData) {
      if (utmData.utm_source) customerData.utm_source = utmData.utm_source;
      if (utmData.utm_medium) customerData.utm_medium = utmData.utm_medium;
      if (utmData.utm_campaign) customerData.utm_campaign = utmData.utm_campaign;
      if (utmData.utm_content) customerData.utm_content = utmData.utm_content;
      if (utmData.utm_term) customerData.utm_term = utmData.utm_term;
    }

    const transactionData = {
      external_id: externalId,
      total_amount: amount,
      payment_method: 'PIX',
      webhook_url: webhookUrl,
      customer: customerData,
      items: [
        {
          id: `item_${externalId}`,
          title: finalProductName,
          description: finalProductName,
          price: amount,
          quantity: 1,
          is_physical: false,
        },
      ],
      ip: '127.0.0.1',
    };

    console.log('Criando cobrança PIX SpedPay:', JSON.stringify(transactionData));

    const response = await fetch(SPEDPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': apiKey.trim(),
      },
      body: JSON.stringify(transactionData),
    });

    const responseText = await response.text();
    const responseTime = Date.now() - startTime;
    console.log('Resposta SpedPay (raw):', responseText);

    if (!response.ok) {
      console.error('Erro ao criar cobrança SpedPay:', response.status, responseText);
      
      // Log failure event
      try {
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'spedpay',
          event_type: 'failure',
          error_message: `${response.status}: ${responseText.slice(0, 200)}`,
          response_time_ms: responseTime,
        });
      } catch (logError) {
        console.error('Error logging API failure event:', logError);
      }
      
      throw new Error(`Erro ao criar cobrança (SpedPay): ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e);
      throw new Error('Resposta inválida da API SpedPay');
    }

    console.log('Resposta SpedPay (parsed):', JSON.stringify(data));

    // Log pix object structure for debugging
    console.log('SpedPay pix object:', JSON.stringify(data.pix));

    // Extract PIX code from response - SpedPay uses various field names
    const pixCode = data.pix_copia_e_cola || 
                    data.pixCopiaECola || 
                    data.qrcode || 
                    data.qr_code ||
                    data.brcode ||
                    data.emv ||
                    data.code ||
                    data.pix?.brcode ||
                    data.pix?.qrcode ||
                    data.pix?.copia_e_cola ||
                    data.pix?.copiaECola ||
                    data.pix?.copy_paste ||
                    data.pix?.emv ||
                    data.pix?.code ||
                    data.pix?.qr_code ||
                    data.pix?.pix_code ||
                    data.pix?.pixCode ||
                    data.paymentCode ||
                    data.transaction?.pix_copia_e_cola ||
                    data.transaction?.brcode;
                    
    const qrCodeUrl = data.qrcode_url || 
                      data.qrcodeUrl || 
                      data.qr_code_url ||
                      data.pix?.qrcode_url ||
                      data.pix?.qrcodeUrl ||
                      data.pix?.qr_code_base64 ||
                      data.pix?.qrcodeBase64 ||
                      data.pix?.image ||
                      data.paymentCodeBase64 ||
                      null;
    
    // Use SpedPay transaction ID
    const spedpayTransactionId = data.id || data.transaction_id || data.id_transaction || data.idTransaction;
    const transactionId = spedpayTransactionId || txid;
    
    console.log('SpedPay transaction ID:', spedpayTransactionId);
    console.log('Local txid:', txid);
    console.log('Using transactionId for storage:', transactionId);

    if (!pixCode) {
      console.error('PIX code not found in response:', JSON.stringify(data));
      
      // Log failure event
      try {
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'spedpay',
          event_type: 'failure',
          error_message: 'PIX code not found in response. Fields: ' + Object.keys(data).join(', '),
          response_time_ms: responseTime,
        });
      } catch (logError) {
        console.error('Error logging API failure event:', logError);
      }
      
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
      'spedpay'
    );

    // Log success event
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'spedpay',
        event_type: 'success',
        response_time_ms: responseTime,
      });
    } catch (logError) {
      console.error('Error logging API success event:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pixCode,
        qrCodeUrl,
        txid: transactionId,
        transactionId: transactionId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na geração de PIX SpedPay:', error);
    
    // Log failure event
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'spedpay',
        event_type: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        response_time_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error('Error logging API failure:', logError);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
