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
  // Only use user-specific token - no global fallback
  if (!userId) {
    console.log('[UTMIFY-SYNC] No userId provided, cannot get token');
    return null;
  }
  
  const { data: userToken } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_api_token')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (userToken?.value) {
    console.log('[UTMIFY-SYNC] Using user-specific API token for user:', userId);
    return userToken.value;
  }
  
  console.log('[UTMIFY-SYNC] No API token configured for user:', userId);
  return null;
}

async function isUtmifyEnabled(supabase: any, userId?: string): Promise<boolean> {
  // Only check user-specific setting - no global fallback
  if (!userId) {
    console.log('[UTMIFY-SYNC] No userId provided, Utmify disabled');
    return false;
  }
  
  const { data: userEnabled } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'utmify_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  
  const enabled = userEnabled?.value === 'true';
  console.log('[UTMIFY-SYNC] Utmify enabled for user', userId, ':', enabled);
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

function generateRandomEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${cleanName}${randomNum}@${domain}`;
}

// Map database status to Utmify status
function mapStatusToUtmify(dbStatus: string): string {
  switch (dbStatus) {
    case 'generated':
      return 'waiting_payment';
    case 'paid':
      return 'paid';
    case 'expired':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    default:
      return 'waiting_payment';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== UTMIFY-SYNC TRIGGERED ===');

  try {
    const payload = await req.json();
    
    // Support both trigger format and direct call format
    const type = payload.type || 'INSERT';
    const record = payload.record || payload;
    const oldRecord = payload.old_record || null;
    
    console.log('[UTMIFY-SYNC] Event type:', type);
    console.log('[UTMIFY-SYNC] Record:', JSON.stringify(record));
    
    // Extract transaction data
    const txid = record.txid;
    const amount = record.amount;
    const status = record.status;
    const donorName = record.donor_name || 'Cliente';
    const productName = record.product_name || 'Produto';
    const userId = record.user_id;
    const utmData = record.utm_data;
    const createdAt = record.created_at;
    const paidAt = record.paid_at;
    
    // Extract fees for net amount calculation
    const feePercentage = record.fee_percentage || 0;
    const feeFixed = record.fee_fixed || 0;

    // Skip test transactions - filter out demonstration/test data
    if (txid?.startsWith('TEST_') || productName === 'Produto Demonstração') {
      console.log('[UTMIFY-SYNC] Test transaction detected, skipping:', { txid, productName });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Test transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!txid || !amount) {
      console.log('[UTMIFY-SYNC] Missing txid or amount, skipping');
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if this is an UPDATE but status hasn't changed
    if (type === 'UPDATE' && oldRecord?.status === status) {
      console.log('[UTMIFY-SYNC] Status unchanged, skipping');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Status unchanged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Check if Utmify is enabled
    const enabled = await isUtmifyEnabled(supabase, userId);
    if (!enabled) {
      console.log('[UTMIFY-SYNC] Integration is disabled, skipping');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Utmify disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API token
    const apiToken = await getUtmifyApiToken(supabase, userId);
    if (!apiToken) {
      console.log('[UTMIFY-SYNC] No API token configured, skipping');
      return new Response(
        JSON.stringify({ success: false, error: 'No Utmify API token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate net amount (after fee deduction)
    const feeAmount = (amount * feePercentage / 100) + feeFixed;
    const netAmount = amount - feeAmount;
    const grossPriceInCents = Math.round(amount * 100);
    const netPriceInCents = Math.round(netAmount * 100);
    const feeInCents = Math.round(feeAmount * 100);
    const utmifyStatus = mapStatusToUtmify(status);
    
    console.log('[UTMIFY-SYNC] Fee calculation:', { amount, feePercentage, feeFixed, feeAmount, netAmount });
    
    // Build Utmify order payload
    const order: UtmifyOrder = {
      orderId: txid,
      platform: 'furionpay',
      paymentMethod: 'pix',
      status: utmifyStatus,
      createdAt: createdAt || new Date().toISOString(),
      approvedDate: status === 'paid' ? (paidAt || new Date().toISOString()) : null,
      refundedAt: status === 'refunded' ? new Date().toISOString() : null,
      customer: {
        name: donorName,
        email: generateRandomEmail(donorName),
        phone: generateRandomPhone(),
        document: generateRandomDocument(),
        country: 'BR',
      },
      products: [
        {
          id: `prod_${txid}`,
          name: productName,
          planId: `plan_${txid}`,
          planName: productName,
          quantity: 1,
          priceInCents: netPriceInCents,
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
        totalPriceInCents: netPriceInCents,  // Enviar valor líquido para Utmify calcular corretamente
        gatewayFeeInCents: 0,                 // Taxa já descontada do valor líquido
        userCommissionInCents: netPriceInCents,
      },
    };

    console.log('[UTMIFY-SYNC] Sending order to Utmify:', JSON.stringify(order, null, 2));

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
    console.log('[UTMIFY-SYNC] Response status:', response.status);
    console.log('[UTMIFY-SYNC] Response:', responseText);

    // Note: Utmify events are not logged to api_monitoring_events
    // because Utmify is a tracking/attribution service, not a payment acquirer

    if (!response.ok) {
      console.error('[UTMIFY-SYNC] API error:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[UTMIFY-SYNC] Order sent successfully');
    
    return new Response(
      JSON.stringify({ success: true, status: utmifyStatus, orderId: txid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UTMIFY-SYNC] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
