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
  approvedDate?: string | null;
  refundedAt?: string | null;
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
  // First try user-specific token
  if (userId) {
    const { data: userToken } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'utmify_api_token')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userToken?.value) {
      console.log('[UTMIFY] Using user-specific API token');
      return userToken.value;
    }
  }
  
  // Fallback to global token
  const { data: globalToken } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_api_token')
    .is('user_id', null)
    .maybeSingle();
  
  if (globalToken?.value) {
    console.log('[UTMIFY] Using global API token');
    return globalToken.value;
  }
  
  console.log('[UTMIFY] No API token configured');
  return null;
}

async function isUtmifyEnabled(supabase: any, userId?: string): Promise<boolean> {
  // Check user-specific setting first
  if (userId) {
    const { data: userEnabled } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'utmify_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userEnabled?.value === 'true') {
      return true;
    }
  }
  
  // Check global setting
  const { data: globalEnabled } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_enabled')
    .is('user_id', null)
    .maybeSingle();
  
  return globalEnabled?.value === 'true';
}

function generateRandomDocument(): string {
  // Generate a valid-looking CPF (11 digits, not all same)
  const generateDigits = () => {
    let digits = '';
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    return digits;
  };
  
  const digits = generateDigits();
  // Simple check to avoid all same digits
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== UTMIFY SEND ORDER ===');

  try {
    const {
      txid,
      amount,
      status, // 'waiting_payment' | 'paid' | 'refunded' | 'cancelled'
      customerName,
      customerEmail,
      customerPhone,
      customerDocument,
      productName,
      productId,
      createdAt,
      paidAt,
      utmData,
      userId
    } = await req.json();

    console.log('[UTMIFY] Processing order:', { txid, amount, status, productName });

    const supabase = getSupabaseClient();

    // Check if Utmify is enabled
    const enabled = await isUtmifyEnabled(supabase, userId);
    if (!enabled) {
      console.log('[UTMIFY] Integration is disabled, skipping');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Utmify disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API token
    const apiToken = await getUtmifyApiToken(supabase, userId);
    if (!apiToken) {
      console.log('[UTMIFY] No API token configured, skipping');
      return new Response(
        JSON.stringify({ success: false, error: 'No Utmify API token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceInCents = Math.round(amount * 100);
    
    // Build Utmify order payload
    const order: UtmifyOrder = {
      orderId: txid,
      platform: 'FurionPay',
      paymentMethod: 'pix',
      status: status === 'paid' ? 'paid' : 'waiting_payment',
      createdAt: createdAt || new Date().toISOString(),
      approvedDate: status === 'paid' ? (paidAt || new Date().toISOString()) : null,
      refundedAt: null,
      customer: {
        name: customerName || 'Cliente',
        email: customerEmail || `cliente_${Date.now()}@email.com`,
        phone: customerPhone || generateRandomPhone(),
        document: customerDocument || generateRandomDocument(),
        country: 'BR',
      },
      products: [
        {
          id: productId || `prod_${txid}`,
          name: productName || 'Produto',
          planId: productId || `plan_${txid}`,
          planName: productName || 'Produto',
          quantity: 1,
          priceInCents: priceInCents,
        }
      ],
      trackingParameters: {
        src: utmData?.src || utmData?.utm_source || null,
        sck: utmData?.sck || null,
        utm_source: utmData?.utm_source || null,
        utm_campaign: utmData?.utm_campaign || null,
        utm_medium: utmData?.utm_medium || null,
        utm_content: utmData?.utm_content || null,
        utm_term: utmData?.utm_term || null,
      },
      commission: {
        totalPriceInCents: priceInCents,
        gatewayFeeInCents: Math.round(priceInCents * 0.05), // 5% estimated gateway fee
        userCommissionInCents: Math.round(priceInCents * 0.95), // 95% to user
      },
    };

    console.log('[UTMIFY] Sending order:', JSON.stringify(order, null, 2));

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
    console.log('[UTMIFY] Response status:', response.status);
    console.log('[UTMIFY] Response:', responseText);

    if (!response.ok) {
      console.error('[UTMIFY] API error:', responseText);
      
      // Log error to monitoring
      try {
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'utmify',
          event_type: 'failure',
          error_message: `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
        });
      } catch (logError) {
        console.error('[UTMIFY] Failed to log error:', logError);
      }

      return new Response(
        JSON.stringify({ success: false, error: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log success
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'utmify',
        event_type: 'success',
        error_message: `Order ${txid} - Status: ${status}`,
      });
    } catch (logError) {
      console.error('[UTMIFY] Failed to log success:', logError);
    }

    console.log('[UTMIFY] Order sent successfully');
    
    return new Response(
      JSON.stringify({ success: true, response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UTMIFY] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
