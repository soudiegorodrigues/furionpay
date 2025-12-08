import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API key
    const resendApiKey = await getResendApiKey(supabase);
    if (!resendApiKey) {
      console.error("Resend API key not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar usuário" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userExists) {
      // For security, don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um código" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing codes for this email
    await supabase
      .from("password_reset_codes")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new code
    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email.toLowerCase(),
        code: code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      });

    if (insertError) {
      console.error("Error inserting code:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with code
    const emailResponse = await resend.emails.send({
      from: "Recuperação de Senha <onboarding@resend.dev>",
      to: [email],
      subject: "Seu código de recuperação de senha",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">🔐</span>
              </div>
              <h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0;">Recuperação de Senha</h1>
            </div>
            
            <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
              Use o código abaixo para recuperar sua senha. Este código expira em 15 minutos.
            </p>
            
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Seu código de verificação:</p>
              <p style="color: #059669; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 0;">
              Se você não solicitou a recuperação de senha, ignore este email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
