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

const getResendApiKey = async (supabase: any): Promise<string | null> => {
  // First try to get from admin_settings table
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "resend_api_key")
    .limit(1)
    .maybeSingle();

  if (!error && data?.value) {
    console.log("Using Resend API key from admin_settings");
    return data.value;
  }

  // Fallback to environment variable
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) {
    console.log("Using Resend API key from environment");
    return envKey;
  }

  return null;
};

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
        const resendApiKey = await getResendApiKey(supabase);
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
            // Get sender email from settings (global) or use a safe default
            const { data: senderData } = await supabase
              .from("admin_settings")
              .select("value")
              .eq("key", "resend_sender_email")
              .is("user_id", null)
              .limit(1)
              .maybeSingle();

            const senderEmail = senderData?.value || "onboarding@resend.dev";

            // Get logo URL from settings (global)
            const { data: logoData } = await supabase
              .from("admin_settings")
              .select("value")
              .eq("key", "email_logo_url")
              .is("user_id", null)
              .limit(1)
              .maybeSingle();

            const logoUrl = logoData?.value;

            // Build logo HTML
            const logoHtml = logoUrl
              ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; width: auto; display: block; margin: 0 auto 16px;" />`
              : `<h1 style="color: #ef4444; text-align: center; margin-bottom: 16px;">FurionPay</h1>`;

            // Send email with unlock code
            try {
              const sendEmail = async (from: string) => {
                const res = await resend.emails.send({
                  from,
                  to: [email],
                  subject: "Código de Desbloqueio - FurionPay",
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
                      <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 24px;">
                          ${logoHtml}
                        </div>
                        <h2 style="color: #1e293b; text-align: center; font-size: 20px; margin-bottom: 16px;">Sua conta foi bloqueada temporariamente</h2>
                        <p style="color: #64748b; text-align: center; margin-bottom: 24px;">Detectamos múltiplas tentativas de login incorretas na sua conta. Para desbloquear, use o código abaixo:</p>
                        <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #ef4444; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                          <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Seu código de desbloqueio:</p>
                          <p style="color: #dc2626; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${unlockCode}</p>
                        </div>
                        <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 8px;">Este código expira em 15 minutos.</p>
                        <p style="color: #94a3b8; font-size: 14px; text-align: center;">Se você não tentou fazer login, recomendamos alterar sua senha imediatamente.</p>
                      </div>
                    </body>
                    </html>
                  `,
                });
                return res as any;
              };

              const primaryFrom = `FurionPay <${senderEmail}>`;
              const fallbackFrom = "FurionPay <onboarding@resend.dev>";

              let sendRes = await sendEmail(primaryFrom);
              if (sendRes?.error) {
                console.error("Error sending unlock email (primary sender):", sendRes.error);
                sendRes = await sendEmail(fallbackFrom);
              }

              if (sendRes?.error) {
                console.error("Error sending unlock email (fallback sender):", sendRes.error);
                throw new Error("Falha ao enviar email de desbloqueio");
              }

              console.log("Unlock email sent to", email);
            } catch (emailError) {
              console.error("Error sending unlock email:", emailError);
            }
          }
        } else {
          console.error("Resend API key not configured");
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
