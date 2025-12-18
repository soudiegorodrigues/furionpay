import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationNotificationRequest {
  userId: string;
  userEmail: string;
  status: "approved" | "rejected";
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { userId, userEmail, status, reason }: VerificationNotificationRequest = await req.json();
    
    console.log(`[START] Sending document verification notification to ${userEmail}, status: ${status}`);

    if (!userId || !userEmail || !status) {
      throw new Error("Missing required fields: userId, userEmail, or status");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all settings in parallel for better performance
    console.log(`[${Date.now() - startTime}ms] Fetching settings in parallel...`);
    
    const [apiKeyResult, senderResult, logoResult] = await Promise.all([
      supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "resend_api_key")
        .is("user_id", null)
        .single(),
      supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "resend_sender_email")
        .is("user_id", null)
        .single(),
      supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "email_logo_url")
        .is("user_id", null)
        .single()
    ]);

    console.log(`[${Date.now() - startTime}ms] Settings fetched`);

    // Get Resend API key
    let resendApiKey = apiKeyResult.data?.value || Deno.env.get("RESEND_API_KEY") || null;
    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    // Get sender email
    const senderEmail = senderResult.data?.value || "noreply@resend.dev";

    // Get logo URL
    const logoUrl = logoResult.data?.value || "";

    const resend = new Resend(resendApiKey);

    const isApproved = status === "approved";
    const subject = isApproved 
      ? "✅ Seus documentos foram aprovados!" 
      : "❌ Verificação de documentos rejeitada";

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="FurionPay" style="max-height: 70px; width: auto;" />`
      : `<div style="font-size: 32px; font-weight: 700; color: #dc2626;">FurionPay</div>`;

    const htmlContent = isApproved
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #ffffff;">
          <div style="max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <!-- Logo -->
            <div style="text-align: left; margin-bottom: 24px;">
              ${logoHtml}
            </div>
            
            <!-- Subtitle -->
            <h2 style="font-size: 28px; font-weight: 700; color: #000000; margin: 0 0 32px 0; line-height: 1.2;">
              Seus documentos<br/>foram aprovados!
            </h2>
            
            <!-- Green Checkmark Circle -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; display: inline-block; line-height: 80px; text-align: center;">
                <span style="font-size: 40px; color: #ffffff;">✓</span>
              </div>
            </div>
            
            <!-- Title -->
            <h1 style="color: #10b981; font-size: 26px; font-weight: 700; text-align: center; margin: 0 0 32px 0;">
              Documentos Aprovados!
            </h1>
            
            <!-- Content -->
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Olá,
            </p>
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Temos o prazer de informar que seus documentos foram <span style="color: #10b981; font-weight: 600;">verificados</span> e <span style="color: #10b981; font-weight: 600;">aprovados</span>!
            </p>
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
              Agora você tem acesso completo a todas as funcionalidades da plataforma.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="https://www.furionpay.com/login" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Acessar Plataforma
              </a>
            </div>
            
            <!-- Footer -->
            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              ${logoHtml}
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px;">✗</span>
                </div>
                <h1 style="color: #ef4444; font-size: 24px; margin: 0;">Verificação Rejeitada</h1>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Olá,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Infelizmente sua verificação de documentos foi <strong style="color: #ef4444;">rejeitada</strong>.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                  <strong>Motivo:</strong> ${reason || "Não especificado"}
                </p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Por favor, acesse a plataforma e reenvie seus documentos corrigindo o problema indicado.
              </p>
              <div style="text-align: center;">
                <a href="${supabaseUrl.replace('.supabase.co', '')}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Reenviar Documentos
                </a>
              </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </body>
        </html>
      `;

    console.log(`[${Date.now() - startTime}ms] Sending email...`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `FurionPay <${senderEmail}>`,
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error(`[${Date.now() - startTime}ms] Error sending email:`, emailError);
      throw emailError;
    }

    console.log(`[${Date.now() - startTime}ms] Email sent successfully:`, emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id, duration: Date.now() - startTime }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error(`[${Date.now() - startTime}ms] Error in send-document-verification-notification:`, error);
    return new Response(
      JSON.stringify({ error: error.message, duration: Date.now() - startTime }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
