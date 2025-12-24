import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryRequest {
  transactionId: string;
  txid: string;
  customerEmail: string;
  customerName: string;
  productName: string;
  amount: number;
  deliveryLink?: string;
  deliveryFileUrl?: string;
  userId: string;
}

function generateEmailHtml(
  customerName: string,
  productName: string,
  amount: number,
  downloadLink: string
): string {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu produto está pronto!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Pagamento Confirmado!</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Olá <strong>${customerName || 'Cliente'}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Seu pagamento de <strong>${formattedAmount}</strong> foi confirmado com sucesso! Aqui está seu acesso ao produto:
              </p>
              
              <!-- Product Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 20px;">
                      ${productName}
                    </h2>
                    <a href="${downloadLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                      📥 Acessar Produto
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
                <strong>Dica:</strong> Salve este email para acessar seu produto sempre que precisar.
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 8px 0 0;">
                ${downloadLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Obrigado pela sua compra! 💚
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload: DeliveryRequest = await req.json();
    const { 
      transactionId, 
      txid,
      customerEmail, 
      customerName, 
      productName, 
      amount,
      deliveryLink, 
      deliveryFileUrl,
      userId 
    } = payload;

    console.log("[DELIVERY] Starting product delivery for:", {
      txid,
      customerEmail: customerEmail?.substring(0, 5) + "***",
      productName,
      hasDeliveryLink: !!deliveryLink,
      hasDeliveryFile: !!deliveryFileUrl,
    });

    // Validate required fields
    if (!customerEmail) {
      console.log("[DELIVERY] No customer email provided, skipping");
      return new Response(
        JSON.stringify({ success: false, error: "No customer email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deliveryLink && !deliveryFileUrl) {
      console.log("[DELIVERY] No delivery content configured, skipping");
      return new Response(
        JSON.stringify({ success: false, error: "No delivery content configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API key from user settings or global
    let resendApiKey: string | null = null;

    // Try user-specific setting first
    if (userId) {
      const { data: userSetting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "resend_api_key")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (userSetting?.value) {
        resendApiKey = userSetting.value;
        console.log("[DELIVERY] Using user-specific Resend API key");
      }
    }

    // Fall back to global setting
    if (!resendApiKey) {
      const { data: globalSetting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "resend_api_key")
        .is("user_id", null)
        .maybeSingle();
      
      if (globalSetting?.value) {
        resendApiKey = globalSetting.value;
        console.log("[DELIVERY] Using global Resend API key");
      }
    }

    // Fall back to environment variable
    if (!resendApiKey) {
      resendApiKey = Deno.env.get("RESEND_API_KEY") || null;
      if (resendApiKey) {
        console.log("[DELIVERY] Using environment Resend API key");
      }
    }

    if (!resendApiKey) {
      console.error("[DELIVERY] No Resend API key configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine download link
    let downloadLink = deliveryLink;

    // If we have a file URL but no external link, generate signed URL
    if (!downloadLink && deliveryFileUrl) {
      // Check if it's a storage URL that needs signing
      if (deliveryFileUrl.includes("product-deliverables")) {
        // Extract path from URL
        const pathMatch = deliveryFileUrl.match(/product-deliverables\/(.+)/);
        if (pathMatch) {
          const filePath = pathMatch[1].split("?")[0]; // Remove query params
          const { data: signedUrl } = await supabase.storage
            .from("product-deliverables")
            .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry

          if (signedUrl?.signedUrl) {
            downloadLink = signedUrl.signedUrl;
            console.log("[DELIVERY] Generated signed URL for file");
          }
        }
      } else {
        // Use file URL directly
        downloadLink = deliveryFileUrl;
      }
    }

    if (!downloadLink) {
      console.error("[DELIVERY] Could not determine download link");
      return new Response(
        JSON.stringify({ success: false, error: "Could not generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender email from settings or use default
    let senderEmail = "entrega@resend.dev";
    let senderName = "Entrega Digital";

    if (userId) {
      const { data: emailSettings } = await supabase
        .from("admin_settings")
        .select("key, value")
        .eq("user_id", userId)
        .in("key", ["resend_from_email", "resend_from_name"]);

      if (emailSettings) {
        for (const setting of emailSettings) {
          if (setting.key === "resend_from_email" && setting.value) {
            senderEmail = setting.value;
          }
          if (setting.key === "resend_from_name" && setting.value) {
            senderName = setting.value;
          }
        }
      }
    }

    // Initialize Resend and send email
    const resend = new Resend(resendApiKey);

    const emailHtml = generateEmailHtml(
      customerName || "Cliente",
      productName || "Seu Produto",
      amount || 0,
      downloadLink
    );

    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [customerEmail],
      subject: `✅ Seu acesso: ${productName || "Produto Digital"}`,
      html: emailHtml,
    });

    const responseTime = Date.now() - startTime;

    if (emailError) {
      console.error("[DELIVERY] Email sending failed:", emailError);
      
      // Log failure event
      await supabase.from("api_monitoring_events").insert({
        acquirer: "resend_delivery",
        event_type: "failure",
        error_message: emailError.message || "Email sending failed",
        response_time_ms: responseTime,
      });

      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[DELIVERY] Email sent successfully:", emailResponse?.id);

    // Log success event
    await supabase.from("api_monitoring_events").insert({
      acquirer: "resend_delivery",
      event_type: "success",
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse?.id,
        responseTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[DELIVERY] Error in product delivery:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
