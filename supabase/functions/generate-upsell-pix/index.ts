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
    const { originalTransactionId, upsellId } = await req.json();

    if (!originalTransactionId || !upsellId) {
      return new Response(
        JSON.stringify({ error: "originalTransactionId and upsellId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Upsell PIX] Starting for transaction ${originalTransactionId}, upsell ${upsellId}`);

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

    // Fetch upsell configuration
    const { data: upsell, error: upsellError } = await supabase
      .from("product_upsells")
      .select(`
        *,
        upsell_product:products!upsell_product_id(id, name, price, image_url)
      `)
      .eq("id", upsellId)
      .single();

    if (upsellError || !upsell) {
      console.error("[Upsell PIX] Upsell not found:", upsellError);
      return new Response(
        JSON.stringify({ error: "Upsell configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Upsell PIX] Generating PIX for ${upsell.upsell_product?.name} - ${upsell.upsell_price}`);

    // Get fee config for the user
    const { data: feeConfig } = await supabase
      .from("fee_configs")
      .select("pix_percentage, pix_fixed")
      .eq("is_default", true)
      .single();

    const feePercentage = feeConfig?.pix_percentage ?? 6.99;
    const feeFixed = feeConfig?.pix_fixed ?? 2.49;

    // Generate PIX via the existing generate-pix function logic
    // We'll call the generate-pix function with the customer data from original transaction
    const generatePixResponse = await supabase.functions.invoke("generate-pix", {
      body: {
        amount: upsell.upsell_price,
        userId: originalTx.user_id,
        productName: `Upsell: ${upsell.upsell_product?.name || 'Produto'}`,
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

    // Create upsell_transaction record
    const { error: upsellTxError } = await supabase
      .from("upsell_transactions")
      .insert({
        original_transaction_id: originalTransactionId,
        upsell_id: upsellId,
        upsell_transaction_id: pixData.transactionId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });

    if (upsellTxError) {
      console.error("[Upsell PIX] Error creating upsell transaction record:", upsellTxError);
      // Don't fail the request, just log
    }

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