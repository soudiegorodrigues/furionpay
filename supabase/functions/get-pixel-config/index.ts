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

    // Get userId from request body
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId || null;
    } catch {
      // No body or invalid JSON
    }

    console.log('Received userId:', userId);

    // Query based on whether we have a userId
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

    console.log('Pixel config query result:', multiplePixels, multiError);

    if (!multiError && multiplePixels?.value) {
      try {
        const pixelsArray = JSON.parse(multiplePixels.value);
        if (Array.isArray(pixelsArray) && pixelsArray.length > 0) {
          // Ensure accessToken is included for CAPI support
          const pixelsWithTokens = pixelsArray.map((pixel: any) => ({
            pixelId: pixel.pixelId,
            name: pixel.name,
            accessToken: pixel.accessToken || null, // Include token for CAPI
          }));
          console.log('Returning multiple pixels with tokens:', pixelsWithTokens.map((p: any) => ({
            ...p,
            accessToken: p.accessToken ? '***MASKED***' : null
          })));
          return new Response(
            JSON.stringify({ pixels: pixelsWithTokens }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (parseError) {
        console.error('Error parsing meta_pixels JSON:', parseError);
      }
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
