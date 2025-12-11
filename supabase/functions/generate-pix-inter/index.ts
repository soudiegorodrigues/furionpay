import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

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

function normalizePem(pem: string): string {
  // Remove all whitespace and line breaks first
  let normalized = pem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  // Detect the type of PEM
  const certMatch = normalized.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
  const privKeyMatch = normalized.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const rsaKeyMatch = normalized.match(/-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/);
  
  if (certMatch) {
    // Extract base64 content, remove all whitespace, then wrap at 64 chars
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
  
  // If no match, return as-is
  return normalized;
}

function createMtlsClient(): Deno.HttpClient {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    throw new Error('Certificados mTLS do Banco Inter não configurados');
  }

  console.log('Certificate length:', certificate.length);
  console.log('Private key length:', privateKey.length);

  // Normalize PEM format
  const certPem = normalizePem(certificate);
  const keyPem = normalizePem(privateKey);

  console.log('Normalized cert length:', certPem.length);
  console.log('Normalized key length:', keyPem.length);
  console.log('Cert starts with BEGIN CERTIFICATE:', certPem.startsWith('-----BEGIN CERTIFICATE-----'));
  console.log('Key starts with BEGIN:', keyPem.startsWith('-----BEGIN'));

  // Log first and last 50 chars for debugging (without exposing full content)
  console.log('Cert first 60 chars:', certPem.substring(0, 60));
  console.log('Cert last 60 chars:', certPem.substring(certPem.length - 60));
  console.log('Key first 60 chars:', keyPem.substring(0, 60));
  console.log('Key last 60 chars:', keyPem.substring(keyPem.length - 60));

  return Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });
}

async function getAccessToken(client: Deno.HttpClient): Promise<string> {
  const clientId = Deno.env.get('INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('INTER_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('Obtendo token de acesso do Banco Inter...');

  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'cob.write cob.read cobv.write cobv.read pix.write pix.read webhook.read webhook.write payloadlocation.write payloadlocation.read',
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
    throw new Error(`Erro ao obter token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Token obtido com sucesso');
  return data.access_token;
}

// Sanitiza a chave PIX (remove pontuação de CNPJ/CPF)
function sanitizePixKey(key: string): string {
  // Remove todos os caracteres não-alfanuméricos exceto @ e +
  // CNPJ: 52.027.770/0001-21 -> 52027770000121
  // CPF: 123.456.789-00 -> 12345678900
  // Telefone e email permanecem inalterados
  if (key.includes('@') || key.startsWith('+')) {
    return key; // Email ou telefone, não modificar
  }
  return key.replace(/[.\-\/]/g, '');
}

async function createPixCob(client: Deno.HttpClient, accessToken: string, amount: number, txid: string): Promise<any> {
  const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;
  
  const expirationSeconds = 3600; // 1 hora
  
  const rawPixKey = Deno.env.get('INTER_PIX_KEY') || '';
  const pixKey = sanitizePixKey(rawPixKey);
  
  console.log('Chave PIX original:', rawPixKey);
  console.log('Chave PIX sanitizada:', pixKey);
  
  const payload = {
    calendario: {
      expiracao: expirationSeconds,
    },
    valor: {
      original: amount.toFixed(2),
    },
    chave: pixKey,
  };

  console.log('Criando cobrança PIX Inter:', JSON.stringify(payload));

  const response = await fetch(cobUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao criar cobrança Inter:', response.status, errorText);
    throw new Error(`Erro ao criar cobrança: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Cobrança criada com sucesso:', JSON.stringify(data));
  return data;
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
  
  // First try to get product_name from checkout_offers using userId + popup_model
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
  
  // Fallback: try to get any checkout offer from this user with product_name
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

    console.log('Gerando PIX Inter - Valor:', amount, 'Usuário:', userId);

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente mTLS
    const mtlsClient = createMtlsClient();

    // Obter token de acesso
    const accessToken = await getAccessToken(mtlsClient);

    // Gerar txid único
    const txid = generateTxId();

    // Criar cobrança PIX
    const cobData = await createPixCob(mtlsClient, accessToken, amount, txid);

    const pixCode = cobData.pixCopiaECola;
    // Banco Inter não retorna QR code acessível publicamente, geramos no cliente
    const qrCodeUrl = null;

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product name from checkout_offers if not provided
    const finalProductName = productName || await getProductNameFromOffer(supabase, userId, popupModel);

    // Registrar transação - usa nome aleatório se não fornecido
    const finalDonorName = donorName || getRandomName();
    console.log('Using donor name:', finalDonorName);
    
    await logPixGenerated(
      supabase,
      amount,
      txid,
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
        txid,
        transactionId: txid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na geração de PIX Inter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
