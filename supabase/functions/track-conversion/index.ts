import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      pixelId, 
      accessToken, 
      eventName = 'Purchase',
      eventId,
      value, 
      currency = 'BRL',
      transactionId,
      customerEmail,
      customerName,
      productName,
      userAgent,
      sourceUrl,
      fbc,
      fbp,
    } = body;

    console.log('[CAPI] 📤 Enviando evento para Meta CAPI:', {
      pixelId,
      eventName,
      eventId,
      value,
      transactionId,
      hasAccessToken: !!accessToken,
    });

    // Validate required fields
    if (!pixelId) {
      console.error('[CAPI] ❌ Pixel ID não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'Pixel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessToken) {
      console.error('[CAPI] ❌ Access Token não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'Access Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build user data with hashing
    const hashData = async (data: string | undefined) => {
      if (!data) return undefined;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Parse customer name
    const [firstName, ...lastNameParts] = (customerName || '').split(' ');
    const lastName = lastNameParts.join(' ');

    // Hash PII data
    const hashedEmail = await hashData(customerEmail);
    const hashedFirstName = await hashData(firstName);
    const hashedLastName = await hashData(lastName);

    // Build user_data object - NO client_user_agent or client_ip_address (blocked by Meta 2026)
    const userData: Record<string, any> = {
      country: ['br'],
    };

    if (hashedEmail) userData.em = [hashedEmail];
    if (hashedFirstName) userData.fn = [hashedFirstName];
    if (hashedLastName) userData.ln = [hashedLastName];
    if (transactionId) userData.external_id = [transactionId];
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    // Build event payload
    const eventData: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: userData,
    };

    // Add event_id for deduplication with browser pixel
    if (eventId) {
      eventData.event_id = eventId;
    }

    // Add event_source_url if provided
    if (sourceUrl) {
      eventData.event_source_url = sourceUrl;
    }

    // Add custom_data for all conversion events (Purchase, InitiateCheckout, ViewContent, etc.)
    if (value !== undefined) {
      eventData.custom_data = {
        value: value,
        currency: currency,
        content_name: productName || 'Produto',
        content_type: 'product',
        ...(transactionId && { order_id: transactionId }),
      };
    }

    // Send to Meta Conversions API - Updated to v20.0 for Meta 2026 policies
    const capiUrl = `https://graph.facebook.com/v20.0/${pixelId}/events`;
    
    const capiPayload = {
      data: [eventData],
      access_token: accessToken,
    };

    console.log('[CAPI] 📡 Enviando para:', capiUrl);
    console.log('[CAPI] 📦 Payload:', JSON.stringify(capiPayload, null, 2));

    const response = await fetch(capiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(capiPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[CAPI] ❌ Erro da API Meta:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: responseData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CAPI] ✅ Evento enviado com sucesso:', responseData);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAPI] ❌ Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
