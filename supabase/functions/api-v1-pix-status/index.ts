import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    await supabase.rpc('sql', {
      query: `UPDATE api_clients SET total_requests = total_requests + 1, last_request_at = now() WHERE id = '${clientId}'`
    });
  } catch (e) {
    console.error('[API-LOG] Error logging request:', e);
  }
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
  
  // Extrair txid da URL
  const url = new URL(req.url);
  const txid = url.searchParams.get('txid');
  
  if (!txid) {
    const responseTime = Date.now() - startTime;
    const errorResponse = {
      success: false,
      error: {
        code: 'MISSING_TXID',
        message: 'Transaction ID (txid) is required as query parameter'
      }
    };
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/status', 'GET', 400, { txid }, errorResponse, ipAddress, userAgent, responseTime, 'Missing txid');
    
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Buscar transação
    const { data: transaction, error: txError } = await supabase
      .from('pix_transactions')
      .select('id, txid, amount, status, created_at, paid_at, expired_at, utm_data, user_id')
      .eq('txid', txid)
      .single();
    
    if (txError || !transaction) {
      const responseTime = Date.now() - startTime;
      const errorResponse = {
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction with txid ${txid} not found`
        }
      };
      await logApiRequest(supabase, client.client_id, '/api/v1/pix/status', 'GET', 404, { txid }, errorResponse, ipAddress, userAgent, responseTime, 'Transaction not found');
      
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verificar se a transação pertence ao usuário da API key
    if (transaction.user_id !== client.user_id) {
      const responseTime = Date.now() - startTime;
      const errorResponse = {
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction with txid ${txid} not found`
        }
      };
      await logApiRequest(supabase, client.client_id, '/api/v1/pix/status', 'GET', 404, { txid }, errorResponse, ipAddress, userAgent, responseTime, 'Transaction belongs to another user');
      
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Mapear status
    let status = 'pending';
    if (transaction.status === 'paid') {
      status = 'paid';
    } else if (transaction.status === 'expired') {
      status = 'expired';
    }
    
    // Extrair external_reference do utm_data
    const utmData = transaction.utm_data as Record<string, unknown> | null;
    const externalReference = utmData?.external_reference || null;
    const metadata = utmData?.metadata || null;
    
    const responseTime = Date.now() - startTime;
    const successResponse = {
      success: true,
      data: {
        txid: transaction.txid,
        external_reference: externalReference,
        amount: transaction.amount,
        status,
        paid_at: transaction.paid_at || null,
        expired_at: transaction.expired_at || null,
        created_at: transaction.created_at,
        metadata
      }
    };
    
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/status', 'GET', 200, { txid }, successResponse, ipAddress, userAgent, responseTime);
    
    console.log(`[API-PIX-STATUS] Success: txid=${txid}, status=${status}, client=${client.client_name}`);
    
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
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      }
    };
    
    await logApiRequest(supabase, client.client_id, '/api/v1/pix/status', 'GET', 500, { txid }, errorResponse, ipAddress, userAgent, responseTime, errorMessage);
    
    console.error(`[API-PIX-STATUS] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
