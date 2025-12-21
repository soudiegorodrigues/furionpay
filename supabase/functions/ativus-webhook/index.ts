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
// SECURITY LOGGING - PHASE 2
// Captures all headers to identify signature patterns
// ============================================
function logSecurityHeaders(req: Request, context: string) {
  const headers = Object.fromEntries(req.headers.entries());
  
  // Headers that might contain security signatures
  const securityHeaders = {
    // Common signature header patterns
    'x-signature': headers['x-signature'],
    'x-hub-signature': headers['x-hub-signature'],
    'x-hub-signature-256': headers['x-hub-signature-256'],
    'x-webhook-signature': headers['x-webhook-signature'],
    'x-webhook-secret': headers['x-webhook-secret'],
    'x-api-key': headers['x-api-key'],
    'x-auth-token': headers['x-auth-token'],
    'x-request-signature': headers['x-request-signature'],
    'x-hmac-signature': headers['x-hmac-signature'],
    'signature': headers['signature'],
    'authorization': headers['authorization'],
    
    // Ativus-specific headers (potential)
    'x-ativus-signature': headers['x-ativus-signature'],
    'x-ativus-token': headers['x-ativus-token'],
    'x-ativus-key': headers['x-ativus-key'],
    'ativus-signature': headers['ativus-signature'],
    'ativus-key': headers['ativus-key'],
    
    // IP and origin info
    'x-forwarded-for': headers['x-forwarded-for'],
    'x-real-ip': headers['x-real-ip'],
    'cf-connecting-ip': headers['cf-connecting-ip'],
    'origin': headers['origin'],
    'referer': headers['referer'],
    'host': headers['host'],
    'user-agent': headers['user-agent'],
    
    // Request metadata
    'content-type': headers['content-type'],
    'content-length': headers['content-length'],
  };
  
  // Filter out undefined values for cleaner logs
  const filteredHeaders = Object.fromEntries(
    Object.entries(securityHeaders).filter(([_, v]) => v !== undefined)
  );
  
  console.log(`[SECURITY-AUDIT] ${context} - Security headers:`, JSON.stringify(filteredHeaders, null, 2));
  console.log(`[SECURITY-AUDIT] ${context} - ALL headers:`, JSON.stringify(headers, null, 2));
  
  // Log any header that looks like it could be a signature
  const potentialSignatures = Object.entries(headers).filter(([key, value]) => {
    const keyLower = key.toLowerCase();
    const isSignatureKey = keyLower.includes('sign') || 
                           keyLower.includes('auth') || 
                           keyLower.includes('token') || 
                           keyLower.includes('key') ||
                           keyLower.includes('secret') ||
                           keyLower.includes('hmac');
    const looksLikeSignature = typeof value === 'string' && 
                               (value.length >= 32 || value.startsWith('sha') || value.includes('='));
    return isSignatureKey || looksLikeSignature;
  });
  
  if (potentialSignatures.length > 0) {
    console.log(`[SECURITY-AUDIT] ${context} - POTENTIAL SIGNATURE HEADERS FOUND:`, 
      JSON.stringify(Object.fromEntries(potentialSignatures), null, 2)
    );
  } else {
    console.log(`[SECURITY-AUDIT] ${context} - No obvious signature headers detected`);
  }
  
  return {
    allHeaders: headers,
    securityHeaders: filteredHeaders,
    potentialSignatures: Object.fromEntries(potentialSignatures),
    clientIp: headers['x-forwarded-for'] || headers['x-real-ip'] || headers['cf-connecting-ip'] || 'unknown',
    userAgent: headers['user-agent'] || 'unknown'
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== ATIVUS WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Timestamp:', new Date().toISOString());
  
  // PHASE 2: Advanced security logging
  const securityInfo = logSecurityHeaders(req, 'ATIVUS-WEBHOOK');

  try {
    let payload: any;
    const contentType = req.headers.get('content-type') || '';
    
    // Try to parse the body
    const rawBody = await req.text();
    console.log('[SECURITY-AUDIT] Raw body length:', rawBody.length);
    console.log('[SECURITY-AUDIT] Raw body (first 1000 chars):', rawBody.substring(0, 1000));

    if (contentType.includes('application/json')) {
      payload = JSON.parse(rawBody);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    } else {
      // Try JSON anyway
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = { raw: rawBody };
      }
    }

    console.log('Parsed payload:', JSON.stringify(payload));

    // Extract transaction info from Ativus webhook
    // Ativus can send different formats, try to extract the key fields
    const transactionId = 
      payload.id_transaction || 
      payload.transactionId || 
      payload.id || 
      payload.externalRef ||
      payload.data?.id ||
      payload.data?.externalRef ||
      null;
    
    const status = (
      payload.situacao || 
      payload.status || 
      payload.data?.status ||
      payload.data?.situacao ||
      ''
    ).toString().toUpperCase();
    
    const paidAt = payload.data_transacao || payload.paidAt || payload.data?.paidAt || null;

    console.log('Transaction ID:', transactionId);
    console.log('Status:', status);
    console.log('Paid At:', paidAt);

    const supabase = getSupabaseClient();

    // Log the webhook event with security info
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'webhook_security_audit',
        error_message: JSON.stringify({ 
          transactionId,
          status,
          clientIp: securityInfo.clientIp,
          userAgent: securityInfo.userAgent,
          hasSignatureHeaders: Object.keys(securityInfo.potentialSignatures).length > 0,
          signatureHeaders: Object.keys(securityInfo.potentialSignatures),
          allHeaderKeys: Object.keys(securityInfo.allHeaders)
        }).slice(0, 500)
      });
    } catch (logError) {
      console.log('Failed to log security audit:', logError);
    }

    if (!transactionId) {
      console.log('No transaction ID found in webhook payload');
      // Still return 200 to prevent Ativus from retrying
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no transaction ID found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a payment confirmation
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    if (isPaid) {
      console.log('*** PAYMENT CONFIRMED via webhook! Marking as paid ***');
      console.log('[SECURITY-AUDIT] Payment confirmation from IP:', securityInfo.clientIp);
      
      // Try to find and update the transaction
      // First try by txid
      const { error: updateError } = await supabase.rpc('mark_pix_paid', {
        p_txid: transactionId
      });

      if (updateError) {
        console.error('Error marking PIX as paid:', updateError);
        
        // Try direct update as fallback
        const { error: directError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: paidAt || new Date().toISOString() 
          })
          .eq('txid', transactionId);
        
        if (directError) {
          console.error('Direct update also failed:', directError);
        } else {
          console.log('Transaction marked as paid via direct update');
        }
      } else {
        console.log('Transaction marked as paid successfully via RPC');
      }

      // Utmify integration handled by database trigger (utmify-sync)
    } else {
      console.log('Webhook received but status is not paid:', status);
    }

    // Log the webhook event for debugging
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: isPaid ? 'webhook_paid' : 'webhook_received',
        error_message: JSON.stringify({ 
          transactionId, 
          status, 
          paidAt,
          isPaid,
          clientIp: securityInfo.clientIp
        }).slice(0, 500)
      });
    } catch (logError) {
      console.log('Failed to log webhook event:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        transactionId,
        status,
        isPaid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Ativus webhook:', error);
    console.log('[SECURITY-AUDIT] Error occurred from IP:', securityInfo.clientIp);
    
    // Always return 200 to prevent retries
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
