import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalTransactionId, stepId } = await req.json();

    if (!originalTransactionId || !stepId) {
      return new Response(
        JSON.stringify({ error: "originalTransactionId and stepId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Upsell PIX] Starting for transaction ${originalTransactionId}, step ${stepId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch original transaction data
    const { data: originalTx, error: txError } = await supabase
      .from("pix_transactions")
      .select("*")
      .eq("id", originalTransactionId)
      .single();

    if (txError || !originalTx) {
      console.error("[Upsell PIX] Original transaction not found:", txError);
      return new Response(
        JSON.stringify({ error: "Original transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch funnel step with product data
    const { data: step, error: stepError } = await supabase
      .from("funnel_steps")
      .select(`
        id, funnel_id, offer_price, offer_product_id,
        offer_product:products!offer_product_id(id, name, price, image_url)
      `)
      .eq("id", stepId)
      .single();

    if (stepError || !step) {
      console.error("[Upsell PIX] Funnel step not found:", stepError);
      return new Response(
        JSON.stringify({ error: "Funnel step not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the price - use offer_price if set, otherwise product price
    const offerProduct = Array.isArray(step.offer_product) ? step.offer_product[0] : step.offer_product;
    const offerPrice = step.offer_price || offerProduct?.price || 0;
    const productName = offerProduct?.name || 'Produto';

    console.log(`[Upsell PIX] Generating PIX for ${productName} - R$ ${offerPrice}`);

    // Get fee config for the user
    const { data: feeConfig } = await supabase
      .from("fee_configs")
      .select("pix_percentage, pix_fixed")
      .eq("is_default", true)
      .single();

    const feePercentage = feeConfig?.pix_percentage ?? 6.99;
    const feeFixed = feeConfig?.pix_fixed ?? 2.49;

    // Generate PIX via the existing generate-pix function logic
    const generatePixResponse = await supabase.functions.invoke("generate-pix", {
      body: {
        amount: offerPrice,
        userId: originalTx.user_id,
        productName: `Upsell: ${productName}`,
        donorName: originalTx.donor_name,
        donorEmail: originalTx.donor_email,
        donorPhone: originalTx.donor_phone,
        donorCpf: originalTx.donor_cpf,
        // Reuse address if available
        donorCep: originalTx.donor_cep,
        donorStreet: originalTx.donor_street,
        donorNumber: originalTx.donor_number,
        donorComplement: originalTx.donor_complement,
        donorNeighborhood: originalTx.donor_neighborhood,
        donorCity: originalTx.donor_city,
        donorState: originalTx.donor_state,
        // Fees
        feePercentage,
        feeFixed,
        // Mark as upsell
        isUpsell: true,
      },
    });

    if (generatePixResponse.error) {
      console.error("[Upsell PIX] Error generating PIX:", generatePixResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to generate PIX" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pixData = generatePixResponse.data;
    console.log(`[Upsell PIX] PIX generated successfully: ${pixData.transactionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: pixData.pixCode,
        qrCode: pixData.qrCode,
        transactionId: pixData.transactionId,
        txid: pixData.txid,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    console.error("[Upsell PIX] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
