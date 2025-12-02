import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';

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
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getApiKeyFromDatabase(): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'spedpay_api_key')
    .single();
  
  if (error) {
    console.error('Error fetching API key from database:', error);
    return null;
  }
  
  return data?.value || null;
}

async function logPixGenerated(amount: number, txid: string, pixCode: string, donorName: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('log_pix_generated', {
      p_amount: amount,
      p_txid: txid,
      p_pix_code: pixCode,
      p_donor_name: donorName
    });
    
    if (error) {
      console.error('Error logging PIX transaction:', error);
    } else {
      console.log('PIX transaction logged with ID:', data);
    }
  } catch (err) {
    console.error('Error in logPixGenerated:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from database (configured in admin panel)
    let apiKey = await getApiKeyFromDatabase();
    
    // Fallback to env variable if not in database
    if (!apiKey) {
      apiKey = Deno.env.get('SPEDPAY_API_KEY') || null;
    }
    
    if (!apiKey) {
      console.error('SPEDPAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured. Please configure it in the admin panel (/admin).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using API key from:', apiKey.startsWith('sk_') ? 'database' : 'environment');

    const { amount, customerName, customerEmail, customerDocument }: GeneratePixRequest = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalId = `donation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const donorName = customerName || getRandomName();

    const transactionData = {
      external_id: externalId,
      total_amount: amount,
      payment_method: 'PIX',
      webhook_url: 'https://example.com/webhook',
      customer: {
        name: donorName,
        email: customerEmail || 'doador@exemplo.com',
        phone: '11999999999',
        document_type: 'CPF',
        document: customerDocument || '12345678909',
      },
      items: [
        {
          id: `item_${externalId}`,
          title: 'Anônimo',
          description: 'Doação anônima',
          price: amount,
          quantity: 1,
          is_physical: false,
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
    
    const pixCode = data.pix?.payload || data.pixCode || data.qr_code;
    const qrCodeUrl = data.pix?.qr_code_url || data.qrCodeUrl;
    const transactionId = data.id || externalId;

    if (!pixCode) {
      console.error('PIX code not found in response:', data);
      return new Response(
        JSON.stringify({ error: 'PIX code not found in response', rawResponse: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the PIX generation to database
    await logPixGenerated(amount, transactionId, pixCode, donorName);

    return new Response(
      JSON.stringify({
        pixCode,
        qrCodeUrl: qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`,
        transactionId,
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
