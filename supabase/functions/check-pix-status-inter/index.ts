import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

async function getAccessToken(): Promise<string> {
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
    scope: 'cob.read pix.read',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao obter token Inter:', response.status, errorText);
    throw new Error(`Erro ao obter token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function checkPixStatus(accessToken: string, txid: string): Promise<any> {
  const cobUrl = `${INTER_API_URL}/pix/v2/cob/${txid}`;

  console.log('Consultando status PIX Inter, txid:', txid);

  const response = await fetch(cobUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao consultar PIX Inter:', response.status, errorText);
    throw new Error(`Erro ao consultar PIX: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Status da cobrança:', JSON.stringify(data));
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { txid } = await req.json();

    if (!txid) {
      return new Response(
        JSON.stringify({ error: 'txid é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verificando status PIX Inter, txid:', txid);

    // Obter token de acesso
    const accessToken = await getAccessToken();

    // Consultar status da cobrança
    const cobData = await checkPixStatus(accessToken, txid);

    // Status possíveis: ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
    const isPaid = cobData.status === 'CONCLUIDA';
    const isExpired = cobData.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' || 
                      cobData.status === 'REMOVIDA_PELO_PSP';

    // Se foi pago, atualizar no banco
    if (isPaid) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase.rpc('mark_pix_paid', { p_txid: txid });
      
      if (error) {
        console.error('Erro ao marcar PIX como pago:', error);
      } else {
        console.log('PIX marcado como pago com sucesso');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: cobData.status,
        isPaid,
        isExpired,
        amount: cobData.valor?.original ? parseFloat(cobData.valor.original) : null,
        paidAt: cobData.pix?.[0]?.horario || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao verificar status PIX Inter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
