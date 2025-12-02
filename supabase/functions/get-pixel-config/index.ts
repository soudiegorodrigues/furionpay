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

    // Try to get multiple pixels first (new format)
    const { data: multiplePixels, error: multiError } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('key', 'meta_pixels')
      .single();

    if (!multiError && multiplePixels?.value) {
      try {
        const pixelsArray = JSON.parse(multiplePixels.value);
        if (Array.isArray(pixelsArray) && pixelsArray.length > 0) {
          console.log('Returning multiple pixels:', pixelsArray);
          return new Response(
            JSON.stringify({ pixels: pixelsArray }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (parseError) {
        console.error('Error parsing meta_pixels JSON:', parseError);
      }
    }

    // Fallback to legacy single pixel format
    const { data, error } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('key', 'meta_pixel_id')
      .single();

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
