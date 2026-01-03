import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

interface ChargebackPayload {
  external_id: string;
  acquirer: string;
  amount: number;
  original_amount?: number;
  client_name?: string;
  client_document?: string;
  client_email?: string;
  reason?: string;
  transaction_id?: string;
  txid?: string;
  detected_at?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  console.log('[Chargeback Webhook] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = getSupabaseClient();

    // Validate webhook secret (optional but recommended)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('CHARGEBACK_WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.log('[Chargeback Webhook] Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let payload: ChargebackPayload;
    try {
      payload = await req.json();
      console.log('[Chargeback Webhook] Payload received:', JSON.stringify(payload));
    } catch (e) {
      console.error('[Chargeback Webhook] Failed to parse JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!payload.external_id || !payload.amount) {
      console.error('[Chargeback Webhook] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: external_id and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if chargeback already exists
    const { data: existingChargeback } = await supabase
      .from('chargebacks')
      .select('id')
      .eq('external_id', payload.external_id)
      .eq('acquirer', payload.acquirer || 'unknown')
      .maybeSingle();

    if (existingChargeback) {
      console.log('[Chargeback Webhook] Chargeback already exists:', existingChargeback.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Chargeback already registered',
          chargeback_id: existingChargeback.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find the original transaction and user
    let userId: string | null = null;
    let pixTransactionId: string | null = null;

    // Strategy 1: Find by txid
    if (payload.txid) {
      const { data: txByTxid } = await supabase
        .from('pix_transactions')
        .select('id, user_id')
        .eq('txid', payload.txid)
        .maybeSingle();
      
      if (txByTxid) {
        userId = txByTxid.user_id;
        pixTransactionId = txByTxid.id;
        console.log('[Chargeback Webhook] Found transaction by txid:', txByTxid.id);
      }
    }

    // Strategy 2: Find by transaction_id (our internal ID)
    if (!userId && payload.transaction_id) {
      const { data: txById } = await supabase
        .from('pix_transactions')
        .select('id, user_id')
        .eq('id', payload.transaction_id)
        .maybeSingle();
      
      if (txById) {
        userId = txById.user_id;
        pixTransactionId = txById.id;
        console.log('[Chargeback Webhook] Found transaction by id:', txById.id);
      }
    }

    // Strategy 3: Find by external_id in txid (some acquirers use this)
    if (!userId) {
      const { data: txByExternal } = await supabase
        .from('pix_transactions')
        .select('id, user_id')
        .ilike('txid', `%${payload.external_id}%`)
        .maybeSingle();
      
      if (txByExternal) {
        userId = txByExternal.user_id;
        pixTransactionId = txByExternal.id;
        console.log('[Chargeback Webhook] Found transaction by external_id pattern:', txByExternal.id);
      }
    }

    // Strategy 4: Find by amount and client document on same day
    if (!userId && payload.client_document) {
      const detectedAt = payload.detected_at ? new Date(payload.detected_at) : new Date();
      const startOfDay = new Date(detectedAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(detectedAt);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: txByDetails } = await supabase
        .from('pix_transactions')
        .select('id, user_id')
        .eq('donor_cpf', payload.client_document)
        .eq('amount', payload.amount)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .maybeSingle();
      
      if (txByDetails) {
        userId = txByDetails.user_id;
        pixTransactionId = txByDetails.id;
        console.log('[Chargeback Webhook] Found transaction by details:', txByDetails.id);
      }
    }

    if (!userId) {
      console.error('[Chargeback Webhook] Could not find user for chargeback');
      return new Response(
        JSON.stringify({ 
          error: 'Could not identify user for this chargeback',
          hint: 'Please provide transaction_id, txid, or valid client_document and amount'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the chargeback
    const { data: newChargeback, error: insertError } = await supabase
      .from('chargebacks')
      .insert({
        external_id: payload.external_id,
        acquirer: payload.acquirer || 'unknown',
        amount: payload.amount,
        original_amount: payload.original_amount || payload.amount,
        client_name: payload.client_name || null,
        client_document: payload.client_document || null,
        client_email: payload.client_email || null,
        reason: payload.reason || null,
        pix_transaction_id: pixTransactionId,
        user_id: userId,
        source: 'webhook',
        status: 'pending',
        detected_at: payload.detected_at || new Date().toISOString(),
        metadata: payload.metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Chargeback Webhook] Failed to insert chargeback:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to register chargeback', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Chargeback Webhook] Chargeback registered successfully:', newChargeback.id);

    // Log the event
    await supabase.from('api_monitoring_events').insert({
      acquirer: payload.acquirer || 'unknown',
      event_type: 'chargeback_received',
      response_time_ms: 0,
      error_message: null
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Chargeback registered successfully',
        chargeback_id: newChargeback.id,
        user_id: userId,
        transaction_id: pixTransactionId
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Chargeback Webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
