import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get userId from request body if provided
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.userId || null;
    } catch {
      // No body or invalid JSON, use default
    }

    let query = supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["popup_model", "social_proof_enabled"]);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching settings:", error);
      return new Response(
        JSON.stringify({ model: "boost", socialProofEnabled: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let model = "boost";
    let socialProofEnabled = false;

    if (data) {
      for (const item of data) {
        if (item.key === "popup_model") {
          model = item.value || "boost";
        } else if (item.key === "social_proof_enabled") {
          socialProofEnabled = item.value === "true";
        }
      }
    }

    return new Response(
      JSON.stringify({ model, socialProofEnabled }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ model: "boost", socialProofEnabled: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});