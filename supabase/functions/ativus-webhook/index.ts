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
// Whitelist of allowed IPs and User-Agents for Ativus
// ============================================
const ATIVUS_ALLOWED_IPS = [
  '45.183.130.229',  // Ativus production server (confirmed from logs)
  '45.183.130.',     // Ativus IP range (prefix match)
];

const ATIVUS_ALLOWED_USER_AGENTS = [
  'AtivusHUB-Webhook/2.0',  // Confirmed from logs
  'AtivusHUB-Webhook/',     // Version-agnostic match
  'AtivusHUB',              // Fallback match
];

function extractClientIp(req: Request): string {
  const headers = req.headers;
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             headers.get('cf-connecting-ip') ||
             'unknown';
  return ip;
}

function validateAtivusRequest(req: Request): { valid: boolean; reason: string; ip: string; userAgent: string } {
  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Validate IP
  const ipValid = ATIVUS_ALLOWED_IPS.some(allowedIp => {
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
  
  // Validate User-Agent
  const uaValid = ATIVUS_ALLOWED_USER_AGENTS.some(allowedUA => 
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
  
  return { valid: true, reason: 'OK', ip, userAgent };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log('=== ATIVUS WEBHOOK RECEIVED ===');
  console.log('[ATIVUS-WEBHOOK] Timestamp:', timestamp);
  
  // STRICT MODE: Validate request origin
  const validation = validateAtivusRequest(req);
  
  console.log('[ATIVUS-WEBHOOK] IP:', validation.ip);
  console.log('[ATIVUS-WEBHOOK] User-Agent:', validation.userAgent);
  console.log('[ATIVUS-WEBHOOK] Valid:', validation.valid);
  
  const supabase = getSupabaseClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Log security event regardless of validation result
  try {
    await supabase.from('api_monitoring_events').insert({
      acquirer: 'ativus',
      event_type: validation.valid ? 'webhook_authenticated' : 'webhook_blocked',
      error_message: JSON.stringify({ 
        ip: validation.ip,
        userAgent: validation.userAgent,
        valid: validation.valid,
        reason: validation.reason,
        timestamp
      }).slice(0, 500)
    });
  } catch (logError) {
    console.error('[ATIVUS-WEBHOOK] Failed to log security event:', logError);
  }

  // STRICT MODE: Block unauthorized requests
  if (!validation.valid) {
    console.error('[ATIVUS-WEBHOOK] BLOCKED - Unauthorized request:', validation.reason);
    
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

  console.log('[ATIVUS-WEBHOOK] Request authenticated successfully');

  try {
    let payload: any;
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();

    console.log('[ATIVUS-WEBHOOK] Raw body:', rawBody);

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

    console.log('[ATIVUS-WEBHOOK] Parsed payload:', JSON.stringify(payload));
    console.log('[ATIVUS-WEBHOOK] All payload keys:', Object.keys(payload));

    // Extract transaction info from Ativus webhook
    // Priority: idtransaction (Ativus specific) > id_transaction > other formats
    const rawTransactionId = 
      payload.idtransaction ||  // Ativus sends this in webhook
      payload.idTransaction ||
      payload.id_transaction || 
      payload.transactionId || 
      payload.data?.idtransaction ||
      payload.data?.id_transaction ||
      null;
    
    // Also extract externalreference which is our txid
    const externalReference = 
      payload.externalreference ||
      payload.externalReference ||
      payload.externalRef ||
      payload.external_reference ||
      payload.data?.externalreference ||
      payload.data?.externalReference ||
      null;
    
    // Ensure transactionId is always a string (fixes "substring is not a function" error)
    const transactionId = rawTransactionId !== null && rawTransactionId !== undefined 
      ? String(rawTransactionId) 
      : null;
    
    const externalRef = externalReference !== null && externalReference !== undefined
      ? String(externalReference)
      : null;
    
    console.log('[ATIVUS-WEBHOOK] External Reference (txid):', externalRef);
    
    const status = (
      payload.situacao || 
      payload.status || 
      payload.data?.status ||
      payload.data?.situacao ||
      ''
    ).toString().toUpperCase();
    
    const paidAt = payload.data_transacao || payload.paidAt || payload.data?.paidAt || null;

    console.log('[ATIVUS-WEBHOOK] Transaction ID:', transactionId);
    console.log('[ATIVUS-WEBHOOK] Status:', status);
    console.log('[ATIVUS-WEBHOOK] PaidAt:', paidAt);

    if (!transactionId && !externalRef) {
      console.log('[ATIVUS-WEBHOOK] No transaction ID or external reference found in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no transaction ID found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a payment confirmation
    const paidStatuses = ['CONCLUIDO', 'CONCLUÍDA', 'PAGO', 'PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'];
    const isPaid = paidStatuses.includes(status);

    // Check if this is a chargeback/refund
    const chargebackStatuses = ['ESTORNADA', 'ESTORNADO', 'ESTORNO', 'REFUND', 'REFUNDED', 'CHARGEBACK', 'REVERSED', 'CANCELLED', 'CANCELADO', 'CANCELADA'];
    const isChargeback = chargebackStatuses.includes(status);

    if (isChargeback) {
      console.log('[ATIVUS-WEBHOOK] *** CHARGEBACK/REFUND DETECTED! Processing... ***');
      
      // Extract amount and client data from payload
      const amount = parseFloat(payload.valor || payload.amount || payload.valor_bruto || '0');
      const clientName = payload.nome || payload.client_name || payload.data?.nome || null;
      const clientDocument = payload.documento || payload.cpf || payload.document || payload.data?.cpf || null;
      const clientEmail = payload.email || payload.data?.email || null;

      // Try to find the original transaction
      let transaction = null;

      // Strategy 1: Search by externalReference (our txid) - MOST RELIABLE
      if (externalRef) {
        const { data: externalRefData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status, amount, donor_name, donor_cpf, donor_email')
          .eq('txid', externalRef)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (externalRefData) {
          console.log('[ATIVUS-WEBHOOK] Chargeback - Found by externalReference:', externalRefData.id);
          transaction = externalRefData;
        }
      }

      // Strategy 2: Search by idtransaction (Ativus internal ID)
      if (!transaction && transactionId) {
        const { data: txidData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status, amount, donor_name, donor_cpf, donor_email')
          .eq('txid', transactionId)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (txidData) {
          console.log('[ATIVUS-WEBHOOK] Chargeback - Found by transactionId:', txidData.id);
          transaction = txidData;
        }
      }

      // Strategy 3: Search by UUID id
      if (!transaction && transactionId) {
        const { data: idData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status, amount, donor_name, donor_cpf, donor_email')
          .eq('id', transactionId)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (idData) {
          console.log('[ATIVUS-WEBHOOK] Chargeback - Found by id:', idData.id);
          transaction = idData;
        }
      }

      // Strategy 4: Partial txid match using externalRef
      if (!transaction && externalRef && externalRef.length >= 10) {
        const { data: partialData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status, amount, donor_name, donor_cpf, donor_email')
          .ilike('txid', `%${externalRef.substring(0, 20)}%`)
          .eq('acquirer', 'ativus')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (partialData) {
          console.log('[ATIVUS-WEBHOOK] Chargeback - Found by partial externalRef match:', partialData.id);
          transaction = partialData;
        }
      }

      // Generate unique external_id for chargeback
      const chargebackExternalId = `atv_${transactionId || externalRef || Date.now()}`;

      // Check if chargeback already exists
      const { data: existingChargeback } = await supabase
        .from('chargebacks')
        .select('id')
        .eq('external_id', chargebackExternalId)
        .maybeSingle();

      if (existingChargeback) {
        console.log('[ATIVUS-WEBHOOK] Chargeback already registered:', existingChargeback.id);
        return new Response(
          JSON.stringify({ success: true, message: 'Chargeback already registered' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine user_id and final amount
      const userId = transaction?.user_id || null;
      const finalAmount = amount > 0 ? amount : (transaction?.amount || 0);

      if (!userId) {
        console.error('[ATIVUS-WEBHOOK] Cannot register chargeback - user not identified');
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'ativus',
          event_type: 'chargeback_orphan',
          error_message: `Chargeback sem usuário: txid=${transactionId}, externalRef=${externalRef}, amount=${finalAmount}`,
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'User not identified for chargeback' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Register chargeback
      const { data: newChargeback, error: chargebackError } = await supabase
        .from('chargebacks')
        .insert({
          user_id: userId,
          pix_transaction_id: transaction?.id || null,
          external_id: chargebackExternalId,
          amount: finalAmount,
          original_amount: transaction?.amount || null,
          acquirer: 'ativus',
          source: 'webhook',
          status: 'pending',
          reason: `Status: ${status}`,
          client_name: clientName || transaction?.donor_name || null,
          client_document: clientDocument || transaction?.donor_cpf || null,
          client_email: clientEmail || transaction?.donor_email || null,
          detected_at: new Date().toISOString(),
          metadata: {
            original_payload: payload,
            webhook_ip: validation.ip,
            webhook_timestamp: timestamp
          }
        })
        .select()
        .single();

      if (chargebackError) {
        console.error('[ATIVUS-WEBHOOK] Error registering chargeback:', chargebackError);
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'ativus',
          event_type: 'chargeback_error',
          error_message: `Error: ${chargebackError.message}`,
        });
      } else {
        console.log('[ATIVUS-WEBHOOK] Chargeback registered successfully:', newChargeback.id);
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'ativus',
          event_type: 'chargeback_received',
          error_message: JSON.stringify({
            chargeback_id: newChargeback.id,
            amount: finalAmount,
            transaction_id: transaction?.id,
            ip: validation.ip
          }).slice(0, 500),
        });
      }

    } else if (isPaid) {
      console.log('[ATIVUS-WEBHOOK] *** PAYMENT CONFIRMED via webhook! Searching in database ***');
      
      // Try to find the transaction
      let transaction = null;

      // Strategy 1: Search by externalReference (our txid) - MOST RELIABLE
      if (externalRef) {
        const { data: externalRefData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', externalRef)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (externalRefData) {
          console.log('[ATIVUS-WEBHOOK] Found by externalReference:', externalRefData.id);
          transaction = externalRefData;
        }
      }

      // Strategy 2: Search by idtransaction (Ativus internal ID)
      if (!transaction && transactionId) {
        const { data: txidData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('txid', transactionId)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (txidData) {
          console.log('[ATIVUS-WEBHOOK] Found by transactionId:', txidData.id);
          transaction = txidData;
        }
      }

      // Strategy 3: Search by UUID id
      if (!transaction && transactionId) {
        const { data: idData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .eq('id', transactionId)
          .eq('acquirer', 'ativus')
          .maybeSingle();
        
        if (idData) {
          console.log('[ATIVUS-WEBHOOK] Found by id:', idData.id);
          transaction = idData;
        }
      }

      // Strategy 4: Partial txid match using externalRef
      if (!transaction && externalRef && externalRef.length >= 10) {
        const { data: partialData } = await supabase
          .from('pix_transactions')
          .select('id, user_id, txid, status')
          .ilike('txid', `%${externalRef.substring(0, 20)}%`)
          .eq('acquirer', 'ativus')
          .eq('status', 'generated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (partialData) {
          console.log('[ATIVUS-WEBHOOK] Found by partial externalRef match:', partialData.id);
          transaction = partialData;
        }
      }

      if (!transaction) {
        console.error('[ATIVUS-WEBHOOK] Transaction not found. TransactionId:', transactionId, 'ExternalRef:', externalRef);
        
        await supabase.from('api_monitoring_events').insert({
          acquirer: 'ativus',
          event_type: 'failure',
          error_message: `Transaction not found: txid=${transactionId}, externalRef=${externalRef}`,
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found', transactionId, externalRef }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already paid
      if (transaction.status === 'paid') {
        console.log('[ATIVUS-WEBHOOK] Transaction already paid');
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
        console.error('[ATIVUS-WEBHOOK] RPC error:', rpcError);
        
        // Try direct update as fallback
        const { error: directError } = await supabase
          .from('pix_transactions')
          .update({ 
            status: 'paid', 
            paid_at: paidAt || new Date().toISOString(),
            paid_date_brazil: new Date().toISOString().split('T')[0]
          })
          .eq('id', transaction.id);
        
        if (directError) {
          console.error('[ATIVUS-WEBHOOK] Direct update also failed:', directError);
        } else {
          console.log('[ATIVUS-WEBHOOK] Transaction marked as paid via direct update');
        }
      } else {
        console.log('[ATIVUS-WEBHOOK] Transaction marked as paid via RPC');
      }

      // Dispatch webhook to API clients (same as Valorion)
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

          console.log('[ATIVUS-WEBHOOK] Webhook dispatch:', webhookResponse.status);
        } catch (webhookError) {
          console.error('[ATIVUS-WEBHOOK] Webhook dispatch error:', webhookError);
        }
      }

      // Log success event
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'webhook_paid',
        error_message: JSON.stringify({ 
          txid: transaction.txid, 
          id: transaction.id,
          ip: validation.ip
        }).slice(0, 500)
      });

    } else {
      console.log('[ATIVUS-WEBHOOK] Status not paid/chargeback:', status);
      
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'webhook_received',
        error_message: `Status ${status} for id=${transactionId}`,
      });
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
    console.error('[ATIVUS-WEBHOOK] Error:', error);
    
    try {
      await supabase.from('api_monitoring_events').insert({
        acquirer: 'ativus',
        event_type: 'failure',
        error_message: `${error instanceof Error ? error.message : 'Error'} - IP: ${validation.ip}`,
      });
    } catch (logError) {
      console.error('[ATIVUS-WEBHOOK] Log error failed:', logError);
    }
    
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
