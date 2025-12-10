import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

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

function createMtlsClient(): Deno.HttpClient {
  const certificate = Deno.env.get('INTER_CERTIFICATE');
  const privateKey = Deno.env.get('INTER_PRIVATE_KEY');

  if (!certificate || !privateKey) {
    throw new Error('Certificados mTLS do Banco Inter não configurados');
  }

  // Decode base64 if certificates are stored as base64
  const certPem = certificate.includes('-----BEGIN') 
    ? certificate 
    : atob(certificate);
  const keyPem = privateKey.includes('-----BEGIN') 
    ? privateKey 
    : atob(privateKey);

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

async function createPixCob(client: Deno.HttpClient, accessToken: string, amount: number, txid: string): Promise<any> {
  const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;
  
  const expirationSeconds = 3600; // 1 hora
  
  const payload = {
    calendario: {
      expiracao: expirationSeconds,
    },
    valor: {
      original: amount.toFixed(2),
    },
    chave: Deno.env.get('INTER_PIX_KEY') || '', // Chave PIX cadastrada no Inter
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

    const pixCode = cobData.pixCopiaECola || cobData.location;
    const qrCodeUrl = cobData.location ? `${INTER_API_URL}/pix/v2/loc/${cobData.loc?.id}/qrcode` : null;

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Registrar transação
    await logPixGenerated(
      supabase,
      amount,
      txid,
      pixCode,
      donorName || 'Anônimo',
      utmData,
      productName,
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
