import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  userId: string;
  userEmail: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userEmail, userName }: ApprovalNotificationRequest = await req.json();
    console.log(`Sending approval notification to: ${userEmail}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get Resend API key from admin_settings first, then fall back to env
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    const { data: apiKeyData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .is("user_id", null)
      .single();

    if (apiKeyData?.value) {
      resendApiKey = apiKeyData.value;
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender email from settings
    let senderEmail = "FurionPay <onboarding@resend.dev>";
    const { data: senderData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "resend_sender_email")
      .is("user_id", null)
      .single();

    if (senderData?.value) {
      senderEmail = `FurionPay <${senderData.value}>`;
    }

    // Get email logo from settings
    let logoUrl = "";
    const { data: logoData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "email_logo_url")
      .is("user_id", null)
      .single();

    if (logoData?.value) {
      logoUrl = logoData.value;
    }

    const resend = new Resend(resendApiKey);
    const displayName = userName || userEmail.split("@")[0];

    const emailResponse = await resend.emails.send({
      from: senderEmail,
      to: [userEmail],
      subject: "🎉 Sua conta foi aprovada - FurionPay",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="FurionPay" style="max-height: 48px; width: auto; margin-bottom: 16px;">` : `<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">FurionPay</h1>`}
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      <div style="text-align: center; margin-bottom: 24px;">
                        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                          <span style="font-size: 32px;">✓</span>
                        </div>
                        <h2 style="margin: 0 0 8px 0; color: #18181b; font-size: 24px; font-weight: 600;">Conta Aprovada!</h2>
                        <p style="margin: 0; color: #71717a; font-size: 16px;">Bem-vindo ao FurionPay, ${displayName}!</p>
                      </div>
                      
                      <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
                        Sua conta foi aprovada por um administrador e agora você tem acesso completo à plataforma FurionPay.
                      </p>
                      
                      <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
                        Você já pode fazer login e começar a utilizar todas as funcionalidades disponíveis.
                      </p>
                      
                      <a href="https://furionpay.com/login" style="display: block; width: 100%; padding: 14px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; text-align: center; font-size: 16px; font-weight: 600; border-radius: 8px; box-sizing: border-box;">
                        Acessar Minha Conta
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #f4f4f5; text-align: center;">
                      <p style="margin: 0; color: #71717a; font-size: 13px;">
                        Este email foi enviado automaticamente pelo sistema FurionPay.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Approval notification sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
