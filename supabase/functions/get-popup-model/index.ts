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
      console.log("Received userId:", userId);
    } catch {
      console.log("No body or invalid JSON");
    }

    let model = "boost";
    let socialProofEnabled = false;

    // First try to get user-specific settings
    if (userId) {
      const { data: userSettings, error: userError } = await supabase
        .from("admin_settings")
        .select("key, value")
        .eq("user_id", userId)
        .in("key", ["popup_model", "social_proof_enabled"]);

      console.log("User settings query result:", userSettings, userError);

      if (userSettings && userSettings.length > 0) {
        for (const item of userSettings) {
          if (item.key === "popup_model") {
            model = item.value || "boost";
          } else if (item.key === "social_proof_enabled") {
            socialProofEnabled = item.value === "true";
          }
        }
        console.log("Using user-specific settings:", { model, socialProofEnabled });
        return new Response(
          JSON.stringify({ model, socialProofEnabled }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fall back to global settings (those without user_id)
    const { data: globalSettings, error: globalError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .is("user_id", null)
      .in("key", ["popup_model", "social_proof_enabled"]);

    console.log("Global settings query result:", globalSettings, globalError);

    if (globalSettings && globalSettings.length > 0) {
      for (const item of globalSettings) {
        if (item.key === "popup_model") {
          model = item.value || "boost";
        } else if (item.key === "social_proof_enabled") {
          socialProofEnabled = item.value === "true";
        }
      }
    }

    console.log("Final settings:", { model, socialProofEnabled });

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