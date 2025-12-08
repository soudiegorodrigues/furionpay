import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyUnlockRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyUnlockRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the code
    const { data: codeData, error: codeError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !codeData) {
      console.log("Invalid or expired code for", email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Código inválido ou expirado" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as used
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', codeData.id);

    // Reset login attempts
    const { error: resetError } = await supabase.rpc('reset_login_attempts', {
      p_email: email
    });

    if (resetError) {
      console.error("Error resetting login attempts:", resetError);
    }

    console.log("Account unlocked successfully for", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conta desbloqueada com sucesso. Você pode fazer login novamente." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-unlock-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
