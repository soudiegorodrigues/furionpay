import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckLoginRequest {
  email: string;
  loginFailed: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, loginFailed }: CheckLoginRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email is already blocked
    const { data: blockStatus, error: blockError } = await supabase.rpc('check_login_blocked', {
      p_email: email
    });

    if (blockError) {
      console.error("Error checking block status:", blockError);
      throw blockError;
    }

    console.log("Block status for", email, ":", blockStatus);

    // If already blocked, return blocked status
    if (blockStatus?.is_blocked) {
      return new Response(
        JSON.stringify({ 
          isBlocked: true, 
          attemptCount: blockStatus.attempt_count,
          message: "Conta bloqueada. Um código de desbloqueio foi enviado para seu email."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If login failed, increment attempt counter
    if (loginFailed) {
      const { data: attemptResult, error: attemptError } = await supabase.rpc('increment_login_attempt', {
        p_email: email
      });

      if (attemptError) {
        console.error("Error incrementing login attempt:", attemptError);
        throw attemptError;
      }

      console.log("Attempt result for", email, ":", attemptResult);

      // If should send code (just got blocked after 3rd attempt)
      if (attemptResult?.should_send_code) {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          // Generate unlock code
          const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Store unlock code in password_reset_codes table (reusing for unlock)
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          
          // Delete any existing codes for this email
          await supabase
            .from('password_reset_codes')
            .delete()
            .eq('email', email);
          
          // Insert new code
          const { error: insertError } = await supabase
            .from('password_reset_codes')
            .insert({
              email,
              code: unlockCode,
              expires_at: expiresAt.toISOString(),
              used: false
            });

          if (insertError) {
            console.error("Error storing unlock code:", insertError);
          } else {
            // Send email with unlock code
            try {
              await resend.emails.send({
                from: "FurionPay <onboarding@resend.dev>",
                to: [email],
                subject: "Código de Desbloqueio - FurionPay",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #ef4444; text-align: center;">FurionPay</h1>
                    <h2 style="color: #333;">Sua conta foi bloqueada temporariamente</h2>
                    <p>Detectamos múltiplas tentativas de login incorretas na sua conta.</p>
                    <p>Para desbloquear sua conta, use o código abaixo:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                      <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ef4444;">${unlockCode}</code>
                    </div>
                    <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
                    <p style="color: #666; font-size: 14px;">Se você não tentou fazer login, recomendamos alterar sua senha imediatamente.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">FurionPay - Pagamentos Seguros</p>
                  </div>
                `,
              });
              console.log("Unlock email sent to", email);
            } catch (emailError) {
              console.error("Error sending unlock email:", emailError);
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            isBlocked: true, 
            attemptCount: attemptResult.attempt_count,
            message: "Conta bloqueada após 3 tentativas incorretas. Um código de desbloqueio foi enviado para seu email."
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Not blocked yet, return remaining attempts
      const remainingAttempts = 3 - attemptResult.attempt_count;
      return new Response(
        JSON.stringify({ 
          isBlocked: false, 
          attemptCount: attemptResult.attempt_count,
          remainingAttempts,
          message: remainingAttempts > 0 
            ? `Senha incorreta. ${remainingAttempts} tentativa(s) restante(s).`
            : "Senha incorreta."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Just checking status, not a failed login
    return new Response(
      JSON.stringify({ 
        isBlocked: false, 
        attemptCount: blockStatus?.attempt_count || 0
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in check-login-attempt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
