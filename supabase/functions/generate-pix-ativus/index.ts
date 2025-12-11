import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Correct Ativus Hub API URL
const ATIVUS_API_URL = 'https://api.ativushub.com.br/v1/gateway/api/';

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
  const randomDigits = () => Math.floor(Math.random() * 10);
  let cpf = '';
  for (let i = 0; i < 9; i++) {
    cpf += randomDigits();
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
  
  return cpf;
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

function generateTxId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 26; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get Ativus API key from admin_settings or env vars
async function getAtivusApiKey(supabase: any, userId?: string): Promise<string> {
  // Try to get from admin_settings for specific user
  if (userId) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'ativus_api_key')
      .maybeSingle();
    
    if (!error && data?.value) {
      console.log('Using Ativus API key from admin_settings for user:', userId);
      return data.value;
    }
  }
  
  // Try global setting (user_id is NULL)
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .is('user_id', null)
    .eq('key', 'ativus_api_key')
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    console.log('Using Ativus API key from global admin_settings');
    return globalData.value;
  }
  
  // Fall back to environment variable
  const envKey = Deno.env.get('ATIVUS_API_KEY');
  if (envKey) {
    console.log('Using Ativus API key from environment variable');
    return envKey;
  }
  
  throw new Error('Chave API do Ativus Hub não configurada');
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
  popupModel?: string
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

  try {
    const { amount, donorName, userId, utmData, productName, popupModel } = await req.json() as GeneratePixRequest;

    console.log('Gerando PIX Ativus Hub - Valor:', amount, 'Usuário:', userId);

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

    // Get Ativus API key
    const apiKey = await getAtivusApiKey(supabase, userId);

    // Gerar txid único
    const txid = generateTxId();

    // Get product name from checkout_offers if not provided
    const finalProductName = productName || await getProductNameFromOffer(supabase, userId, popupModel);
    // Use donor name without special characters to avoid API issues
    const rawDonorName = donorName || getRandomName();
    // Remove accents and special characters from name
    const finalDonorName = rawDonorName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '');
    
    console.log('Using donor name:', finalDonorName);
    
    const customerCPF = generateRandomCPF();
    const customerEmail = generateRandomEmail(finalDonorName);
    const customerPhone = generateRandomPhone();

    // Build request payload according to Ativus Hub API spec
    // Note: 'ip' field is required according to documentation
    const payload = {
      amount: amount,
      id_seller: `seller_${userId || 'default'}`,
      ip: "177.38.123.45", // Client IP - required field
      customer: {
        name: finalDonorName,
        email: customerEmail,
        cpf: customerCPF,
        phone: customerPhone,
        externaRef: txid,
        address: {
          street: "Rua Exemplo",
          streetNumber: "100",
          complement: "N/A",
          zipCode: "01001000",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          country: "br"
        }
      },
      checkout: {
        utm_source: utmData?.utm_source || '',
        utm_medium: utmData?.utm_medium || '',
        utm_campaign: utmData?.utm_campaign || '',
        utm_term: utmData?.utm_term || '',
        utm_content: utmData?.utm_content || ''
      },
      pix: {
        expiresInDays: 1
      },
      items: [
        {
          title: finalProductName,
          quantity: 1,
          unitPrice: amount,
          tangible: false
        }
      ],
      postbackUrl: `${supabaseUrl}/functions/v1/ativus-webhook`,
      metadata: JSON.stringify({ popup_model: popupModel, user_id: userId }),
      traceable: true
    };

    console.log('Criando cobrança PIX Ativus:', JSON.stringify(payload));

    // Check if API key is already Base64 encoded or needs encoding
    // If key contains only valid base64 chars and is long enough, assume it's already encoded
    const isAlreadyBase64 = /^[A-Za-z0-9+/]+=*$/.test(apiKey) && apiKey.length > 50;
    const authHeader = isAlreadyBase64 ? apiKey : btoa(apiKey);
    
    console.log('Auth type:', isAlreadyBase64 ? 'Key already Base64' : 'Key encoded to Base64');

    const response = await fetch(ATIVUS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Resposta Ativus (raw):', responseText);

    if (!response.ok) {
      console.error('Erro ao criar cobrança Ativus:', response.status, responseText);
      throw new Error(`Erro ao criar cobrança: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e);
      throw new Error('Resposta inválida da API Ativus');
    }

    console.log('Resposta Ativus (parsed):', JSON.stringify(data));

    // Extract PIX code from response - Ativus Hub uses paymentCode
    const pixCode = data.paymentCode || 
                    data.pix_copia_e_cola || 
                    data.pixCopiaECola || 
                    data.codigo_pix || 
                    data.qrcode || 
                    data.qr_code ||
                    data.brcode ||
                    data.pix?.brcode ||
                    data.pix?.qrcode ||
                    data.transaction?.pix_copia_e_cola ||
                    data.transaction?.brcode;
                    
    const qrCodeUrl = data.paymentCodeBase64 ||
                      data.qrcode_url || 
                      data.qrcodeUrl || 
                      data.qr_code_url ||
                      data.pix?.qrcode_url ||
                      data.transaction?.qrcode_url ||
                      null;
                      
    const transactionId = data.idTransaction || data.id || data.transaction_id || data.id_transaction || txid;

    if (!pixCode) {
      console.error('PIX code not found in response:', JSON.stringify(data));
      throw new Error('Código PIX não encontrado na resposta. Campos retornados: ' + Object.keys(data).join(', '));
    }

    // Registrar transação
    console.log('Using donor name:', finalDonorName);
    
    await logPixGenerated(
      supabase,
      amount,
      transactionId,
      pixCode,
      finalDonorName,
      utmData,
      finalProductName,
      userId,
      popupModel
    );

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
    console.error('Erro na geração de PIX Ativus:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
