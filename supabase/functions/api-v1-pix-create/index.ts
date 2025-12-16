import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePixRequest {
  amount: number;
  description?: string;
  external_reference?: string;
  customer?: {
    name?: string;
    email?: string;
    document?: string;
  };
  metadata?: Record<string, unknown>;
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function validateApiKey(supabase: any, apiKey: string) {
  const { data, error } = await supabase.rpc('validate_api_key', { p_api_key: apiKey });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  const client = data[0];
  if (!client.is_valid) {
    return null;
  }
  
  return client;
}

async function logApiRequest(
  supabase: any,
  clientId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  requestBody: any,
  responseBody: any,
  ipAddress: string,
  userAgent: string,
  responseTimeMs: number,
  errorMessage?: string
) {
  try {
    await supabase.from('api_requests').insert({
      api_client_id: clientId,
      endpoint,
      method,
      status_code: statusCode,
      request_body: requestBody,
      response_body: responseBody,
      ip_address: ipAddress,
      user_agent: userAgent,
      response_time_ms: responseTimeMs,
      error_message: errorMessage
    });
    
    // Atualizar contador e último request
    await supabase
      .from('api_clients')
      .update({ 
        total_requests: supabase.raw('total_requests + 1'),
        last_request_at: new Date().toISOString()
      })
      .eq('id', clientId);
  } catch (e) {
    console.error('[API-LOG] Error logging request:', e);
  }
}

async function generatePixViaAcquirer(
  supabase: any,
  userId: string,
  amount: number,
  customerName: string,
  productName: string
) {
  // Buscar adquirente do usuário
  const { data: userAcquirerData } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'user_acquirer')
    .single();
  
  const acquirer = userAcquirerData?.value || 'ativus';
  
  // Buscar configurações de taxa
  const { data: feeConfigIdData } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'user_fee_config')
    .single();
  
  let feePercentage = 6.99;
  let feeFixed = 2.49;
  
  if (feeConfigIdData?.value) {
    const { data: feeConfig } = await supabase
      .from('fee_configs')
      .select('pix_percentage, pix_fixed')
      .eq('id', feeConfigIdData.value)
      .single();
    
    if (feeConfig) {
      feePercentage = feeConfig.pix_percentage;
      feeFixed = feeConfig.pix_fixed;
    }
  }
  
  // Chamar edge function do adquirente
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  let generateUrl = `${supabaseUrl}/functions/v1/generate-pix-ativus`;
  if (acquirer === 'inter') {
    generateUrl = `${supabaseUrl}/functions/v1/generate-pix-inter`;
  } else if (acquirer === 'spedpay') {
    generateUrl = `${supabaseUrl}/functions/v1/generate-pix`;
  }
  
  const response = await fetch(generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      amount,
      donorName: customerName || 'Cliente API',
      userId,
      productName,
      popupModel: 'api'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Acquirer error: ${errorText}`);
  }
  
  const result = await response.json();
  
  return {
    ...result,
    acquirer,
    feePercentage,
    feeFixed
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabase = getSupabaseClient();
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Extrair API key do header
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key is required. Use Authorization: Bearer fp_live_xxx'
      }
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Validar API key
  const client = await validateApiKey(supabase, apiKey);
  
  if (!client) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid or inactive API key'
      }
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  let requestBody: CreatePixRequest;
  
  try {
    requestBody = await req.json();
  } catch {
    const responseTime = Date.now() - startTime;
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/create', 'POST', 400, null, { error: 'Invalid JSON' }, ipAddress, userAgent, responseTime, 'Invalid JSON body');
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid JSON body'
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Validar campos obrigatórios
  if (!requestBody.amount || typeof requestBody.amount !== 'number' || requestBody.amount <= 0) {
    const responseTime = Date.now() - startTime;
    const errorResponse = {
      success: false,
      error: {
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      }
    };
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/create', 'POST', 400, requestBody, errorResponse, ipAddress, userAgent, responseTime, 'Invalid amount');
    
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Valor mínimo
  if (requestBody.amount < 0.50) {
    const responseTime = Date.now() - startTime;
    const errorResponse = {
      success: false,
      error: {
        code: 'AMOUNT_TOO_LOW',
        message: 'Minimum amount is R$ 0.50'
      }
    };
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/create', 'POST', 400, requestBody, errorResponse, ipAddress, userAgent, responseTime, 'Amount too low');
    
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Gerar PIX via adquirente
    const pixResult = await generatePixViaAcquirer(
      supabase,
      client.user_id,
      requestBody.amount,
      requestBody.customer?.name || 'Cliente API',
      requestBody.description || 'Pagamento via API'
    );
    
    if (pixResult.error) {
      throw new Error(pixResult.error);
    }
    
    // Atualizar transação com external_reference e metadata
    if (requestBody.external_reference || requestBody.metadata) {
      await supabase
        .from('pix_transactions')
        .update({
          utm_data: {
            external_reference: requestBody.external_reference,
            metadata: requestBody.metadata,
            api_client_id: client.client_id,
            customer: requestBody.customer
          }
        })
        .eq('txid', pixResult.txid);
    }
    
    const responseTime = Date.now() - startTime;
    const successResponse = {
      success: true,
      data: {
        txid: pixResult.txid,
        pix_code: pixResult.pixCode,
        qr_code_url: pixResult.qrCodeUrl || null,
        amount: requestBody.amount,
        external_reference: requestBody.external_reference || null,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        status: 'pending',
        created_at: new Date().toISOString()
      }
    };
    
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/create', 'POST', 200, requestBody, successResponse, ipAddress, userAgent, responseTime);
    
    console.log(`[API-PIX-CREATE] Success: txid=${pixResult.txid}, amount=${requestBody.amount}, client=${client.client_name}`);
    
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = {
      success: false,
      error: {
        code: 'PIX_GENERATION_FAILED',
        message: errorMessage
      }
    };
    
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/create', 'POST', 500, requestBody, errorResponse, ipAddress, userAgent, responseTime, errorMessage);
    
    console.error(`[API-PIX-CREATE] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
