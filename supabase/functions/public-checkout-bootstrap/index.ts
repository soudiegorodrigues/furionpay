import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OfferResponse {
  offer: {
    id: string;
    product_id: string;
    name: string;
    type: string;
    domain: string | null;
    price: number;
    offer_code: string | null;
    upsell_url: string | null;
    downsell_url: string | null;
    crosssell_url: string | null;
  };
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    product_code: string | null;
  };
  config: any;
  testimonials: any[];
  orderBumps: any[];
  banners: any[];
  pixelConfig: { pixelId?: string; accessToken?: string };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerCode } = await req.json();

    if (!offerCode) {
      console.log("[Bootstrap] No offerCode provided");
      return new Response(
        JSON.stringify({ error: "offerCode is required", code: "MISSING_OFFER_CODE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Bootstrap] Looking up offer:", offerCode);

    // Use service role for secure access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Find the offer by offer_code
    const { data: offerData, error: offerError } = await supabase
      .from("product_offers")
      .select(`
        id,
        product_id,
        name,
        type,
        domain,
        price,
        offer_code,
        is_active,
        user_id,
        upsell_url,
        downsell_url,
        crosssell_url
      `)
      .eq("offer_code", offerCode)
      .eq("is_active", true)
      .maybeSingle();

    if (offerError) {
      console.error("[Bootstrap] Error fetching offer:", offerError);
      return new Response(
        JSON.stringify({ error: "Database error", code: "DB_ERROR", details: offerError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!offerData) {
      console.log("[Bootstrap] Offer not found:", offerCode);
      return new Response(
        JSON.stringify({ error: "Offer not found", code: "OFFER_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Bootstrap] Found offer:", offerData.id);

    // Step 2: Get product
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, name, description, image_url, price, product_code, is_active")
      .eq("id", offerData.product_id)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !productData) {
      console.error("[Bootstrap] Product not found or inactive:", productError);
      return new Response(
        JSON.stringify({ error: "Product not found or inactive", code: "PRODUCT_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Bootstrap] Found product:", productData.id);

    // Step 3: Fetch config, testimonials, order bumps, and banners in parallel
    const [configResult, testimonialsResult, orderBumpsResult, bannersResult] = await Promise.all([
      supabase
        .from("product_checkout_configs")
        .select("*")
        .eq("product_id", offerData.product_id)
        .maybeSingle(),
      supabase
        .from("product_testimonials")
        .select("id, author_name, author_photo_url, rating, content")
        .eq("product_id", offerData.product_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("product_order_bumps")
        .select(`
          id,
          title,
          description,
          bump_price,
          image_url,
          bump_product_id
        `)
        .eq("product_id", offerData.product_id)
        .eq("is_active", true)
        .order("position", { ascending: true }),
      supabase
        .from("checkout_banners")
        .select("id, image_url, display_order")
        .eq("product_id", offerData.product_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ]);

    const config = configResult.data || null;
    const testimonials = testimonialsResult.data || [];
    const banners = bannersResult.data || [];

    // Process order bumps (fetch bump product names if needed)
    let orderBumps: any[] = [];
    if (orderBumpsResult.data && orderBumpsResult.data.length > 0) {
      const bumpProductIds = orderBumpsResult.data
        .map((b: any) => b.bump_product_id)
        .filter(Boolean);
      
      let bumpProducts: Record<string, any> = {};
      if (bumpProductIds.length > 0) {
        const { data: bumpProductsData } = await supabase
          .from("products")
          .select("id, name, image_url")
          .in("id", bumpProductIds);
        
        bumpProducts = (bumpProductsData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      orderBumps = orderBumpsResult.data.map((bump: any) => ({
        id: bump.id,
        title: bump.title,
        description: bump.description,
        bump_price: bump.bump_price,
        image_url: bump.image_url,
        bump_product: bump.bump_product_id && bumpProducts[bump.bump_product_id]
          ? {
              id: bump.bump_product_id,
              name: bumpProducts[bump.bump_product_id].name,
              image_url: bumpProducts[bump.bump_product_id].image_url,
            }
          : null,
      }));
    }

    // Step 4: Get pixel config if user_id is available
    let pixelConfig: { pixelId?: string; accessToken?: string } = {};
    if (config?.user_id) {
      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("user_id", config.user_id)
        .eq("key", "meta_pixels")
        .maybeSingle();

      if (settingsData?.value) {
        try {
          const pixels = JSON.parse(settingsData.value);
          if (Array.isArray(pixels) && pixels.length > 0) {
            // Check for product-specific pixels first
            const selectedPixelIds = config.selected_pixel_ids || [];
            let selectedPixel = null;
            
            if (selectedPixelIds.length > 0) {
              selectedPixel = pixels.find((p: any) => selectedPixelIds.includes(p.id));
            }
            
            if (!selectedPixel) {
              selectedPixel = pixels[0];
            }
            
            if (selectedPixel) {
              pixelConfig = {
                pixelId: selectedPixel.pixelId,
                accessToken: selectedPixel.accessToken || undefined,
              };
            }
          }
        } catch (e) {
          console.error("[Bootstrap] Error parsing meta_pixels:", e);
        }
      }
    }

    // Build response (strip sensitive data like user_id from offer)
    const response: OfferResponse = {
      offer: {
        id: offerData.id,
        product_id: offerData.product_id,
        name: offerData.name,
        type: offerData.type,
        domain: offerData.domain,
        price: offerData.price,
        offer_code: offerData.offer_code,
        upsell_url: offerData.upsell_url,
        downsell_url: offerData.downsell_url,
        crosssell_url: offerData.crosssell_url,
      },
      product: {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        image_url: productData.image_url,
        price: productData.price,
        product_code: productData.product_code,
      },
      config,
      testimonials,
      orderBumps,
      banners,
      pixelConfig,
    };

    console.log("[Bootstrap] Success - returning data for offer:", offerData.id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Bootstrap] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
