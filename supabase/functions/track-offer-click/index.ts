import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { offer_id } = await req.json();

    if (!offer_id) {
      console.error('[track-offer-click] Missing offer_id');
      return new Response(JSON.stringify({ error: 'offer_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[track-offer-click] Tracking click for offer:', offer_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify offer exists
    const { data: offer, error: offerError } = await supabase
      .from('checkout_offers')
      .select('id, click_count')
      .eq('id', offer_id)
      .single();

    if (offerError || !offer) {
      console.error('[track-offer-click] Offer not found:', offer_id, offerError);
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user_id from offer for the click record
    const { data: offerWithUser } = await supabase
      .from('checkout_offers')
      .select('user_id')
      .eq('id', offer_id)
      .single();

    // Increment click_count
    const newCount = (offer.click_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('checkout_offers')
      .update({ click_count: newCount })
      .eq('id', offer_id);

    if (updateError) {
      console.error('[track-offer-click] Failed to update click_count:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update count' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert into offer_clicks for history
    if (offerWithUser?.user_id) {
      const { error: insertError } = await supabase
        .from('offer_clicks')
        .insert({
          offer_id: offer_id,
          user_id: offerWithUser.user_id,
        });

      if (insertError) {
        console.error('[track-offer-click] Failed to insert click record:', insertError);
        // Don't fail the request, click_count was already updated
      }
    }

    console.log('[track-offer-click] Success! New count:', newCount);

    return new Response(JSON.stringify({ 
      success: true, 
      click_count: newCount,
      offer_id: offer_id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[track-offer-click] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
