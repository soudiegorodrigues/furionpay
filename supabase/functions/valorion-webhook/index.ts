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

// ============================================
// SECURITY VALIDATION - STRICT MODE
// Whitelist of allowed IPs and User-Agents for Valorion
// Note: Update these values based on actual Valorion webhook data
// ============================================
const VALORION_ALLOWED_IPS: string[] = [
  // Add confirmed Valorion IPs here after monitoring
  // For now, we'll be more permissive until we have confirmed IPs
];

const VALORION_ALLOWED_USER_AGENTS: string[] = [
  // Add confirmed Valorion User-Agents here after monitoring
  // For now, we'll be more permissive until we have confirmed patterns
];

// Flag to enable strict mode for Valorion (set to true after confirming IPs)
const VALORION_STRICT_MODE = false;

function extractClientIp(req: Request): string {
  const headers = req.headers;
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             headers.get('cf-connecting-ip') ||
             'unknown';
  return ip;
}

function validateValorionRequest(req: Request): { valid: boolean; reason: string; ip: string; userAgent: string } {
  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // If strict mode is disabled, allow all requests but log them
  if (!VALORION_STRICT_MODE) {
    console.log('[SECURITY] Valorion strict mode disabled - allowing request for monitoring');
    return { valid: true, reason: 'Strict mode disabled', ip, userAgent };
  }
  
  // Validate IP
  if (VALORION_ALLOWED_IPS.length > 0) {
    const ipValid = VALORION_ALLOWED_IPS.some(allowedIp => {
      if (allowedIp.endsWith('.')) {
        return ip.startsWith(allowedIp);
      }
      return ip === allowedIp;
    });
    
    if (!ipValid) {
      return { 
        valid: false, 
        reason: `IP não autorizado: ${ip}`,
        ip,
        userAgent
      };
    }
  }
  
  // Validate User-Agent
  if (VALORION_ALLOWED_USER_AGENTS.length > 0) {
    const uaValid = VALORION_ALLOWED_USER_AGENTS.some(allowedUA => 
      userAgent.includes(allowedUA)
    );
    
    if (!uaValid) {
      return { 
        valid: false, 
        reason: `User-Agent não autorizado: ${userAgent}`,
        ip,
        userAgent
      };
    }
  }
  
  return { valid: true, reason: 'OK', ip, userAgent };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log('=== VALORION WEBHOOK RECEIVED ===');
  console.log('Timestamp:', timestamp);

  // SECURITY: Validate request origin
  const validation = validateValorionRequest(req);
  
  console.log('[SECURITY] IP:', validation.ip);
  console.log('[SECURITY] User-Agent:', validation.userAgent);
  console.log('[SECURITY] Valid:', validation.valid);
  console.log('[SECURITY] Strict Mode:', VALORION_STRICT_MODE);

  const supabase = getSupabaseClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Log security event
  try {
    await supabase.from('api_monitoring_events').insert({
      acquirer: 'valorion',
      event_type: validation.valid ? 'webhook_authenticated' : 'webhook_blocked',
      error_message: JSON.stringify({ 
        ip: validation.ip,
        userAgent: validation.userAgent,
        valid: validation.valid,
        reason: validation.reason,
        strictMode: VALORION_STRICT_MODE,
        timestamp
      }).slice(0, 500)
    });
  } catch (logError) {
    console.error('Failed to log security event:', logError);
  }

  // Block unauthorized requests if strict mode is enabled
  if (!validation.valid) {
    console.error('[SECURITY] BLOCKED - Unauthorized request:', validation.reason);
    
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

  console.log('[SECURITY] Request authenticated successfully');

  try {
    // Parse webhook payload
    let payload;
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();
    
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

    console.log('[VALORION-WEBHOOK] Received payload:', JSON.stringify(payload));

    // Extract transaction ID from multiple possible fields
    const transactionId = payload.id_transaction || 
                          payload.idTransaction || 
                          payload.transaction_id || 
                          payload.id ||
                          payload.data?.id_transaction ||
                          payload.data?.id;
    
    // Extract metadata (contains our local txid)
    const metadata = payload.metadata || payload.data?.metadata;
                          
    const status = (payload.situacao || 
                    payload.status || 
                    payload.data?.status || 
                    payload.data?.situacao ||
                    '').toString().toUpperCase();

    console.log('[VALORION-WEBHOOK] Transaction ID:', transactionId);
    console.log('[VALORION-WEBHOOK] Metadata:', metadata);
    console.log('[VALORION-WEBHOOK] Status:', status);

    if (!transactionId && !metadata) {
      console.error('[VALORION-WEBHOOK] No transaction ID or metadata found');
      return new Response(
        JSON.stringify({ success: false, error: 'No transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if status indicates payment completed
    const paidStatuses = ['PAID_OUT', 'CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('[VALORION-WEBHOOK] Transaction is PAID! Searching in database...');

      // Try multiple search strategies
      let transaction = null;

      // Strategy 1: Search by txid
      if (transactionId) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', transactionId)
          .eq('acquirer', 'valorion')
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by txid:', data.id);
          transaction = data;
        }
      }

      // Strategy 2: Search by metadata
      if (!transaction && metadata) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', metadata)
          .eq('acquirer', 'valorion')
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by metadata:', data.id);
          transaction = data;
        }
      }

      // Strategy 3: Search by partial txid match
      if (!transaction && transactionId) {
        const { data } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .ilike('txid', `%${transactionId.substring(0, 20)}%`)
          .eq('acquirer', 'valorion')
          .eq('status', 'generated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          console.log('[VALORION-WEBHOOK] Found by partial match:', data.id);
          transaction = data;
        }
      }

      if (!transaction) {
        console.error('[VALORION-WEBHOOK] Transaction not found');
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'valorion',
          event_type: 'failure',
          error_message: `Transaction not found: id=${transactionId}, metadata=${metadata}`,
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already paid
      if (transaction.status === 'paid') {
        console.log('[VALORION-WEBHOOK] Transaction already paid');
        return new Response(
          JSON.stringify({ success: true, message: 'Already paid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark transaction as paid using RPC function
      const { error: rpcError } = await supabase.rpc('mark_pix_paid', { 
        p_txid: transaction.txid 
      });

      if (rpcError) {
        console.error('[VALORION-WEBHOOK] RPC error:', rpcError);
        
        // Try direct update as fallback
        const { error: updateError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: new Date().toISOString() 
          })
          .eq('id', transaction.id);
          
        if (updateError) {
          console.error('[VALORION-WEBHOOK] Direct update failed:', updateError);
        } else {
          console.log('[VALORION-WEBHOOK] Marked as paid via direct update');
        }
      } else {
        console.log('[VALORION-WEBHOOK] Marked as paid via RPC');
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

          console.log('[VALORION-WEBHOOK] Webhook dispatch:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[VALORION-WEBHOOK] Webhook dispatch error:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'webhook_paid',
        error_message: JSON.stringify({ 
          txid: transaction.txid, 
          id: transaction.id,
          ip: validation.ip
        }).slice(0, 500),
      });

    } else {
      console.log('[VALORION-WEBHOOK] Status not paid:', status);
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'webhook_received',
        error_message: `Status ${status} for id=${transactionId}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VALORION-WEBHOOK] Error:', error);
    
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'valorion',
        event_type: 'failure',
        error_message: `${error instanceof Error ? error.message : 'Error'} - IP: ${validation.ip}`,
      });
    } catch (logError) {
      console.error('[VALORION-WEBHOOK] Log error failed:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
