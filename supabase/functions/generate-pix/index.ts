import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';
const RECIPIENT_ID = 'rcpt_98278214-f429-4196-a131-417f23d7a5fd';

interface GeneratePixRequest {
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SPEDPAY_API_KEY');
    if (!apiKey) {
      console.error('SPEDPAY_API_KEY not configured');
      throw new Error('API key not configured');
    }

    const { amount, customerName, customerEmail, customerDocument }: GeneratePixRequest = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalId = `donation_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const transactionData = {
      external_id: externalId,
      total_amount: amount * 100, // Convert to cents
      payment_method: 'PIX',
      webhook_url: 'https://example.com/webhook', // Can be updated later
      customer: {
        name: customerName || 'Doador Anônimo',
        email: customerEmail || 'doador@exemplo.com',
        document: customerDocument || '00000000000',
      },
      items: [
        {
          title: 'Doação',
          unit_price: amount * 100,
          quantity: 1,
          tangible: false,
        }
      ],
      splits: [
        {
          recipient_id: RECIPIENT_ID,
          percentage: 100,
        }
      ],
      ip: '0.0.0.0',
    };

    console.log('Creating SpedPay transaction:', JSON.stringify(transactionData, null, 2));

    const response = await fetch(`${SPEDPAY_API_URL}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': apiKey,
      },
      body: JSON.stringify(transactionData),
    });

    const responseText = await response.text();
    console.log('SpedPay response status:', response.status);
    console.log('SpedPay response:', responseText);

    if (!response.ok) {
      console.error('SpedPay API error:', responseText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate PIX', details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(responseText);
    
    // Extract PIX payload from response
    const pixCode = data.pix?.payload || data.pixCode || data.qr_code;
    const qrCodeUrl = data.pix?.qr_code_url || data.qrCodeUrl;

    if (!pixCode) {
      console.error('PIX code not found in response:', data);
      return new Response(
        JSON.stringify({ error: 'PIX code not found in response', rawResponse: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        pixCode,
        qrCodeUrl: qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`,
        transactionId: data.id || externalId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-pix function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
