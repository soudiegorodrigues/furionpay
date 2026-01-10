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

// Generate random CPF (valid format) - avoids invalid patterns like all same digits
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
  offerId?: string;
}

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

function generateTxId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 26; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get user fee config or default
async function getUserFeeConfig(supabase: any, userId?: string): Promise<FeeConfig | null> {
  // First try to get user-specific fee config
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
  
  // Fallback to default fee config
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

// ============= AUDIT LOG FUNCTION =============
async function logAudit(
  supabase: any,
  userId: string | undefined,
  txid: string,
  amount: number,
  acquirer: string,
  status: 'attempted' | 'success' | 'fallback_success' | 'failed',
  success: boolean,
  errorMessage?: string,
  errorCode?: string,
  retryCount: number = 0,
  fallbackUsed: boolean = false,
  requestPayload?: any,
  responsePayload?: any
) {
  try {
    await supabase.from('pix_generation_audit_logs').insert({
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      txid,
      amount,
      acquirer,
      status,
      success,
      error_message: errorMessage,
      error_code: errorCode,
      retry_count: retryCount,
      fallback_used: fallbackUsed,
      request_payload: requestPayload,
      response_payload: responsePayload,
      completed_at: success ? new Date().toISOString() : null,
    });
    console.log(`[ATIVUS] 📝 Audit log saved: status=${status}, success=${success}`);
  } catch (auditError) {
    console.error('[ATIVUS] ⚠️ Failed to save audit log:', auditError);
  }
}

// ============= FALLBACK INSERT FUNCTION =============
async function fallbackDirectInsert(
  supabase: any,
  amount: number,
  txid: string,
  pixCode: string,
  donorName: string,
  userId?: string,
  productName?: string,
  popupModel?: string,
  utmData?: Record<string, string>,
  feePercentage?: number,
  feeFixed?: number,
  acquirer: string = 'ativus',
  fingerprint?: string,
  clientIp?: string,
  donorEmail?: string,
  donorPhone?: string,
  donorCpf?: string,
  donorBirthdate?: string,
  donorAddress?: { cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; },
  orderBumps?: OrderBumpData[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log('[ATIVUS] 🔄 Attempting fallback direct insert...');
    
    const now = new Date();
    const brazilTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const createdDateBrazil = brazilTime.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('pix_transactions')
      .insert({
        amount,
        txid,
        pix_code: pixCode,
        donor_name: donorName,
        user_id: userId,
        product_name: productName,
        popup_model: popupModel,
        utm_data: utmData,
        fee_percentage: feePercentage,
        fee_fixed: feeFixed,
        acquirer,
        fingerprint_hash: fingerprint,
        client_ip: clientIp,
        donor_email: donorEmail,
        donor_phone: donorPhone,
        donor_cpf: donorCpf,
        donor_birthdate: donorBirthdate,
        donor_cep: donorAddress?.cep,
        donor_street: donorAddress?.street,
        donor_number: donorAddress?.number,
        donor_complement: donorAddress?.complement,
        donor_neighborhood: donorAddress?.neighborhood,
        donor_city: donorAddress?.city,
        donor_state: donorAddress?.state,
        order_bumps: orderBumps && orderBumps.length > 0 ? orderBumps : null,
        status: 'generated',
        created_date_brazil: createdDateBrazil,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[ATIVUS] ❌ Fallback insert failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[ATIVUS] ✅ Fallback insert succeeded, ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[ATIVUS] ❌ Fallback insert exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============= MAIN LOG FUNCTION WITH RETRY AND FALLBACK =============
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
  acquirer: string = 'ativus',
  fingerprint?: string,
  clientIp?: string,
  donorEmail?: string,
  donorPhone?: string,
  donorCpf?: string,
  donorBirthdate?: string,
  donorAddress?: { cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; },
  orderBumps?: OrderBumpData[],
  offerId?: string
) {
  const MAX_RETRIES = 3;
  let lastError: string | null = null;
  let retryCount = 0;

  // Log initial audit
  await logAudit(supabase, userId, txid, amount, acquirer, 'attempted', false);

  // Attempt RPC with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    retryCount = attempt;
    console.log(`[ATIVUS] 🔄 RPC attempt ${attempt}/${MAX_RETRIES}...`);
    
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
        p_order_bumps: orderBumps && orderBumps.length > 0 ? orderBumps : null,
      });

      if (error) {
        lastError = error.message;
        console.error(`[ATIVUS] ❌ RPC attempt ${attempt} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 500;
          console.log(`[ATIVUS] ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
        }
        continue;
      }
      
      console.log('[ATIVUS] ✅ PIX registrado com sucesso via RPC, ID:', data);
      await logAudit(supabase, userId, txid, amount, acquirer, 'success', true, undefined, undefined, retryCount);
      return { success: true, id: data };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[ATIVUS] ❌ RPC attempt ${attempt} exception:`, err);
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All RPC attempts failed - try fallback direct insert
  console.log('[ATIVUS] ⚠️ All RPC attempts failed. Trying fallback insert...');
  
  const fallbackResult = await fallbackDirectInsert(
    supabase, amount, txid, pixCode, donorName, userId, productName, popupModel,
    utmData, feePercentage, feeFixed, acquirer, fingerprint, clientIp,
    donorEmail, donorPhone, donorCpf, donorBirthdate, donorAddress, orderBumps
  );

  if (fallbackResult.success) {
    console.log('[ATIVUS] ✅ Fallback insert succeeded!');
    await logAudit(supabase, userId, txid, amount, acquirer, 'fallback_success', true, lastError || undefined, 'RPC_FAILED', retryCount, true);
    return { success: true, id: fallbackResult.id, fallbackUsed: true };
  }

  // Both RPC and fallback failed - log critical failure
  console.error('[ATIVUS] ❌❌ CRITICAL: Both RPC and fallback failed!');
  console.error('[ATIVUS] RPC error:', lastError);
  console.error('[ATIVUS] Fallback error:', fallbackResult.error);
  
  await logAudit(
    supabase, userId, txid, amount, acquirer, 'failed', false,
    `RPC: ${lastError || 'unknown'} | Fallback: ${fallbackResult.error}`,
    'BOTH_FAILED', retryCount, true
  );
  
  return { success: false, error: `RPC failed: ${lastError}. Fallback failed: ${fallbackResult.error}` };
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
    const { amount, donorName, donorEmail, donorPhone, donorCpf, donorBirthdate, donorAddress, userId, utmData, productName, popupModel, healthCheck, fingerprint, clientIp, orderBumps, offerId } = await req.json() as GeneratePixRequest;

    console.log('Gerando PIX Ativus Hub - Valor:', amount, 'Usuário:', userId, 'HealthCheck:', healthCheck, 'IP:', clientIp);
    console.log('Order Bumps recebidos:', orderBumps ? JSON.stringify(orderBumps) : 'nenhum');

    // Validate amount - must be at least R$ 0.50
    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
    
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log(`[ATIVUS] Invalid amount: ${amount} (parsed: ${parsedAmount})`);
      return new Response(
        JSON.stringify({ error: 'Valor inválido', message: 'O valor deve ser um número positivo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parsedAmount < 0.50) {
      console.log(`[ATIVUS] Amount too low: R$${parsedAmount}`);
      return new Response(
        JSON.stringify({ error: 'AMOUNT_TOO_LOW', message: 'Valor mínimo é R$ 0,50' }),
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
    
    // Generate a valid CPF with correct check digits
    const customerCPF = generateRandomCPF();
    console.log('Generated CPF:', customerCPF);
    const customerEmail = `cliente${Date.now()}@email.com`;
    const customerPhone = "(11) 99999-9999";

    // Build request payload according to Ativus Hub API spec
    // Note: 'ip' field is required according to documentation
    const payload = {
      amount: amount,
      id_seller: `seller_${userId || 'default'}`,
      ip: clientIp || "0.0.0.0", // Client IP - required field
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

    // Add 8-second timeout to prevent long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    let response: Response;
    try {
      response = await fetch(ATIVUS_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[ATIVUS] ⏱️ Request timeout after 8 seconds');
        throw new Error('Timeout: API Ativus não respondeu em 8 segundos');
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

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

    // Registrar transação (skip for health checks)
    console.log('Using donor name:', finalDonorName);
    
    let logged = true;
    let logError: string | null = null;
    
    if (!healthCheck) {
      const logResult = await logPixGenerated(
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
        'ativus',
        fingerprint,
        clientIp,
        donorEmail,
        donorPhone,
        donorCpf,
        donorBirthdate,
        donorAddress,
        orderBumps,
        offerId
      );
      
      if (!logResult.success) {
        logged = false;
        logError = logResult.error || 'Failed to log transaction';
        console.error('[ATIVUS] ⚠️ PIX gerado mas NÃO registrado no banco! txid:', transactionId);
      }
    } else {
      console.log('Health check mode - skipping transaction log');
    }

    // Utmify integration handled by database trigger (utmify-sync)
    return new Response(
      JSON.stringify({
        success: true,
        pixCode,
        qrCodeUrl,
        txid: transactionId,
        transactionId: transactionId,
        logged,
        logError: logError || undefined,
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
