import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// EFI Pay webhook IPs for validation (skip-mTLS mode)
// Note: EFI recommends validating the IP origin
const EFI_ALLOWED_IPS: string[] = [
  '34.193.116.226', // EFI primary IP
  // Add more IPs as provided by EFI documentation
];

// Flag to enable strict mode (set to true after confirming IPs)
const EFI_STRICT_MODE = false;

function extractClientIp(req: Request): string {
  const headers = req.headers;
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             headers.get('cf-connecting-ip') ||
             'unknown';
  return ip;
}

function validateEfiRequest(req: Request): { valid: boolean; reason: string; ip: string } {
  const ip = extractClientIp(req);
  
  // If strict mode is disabled, allow all requests but log them
  if (!EFI_STRICT_MODE) {
    console.log('[EFI-WEBHOOK] Strict mode disabled - allowing request for monitoring');
    return { valid: true, reason: 'Strict mode disabled', ip };
  }
  
  // Validate IP
  if (EFI_ALLOWED_IPS.length > 0) {
    const ipValid = EFI_ALLOWED_IPS.some(allowedIp => {
      if (allowedIp.endsWith('.')) {
        return ip.startsWith(allowedIp);
      }
      return ip === allowedIp;
    });
    
    if (!ipValid) {
      return { 
        valid: false, 
        reason: `IP não autorizado: ${ip}`,
        ip
      };
    }
  }
  
  return { valid: true, reason: 'OK', ip };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log('=== EFI WEBHOOK RECEIVED ===');
  console.log('Timestamp:', timestamp);

  // SECURITY: Validate request origin
  const validation = validateEfiRequest(req);
  
  console.log('[SECURITY] IP:', validation.ip);
  console.log('[SECURITY] Valid:', validation.valid);
  console.log('[SECURITY] Strict Mode:', EFI_STRICT_MODE);

  const supabase = getSupabaseClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Log security event
  try {
    await supabase.from('api_monitoring_events').insert({
      acquirer: 'efi',
      event_type: validation.valid ? 'webhook_authenticated' : 'webhook_blocked',
      error_message: JSON.stringify({ 
        ip: validation.ip,
        valid: validation.valid,
        reason: validation.reason,
        strictMode: EFI_STRICT_MODE,
        timestamp
      }).slice(0, 500)
    });
  } catch (logError) {
    console.error('[EFI-WEBHOOK] Failed to log security event:', logError);
  }

  // Block unauthorized requests if strict mode is enabled
  if (!validation.valid) {
    console.error('[EFI-WEBHOOK] BLOCKED - Unauthorized request:', validation.reason);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Request origin not authorized'
      }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log('[EFI-WEBHOOK] Request authenticated successfully');

  try {
    // Parse webhook payload
    let payload;
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();
    
    console.log('[EFI-WEBHOOK] Raw body:', rawBody);
    
    if (contentType.includes('application/json')) {
      payload = JSON.parse(rawBody);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    } else {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = { raw: rawBody };
      }
    }

    console.log('[EFI-WEBHOOK] Received payload:', JSON.stringify(payload));
    console.log('[EFI-WEBHOOK] All payload keys:', Object.keys(payload));

    // EFI sends pix[] array with payment confirmations
    // Format: { pix: [{ endToEndId, txid, chave, valor, horario, infoPagador, ... }] }
    const pixArray = payload.pix || [];
    
    console.log('[EFI-WEBHOOK] PIX array count:', pixArray.length);

    for (const pixItem of pixArray) {
      const txid = pixItem.txid;
      const endToEndId = pixItem.endToEndId;
      const valor = pixItem.valor;
      const horario = pixItem.horario;
      
      console.log('[EFI-WEBHOOK] Processing PIX item - txid:', txid, 'endToEndId:', endToEndId, 'valor:', valor);

      if (!txid) {
        console.log('[EFI-WEBHOOK] No txid in PIX item, skipping');
        continue;
      }

      // Find transaction in database
      const { data: transaction, error: findError } = await supabase
        .from('pix_transactions')
        .select('id, user_id, txid, status')
        .eq('txid', txid)
        .eq('acquirer', 'efi')
        .maybeSingle();

      if (findError || !transaction) {
        console.error('[EFI-WEBHOOK] Transaction not found for txid:', txid);
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'efi',
          event_type: 'failure',
          error_message: `Transaction not found: txid=${txid}`,
        });
        
        continue;
      }

      console.log('[EFI-WEBHOOK] Found transaction:', transaction.id, 'status:', transaction.status);

      // Skip if already paid
      if (transaction.status === 'paid') {
        console.log('[EFI-WEBHOOK] Transaction already paid, skipping');
        continue;
      }

      // Mark transaction as paid using RPC function
      const { error: rpcError } = await supabase.rpc('mark_pix_paid', { 
        p_txid: transaction.txid 
      });

      if (rpcError) {
        console.error('[EFI-WEBHOOK] RPC error:', rpcError);
        
        // Try direct update as fallback
        const { error: updateError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: horario || new Date().toISOString() 
          })
          .eq('id', transaction.id);
          
        if (updateError) {
          console.error('[EFI-WEBHOOK] Direct update failed:', updateError);
        } else {
          console.log('[EFI-WEBHOOK] Marked as paid via direct update');
        }
      } else {
        console.log('[EFI-WEBHOOK] Marked as paid via RPC');
      }

      // Dispatch webhook to API clients
      if (transaction.id) {
        try {
          const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/api-webhook-dispatch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              transaction_id: transaction.id,
              event: 'payment.paid',
            }),
          });

          console.log('[EFI-WEBHOOK] Webhook dispatch:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[EFI-WEBHOOK] Webhook dispatch error:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'efi',
        event_type: 'webhook_paid',
        error_message: JSON.stringify({ 
          txid: transaction.txid, 
          id: transaction.id,
          ip: validation.ip,
          endToEndId,
          valor
        }).slice(0, 500),
      });
    }

    // If no pix array, log the received event
    if (pixArray.length === 0) {
      console.log('[EFI-WEBHOOK] No PIX items in payload');
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'efi',
        event_type: 'webhook_received',
        error_message: `Empty pix array, payload keys: ${Object.keys(payload).join(', ')}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EFI-WEBHOOK] Error:', error);
    
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'efi',
        event_type: 'failure',
        error_message: `${error instanceof Error ? error.message : 'Error'} - IP: ${validation.ip}`,
      });
    } catch (logError) {
      console.error('[EFI-WEBHOOK] Log error failed:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
