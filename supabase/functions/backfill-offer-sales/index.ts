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
    const { offerId } = await req.json();

    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'offerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('checkout_offers')
      .select('id, user_id, popup_model, product_name, created_at')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ error: 'Offer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Backfilling offer:', offer);

    // Update transactions that match the offer criteria and have null offer_id
    const { data: updated, error: updateError } = await supabase
      .from('pix_transactions')
      .update({ offer_id: offerId })
      .is('offer_id', null)
      .eq('user_id', offer.user_id)
      .eq('popup_model', offer.popup_model)
      .gte('created_at', offer.created_at)
      .select('id');

    if (updateError) {
      console.error('Error updating transactions:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const count = updated?.length || 0;
    console.log(`Backfilled ${count} transactions for offer ${offerId}`);

    return new Response(
      JSON.stringify({ success: true, updated: count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
