import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UTMIFY_API_URL = 'https://api.utmify.com.br/api-credentials/orders';

interface UtmifyOrder {
  orderId: string;
  platform: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  approvedDate: string | null;
  refundedAt: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
    country: string;
  };
  products: Array<{
    id: string;
    name: string;
    planId: string;
    planName: string;
    quantity: number;
    priceInCents: number;
  }>;
  trackingParameters: {
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  commission: {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
  };
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUtmifyApiToken(supabase: any, userId?: string): Promise<string | null> {
  if (!userId) {
    console.log('[TRACK-IC] No userId provided, cannot get token');
    return null;
  }
  
  const { data: userToken } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_api_token')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (userToken?.value) {
    console.log('[TRACK-IC] Using user-specific API token for user:', userId);
    return userToken.value;
  }
  
  console.log('[TRACK-IC] No API token configured for user:', userId);
  return null;
}

async function isUtmifyEnabled(supabase: any, userId?: string): Promise<boolean> {
  if (!userId) {
    console.log('[TRACK-IC] No userId provided, Utmify disabled');
    return false;
  }
  
  const { data: userEnabled } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  
  const enabled = userEnabled?.value === 'true';
  console.log('[TRACK-IC] Utmify enabled for user', userId, ':', enabled);
  return enabled;
}

function generateRandomDocument(): string {
  const generateDigits = () => {
    let digits = '';
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    return digits;
  };
  
  const digits = generateDigits();
  if (new Set(digits).size === 1) {
    return generateRandomDocument();
  }
  
  return digits + Math.floor(Math.random() * 100).toString().padStart(2, '0');
}

function generateRandomPhone(): string {
  const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '62'];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const number = Math.floor(Math.random() * 900000000) + 100000000;
  return `${ddd}9${number.toString().slice(0, 8)}`;
}

function generateRandomEmail(): string {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const randomNum = Math.floor(Math.random() * 99999) + 1;
  return `visitor${randomNum}@${domain}`;
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           TRACK-INITIATE-CHECKOUT - UTMIFY SYNC              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('[TRACK-IC] 🕐 Timestamp:', new Date().toISOString());
  console.log('[TRACK-IC] 🆔 Request ID:', requestId);

  try {
    const payload = await req.json();
    
    const {
      userId,
      offerId,
      productName,
      value,
      utmParams,
      popupModel,
    } = payload;

    console.log('');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC] 📋 DADOS RECEBIDOS:');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC]   User ID:', userId);
    console.log('[TRACK-IC]   Offer ID:', offerId);
    console.log('[TRACK-IC]   Product Name:', productName);
    console.log('[TRACK-IC]   Value:', value);
    console.log('[TRACK-IC]   Popup Model:', popupModel);
    console.log('[TRACK-IC]   UTM Params:', JSON.stringify(utmParams));

    if (!userId) {
      console.log('[TRACK-IC] ❌ ERRO: userId é obrigatório');
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Check if Utmify is enabled
    console.log('');
    console.log('[TRACK-IC] 🔍 VERIFICANDO CONFIGURAÇÃO...');
    const enabled = await isUtmifyEnabled(supabase, userId);
    if (!enabled) {
      console.log('[TRACK-IC] ⏭️ PULANDO: Integração Utmify desabilitada para este usuário');
      console.log('[TRACK-IC] ⏱️ Duração:', Date.now() - startTime, 'ms');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Utmify disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API token
    const apiToken = await getUtmifyApiToken(supabase, userId);
    if (!apiToken) {
      console.log('[TRACK-IC] ❌ ERRO: Token da API Utmify não configurado');
      console.log('[TRACK-IC] ⏱️ Duração:', Date.now() - startTime, 'ms');
      return new Response(
        JSON.stringify({ success: false, error: 'No Utmify API token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[TRACK-IC] ✅ Token da API encontrado');

    // Generate unique IC order ID with prefix
    const icOrderId = `IC_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const valueInCents = Math.round((value || 0) * 100);
    
    console.log('');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC] 📤 PREPARANDO PAYLOAD PARA UTMIFY:');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC]   Order ID (IC):', icOrderId);
    console.log('[TRACK-IC]   Value (cents):', valueInCents);
    
    // Build Utmify order payload
    const order: UtmifyOrder = {
      orderId: icOrderId,
      platform: 'furionpay',
      paymentMethod: 'pix',
      status: 'waiting_payment', // InitiateCheckout maps to waiting_payment
      createdAt: new Date().toISOString(),
      approvedDate: null,
      refundedAt: null,
      customer: {
        name: 'Visitante',
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        document: generateRandomDocument(),
        country: 'BR',
      },
      products: [
        {
          id: `prod_ic_${offerId || 'unknown'}`,
          name: productName || 'Produto',
          planId: `plan_ic_${offerId || 'unknown'}`,
          planName: productName || 'Produto',
          quantity: 1,
          priceInCents: valueInCents,
        }
      ],
      trackingParameters: {
        src: utmParams?.src || utmParams?.utm_source || null,
        sck: utmParams?.sck || null,
        utm_source: utmParams?.utm_source || null,
        utm_campaign: utmParams?.utm_campaign || null,
        utm_medium: utmParams?.utm_medium || null,
        utm_content: utmParams?.utm_content || null,
        utm_term: utmParams?.utm_term || null,
      },
      commission: {
        totalPriceInCents: valueInCents,
        gatewayFeeInCents: 0,
        userCommissionInCents: valueInCents,
      },
    };

    console.log('[TRACK-IC]   Status:', order.status);
    console.log('[TRACK-IC]   Platform:', order.platform);
    console.log('[TRACK-IC]   ── Tracking Parameters ──');
    console.log('[TRACK-IC]      src:', order.trackingParameters.src || 'N/A');
    console.log('[TRACK-IC]      utm_source:', order.trackingParameters.utm_source || 'N/A');
    console.log('[TRACK-IC]      utm_campaign:', order.trackingParameters.utm_campaign || 'N/A');
    console.log('[TRACK-IC]      utm_medium:', order.trackingParameters.utm_medium || 'N/A');
    
    console.log('');
    console.log('[TRACK-IC] 🚀 Enviando requisição para:', UTMIFY_API_URL);

    // Send to Utmify API
    const response = await fetch(UTMIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
      },
      body: JSON.stringify(order),
    });

    const responseText = await response.text();
    
    console.log('');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC] 📥 RESPOSTA DA API UTMIFY:');
    console.log('[TRACK-IC] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TRACK-IC]   Status Code:', response.status);
    console.log('[TRACK-IC]   Status Text:', response.statusText);
    console.log('[TRACK-IC]   Success:', response.ok ? '✅ SIM' : '❌ NÃO');
    console.log('[TRACK-IC]   Response Body:', responseText.substring(0, 500));
    
    const duration = Date.now() - startTime;
    console.log('');
    console.log('[TRACK-IC] ⏱️ Duração total:', duration, 'ms');
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Utmify API error',
          statusCode: response.status,
          details: responseText,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: icOrderId,
        message: 'InitiateCheckout tracked successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TRACK-IC] ❌ ERRO:', error);
    console.log('[TRACK-IC] ⏱️ Duração:', Date.now() - startTime, 'ms');
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
