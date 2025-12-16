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

async function createHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256=${hashHex}`;
}

async function sendWebhook(
  webhookUrl: string,
  webhookSecret: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = await createHmacSignature(webhookSecret, payloadString);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FurionPay-Signature': signature,
        'X-FurionPay-Event': eventType,
        'User-Agent': 'FurionPay-Webhook/1.0'
      },
      body: payloadString
    });
    
    const responseBody = await response.text();
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000) // Limitar tamanho
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { transaction_id, event } = await req.json();
    
    if (!transaction_id || !event) {
      return new Response(JSON.stringify({ error: 'Missing transaction_id or event' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[WEBHOOK-DISPATCH] Processing event ${event} for transaction ${transaction_id}`);
    
    // Buscar transação com dados
    const { data: transaction, error: txError } = await supabase
      .from('pix_transactions')
      .select('id, txid, amount, status, created_at, paid_at, expired_at, utm_data, user_id')
      .eq('id', transaction_id)
      .single();
    
    if (txError || !transaction) {
      console.error(`[WEBHOOK-DISPATCH] Transaction not found: ${transaction_id}`);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verificar se transação veio da API (tem api_client_id no utm_data)
    const utmData = transaction.utm_data as Record<string, unknown> | null;
    const apiClientId = utmData?.api_client_id;
    
    if (!apiClientId) {
      console.log(`[WEBHOOK-DISPATCH] Transaction ${transaction_id} is not from API, skipping webhook`);
      return new Response(JSON.stringify({ message: 'Not an API transaction, skipping' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Buscar API client com webhook configurado
    const { data: apiClient, error: clientError } = await supabase
      .from('api_clients')
      .select('id, webhook_url, webhook_secret, name')
      .eq('id', apiClientId)
      .eq('is_active', true)
      .single();
    
    if (clientError || !apiClient || !apiClient.webhook_url) {
      console.log(`[WEBHOOK-DISPATCH] No webhook configured for client ${apiClientId}`);
      return new Response(JSON.stringify({ message: 'No webhook configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Montar payload do webhook
    const webhookPayload = {
      event,
      created_at: new Date().toISOString(),
      data: {
        txid: transaction.txid,
        external_reference: utmData?.external_reference || null,
        amount: transaction.amount,
        status: transaction.status,
        paid_at: transaction.paid_at || null,
        created_at: transaction.created_at,
        metadata: utmData?.metadata || null
      }
    };
    
    // Registrar tentativa de entrega
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert({
        api_client_id: apiClient.id,
        transaction_id: transaction.id,
        webhook_url: apiClient.webhook_url,
        event_type: event,
        payload: webhookPayload,
        status: 'pending',
        attempts: 1,
        last_attempt_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (deliveryError) {
      console.error(`[WEBHOOK-DISPATCH] Error creating delivery record:`, deliveryError);
    }
    
    // Enviar webhook
    const result = await sendWebhook(
      apiClient.webhook_url,
      apiClient.webhook_secret,
      event,
      webhookPayload
    );
    
    // Atualizar status da entrega
    if (delivery?.id) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: result.success ? 'success' : 'failed',
          response_status: result.statusCode,
          response_body: result.responseBody || result.error
        })
        .eq('id', delivery.id);
    }
    
    console.log(`[WEBHOOK-DISPATCH] Webhook sent to ${apiClient.webhook_url}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.statusCode})`);
    
    return new Response(JSON.stringify({
      success: result.success,
      webhook_url: apiClient.webhook_url,
      status_code: result.statusCode
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[WEBHOOK-DISPATCH] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
