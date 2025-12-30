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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get userId and productId from request body
    let userId: string | null = null;
    let productId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId || null;
      productId = body?.productId || null;
    } catch {
      // No body or invalid JSON
    }

    console.log('Received userId:', userId, 'productId:', productId);

    // Step 1: Get all global pixels for the user
    let globalPixels: any[] = [];
    
    let query = supabase
      .from('admin_settings')
      .select('key, value')
      .eq('key', 'meta_pixels');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data: multiplePixels, error: multiError } = await query.single();

    if (!multiError && multiplePixels?.value) {
      try {
        const parsed = JSON.parse(multiplePixels.value);
        if (Array.isArray(parsed)) {
          globalPixels = parsed.map((pixel: any) => ({
            id: pixel.id || pixel.pixelId,
            pixelId: pixel.pixelId,
            name: pixel.name,
            accessToken: pixel.accessToken || null,
          }));
        }
      } catch (parseError) {
        console.error('Error parsing meta_pixels JSON:', parseError);
      }
    }

    // Step 2: If productId is provided, check for product-specific pixel selection
    if (productId && globalPixels.length > 0) {
      const { data: productConfig, error: configError } = await supabase
        .from('product_checkout_configs')
        .select('selected_pixel_ids')
        .eq('product_id', productId)
        .single();

      if (!configError && productConfig?.selected_pixel_ids && productConfig.selected_pixel_ids.length > 0) {
        // Filter to only selected pixels
        const selectedIds = productConfig.selected_pixel_ids;
        const filteredPixels = globalPixels.filter(p => 
          selectedIds.includes(p.id) || selectedIds.includes(p.pixelId)
        );
        
        console.log('Using product-specific pixels:', filteredPixels.length);
        
        if (filteredPixels.length > 0) {
          return new Response(
            JSON.stringify({ pixels: filteredPixels }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Step 3: Return all global pixels (fallback)
    if (globalPixels.length > 0) {
      console.log('Returning all global pixels:', globalPixels.length);
      return new Response(
        JSON.stringify({ pixels: globalPixels }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to legacy single pixel format
    let legacyQuery = supabase
      .from('admin_settings')
      .select('key, value')
      .eq('key', 'meta_pixel_id');

    if (userId) {
      legacyQuery = legacyQuery.eq('user_id', userId);
    } else {
      legacyQuery = legacyQuery.is('user_id', null);
    }

    const { data, error } = await legacyQuery.single();

    if (error || !data?.value) {
      console.log('No pixel config found');
      return new Response(
        JSON.stringify({ pixels: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return legacy pixel in new format
    console.log('Returning legacy pixel:', data.value);
    return new Response(
      JSON.stringify({ pixels: [{ pixelId: data.value }] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', pixels: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
