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

    // If productId is provided, return ONLY product-specific pixels (no fallback to global)
    if (productId) {
      const { data: productConfig, error: configError } = await supabase
        .from('product_checkout_configs')
        .select('product_pixels')
        .eq('product_id', productId)
        .single();

      if (!configError && productConfig?.product_pixels && Array.isArray(productConfig.product_pixels) && productConfig.product_pixels.length > 0) {
        console.log('Using product-specific pixels:', productConfig.product_pixels.length);
        return new Response(
          JSON.stringify({ pixels: productConfig.product_pixels }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Product has no specific pixels configured - return empty array (no fallback)
      console.log('Product has no specific pixels configured, returning empty');
      return new Response(
        JSON.stringify({ pixels: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For popups (no productId), use global pixels
    const globalPixels = await getGlobalPixels(supabase, userId);
    console.log('Returning global pixels for popup:', globalPixels.length);
    return new Response(
      JSON.stringify({ pixels: globalPixels }),
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

async function getGlobalPixels(supabase: any, userId: string | null): Promise<any[]> {
  let query = supabase
    .from('admin_settings')
    .select('key, value')
    .eq('key', 'meta_pixels');

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  // Use maybeSingle to avoid error when no record exists
  const { data: multiplePixels, error: multiError } = await query.maybeSingle();

  console.log('getGlobalPixels - userId:', userId, 'data:', multiplePixels, 'error:', multiError);

  if (!multiError && multiplePixels?.value) {
    try {
      // Handle value as either string OR already-parsed JSON
      let parsed: any;
      const valueType = typeof multiplePixels.value;
      console.log('meta_pixels value type:', valueType);
      
      if (valueType === 'string') {
        parsed = JSON.parse(multiplePixels.value);
      } else if (Array.isArray(multiplePixels.value)) {
        parsed = multiplePixels.value;
      } else if (valueType === 'object') {
        // If it's an object but not array, wrap it
        parsed = [multiplePixels.value];
      } else {
        console.error('Unexpected value type for meta_pixels:', valueType);
        return [];
      }
      
      console.log('Parsed pixels count:', Array.isArray(parsed) ? parsed.length : 0);
      
      if (Array.isArray(parsed)) {
        return parsed.map((pixel: any) => ({
          id: pixel.id || pixel.pixelId,
          pixelId: pixel.pixelId,
          name: pixel.name,
          accessToken: pixel.accessToken || null,
        }));
      }
    } catch (parseError) {
      console.error('Error parsing meta_pixels JSON:', parseError, 'raw value:', multiplePixels.value);
    }
  }

  return [];
}
