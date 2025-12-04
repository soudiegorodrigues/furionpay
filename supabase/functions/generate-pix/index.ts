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

// Random email domains
const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br'];

const getRandomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

const getRandomEmail = (name: string) => {
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${cleanName}${randomNum}@${domain}`;
};

const getRandomPhone = () => {
  const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '62', '27', '48'];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const number = Math.floor(Math.random() * 900000000) + 100000000;
  return `${ddd}9${number.toString().slice(0, 8)}`;
};

interface GeneratePixRequest {
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  userId?: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getApiKeyFromDatabase(userId?: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  // First try user-specific settings
  if (userId) {
    const { data: userData, error: userError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'spedpay_api_key')
      .eq('user_id', userId)
      .single();
    
    if (!userError && userData?.value) {
      console.log('Using user-specific API key');
      return userData.value;
    }
  }
  
  // Fall back to global settings (without user_id)
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'spedpay_api_key')
    .is('user_id', null)
    .single();
  
  if (error) {
    console.error('Error fetching API key from database:', error);
    return null;
  }
  
  console.log('Using global API key');
  return data?.value || null;
}

async function getProductNameFromDatabase(userId?: string): Promise<string> {
  const supabase = getSupabaseClient();
  const DEFAULT_PRODUCT_NAME = 'Anônimo';
  
  // First try user-specific settings
  if (userId) {
    const { data: userData, error: userError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'product_name')
      .eq('user_id', userId)
      .single();
    
    // Only use if value exists and is not empty
    if (!userError && userData?.value && userData.value.trim() !== '') {
      console.log('Using user-specific product name:', userData.value);
      return userData.value;
    }
  }
  
  // Fall back to global settings
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'product_name')
    .is('user_id', null)
    .single();
  
  // Only use global if value exists and is not empty
  if (!error && data?.value && data.value.trim() !== '') {
    console.log('Using global product name:', data.value);
    return data.value;
  }
  
  console.log('Using default product name:', DEFAULT_PRODUCT_NAME);
  return DEFAULT_PRODUCT_NAME;
}

async function getRecipientIdFromDatabase(userId?: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  // First try user-specific settings
  if (userId) {
    const { data: userData, error: userError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'recipient_id')
      .eq('user_id', userId)
      .single();
    
    if (!userError && userData?.value && userData.value.trim() !== '') {
      console.log('Using user-specific recipient_id:', userData.value);
      return userData.value;
    }
  }
  
  // Fall back to global settings
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'recipient_id')
    .is('user_id', null)
    .single();
  
  if (!error && data?.value && data.value.trim() !== '') {
    console.log('Using global recipient_id:', data.value);
    return data.value;
  }
  
  return null;
}


async function logPixGenerated(amount: number, txid: string, pixCode: string, donorName: string, utmData?: Record<string, any>, productName?: string, userId?: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('log_pix_generated_user', {
      p_amount: amount,
      p_txid: txid,
      p_pix_code: pixCode,
      p_donor_name: donorName,
      p_utm_data: utmData || null,
      p_product_name: productName || null,
      p_user_id: userId || null
    });
    
    if (error) {
      console.error('Error logging PIX transaction:', error);
      return null;
    } else {
      console.log('PIX transaction logged with ID:', data);
      return data as string;
    }
  } catch (err) {
    console.error('Error in logPixGenerated:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, customerName, customerEmail, customerDocument, utmParams, userId }: GeneratePixRequest = await req.json();

    console.log('User ID:', userId);
    console.log('UTM params received:', utmParams);

    // Get API key from database (user-specific if userId provided)
    let apiKey = await getApiKeyFromDatabase(userId);
    
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

    // Get product name and recipient_id from database (user-specific)
    const productName = await getProductNameFromDatabase(userId);
    const recipientId = await getRecipientIdFromDatabase(userId);
    console.log('Product name:', productName);
    console.log('Recipient ID:', recipientId);

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalId = `donation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const donorName = customerName || getRandomName();
    const donorEmail = customerEmail || getRandomEmail(donorName);
    const donorPhone = getRandomPhone();

    // Build webhook URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const webhookUrl = `${supabaseUrl}/functions/v1/pix-webhook`;

    // Build customer object with UTM params
    const customerData: Record<string, any> = {
      name: donorName,
      email: donorEmail,
      phone: donorPhone,
      document_type: 'CPF',
      document: customerDocument || '12345678909',
    };

    // Add UTM params to customer object if available
    if (utmParams) {
      if (utmParams.utm_source) customerData.utm_source = utmParams.utm_source;
      if (utmParams.utm_medium) customerData.utm_medium = utmParams.utm_medium;
      if (utmParams.utm_campaign) customerData.utm_campaign = utmParams.utm_campaign;
      if (utmParams.utm_content) customerData.utm_content = utmParams.utm_content;
      if (utmParams.utm_term) customerData.utm_term = utmParams.utm_term;
    }

    const transactionData: Record<string, any> = {
      external_id: externalId,
      total_amount: amount,
      payment_method: 'PIX',
      webhook_url: webhookUrl,
      customer: customerData,
      items: [
        {
          id: `item_${externalId}`,
          title: productName,
          description: productName,
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
    
    let pixCode = data.pix?.payload || data.pix?.qr_code || data.pixCode || data.qr_code;
    let qrCodeUrl = data.pix?.qr_code_url || data.qrCodeUrl;
    const transactionId = data.id || externalId;

    // If PIX code not in response, poll for it
    if (!pixCode && data.id) {
      console.log('PIX code not in initial response, polling for transaction details...');
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
        
        console.log(`Fetching transaction details, attempt ${attempt}/5`);
        
        const detailsResponse = await fetch(`${SPEDPAY_API_URL}/v1/transactions/${data.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-secret': apiKey,
          },
        });
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          console.log(`Transaction details (attempt ${attempt}):`, JSON.stringify(detailsData, null, 2));
          
          pixCode = detailsData.pix?.payload || detailsData.pix?.qr_code || detailsData.pixCode || detailsData.qr_code;
          qrCodeUrl = detailsData.pix?.qr_code_url || detailsData.qrCodeUrl;
          
          if (pixCode) {
            console.log('PIX code found after polling!');
            break;
          }
        }
      }
    }

    if (!pixCode) {
      console.error('PIX code not found after polling. Initial response:', data);
      return new Response(
        JSON.stringify({ error: 'PIX code not found in response. Please check your SpedPay account configuration.', rawResponse: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the PIX generation to database and get the database ID
    const dbTransactionId = await logPixGenerated(amount, transactionId, pixCode, donorName, utmParams, productName, userId);

    return new Response(
      JSON.stringify({
        pixCode,
        qrCodeUrl: qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`,
        transactionId: dbTransactionId || transactionId,
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