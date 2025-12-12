import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WithdrawalNotificationRequest {
  userEmail: string;
  amount: number;
  status: 'approved' | 'rejected';
  bankName: string;
  pixKey: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API key from admin_settings or environment
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const { data: settingsData } = await supabase
      .from("admin_settings")
      .select("key, value")
      .is("user_id", null)
      .in("key", ["resend_api_key", "resend_sender_email", "email_logo_url"]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string }) => {
      settings[s.key] = s.value;
    });

    if (settings.resend_api_key) {
      resendApiKey = settings.resend_api_key;
    }

    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    const senderEmail = settings.resend_sender_email || "onboarding@resend.dev";
    const logoUrl = settings.email_logo_url || "";

    const { userEmail, amount, status, bankName, pixKey, rejectionReason }: WithdrawalNotificationRequest = await req.json();

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const isApproved = status === 'approved';
    const statusText = isApproved ? 'Aprovado' : 'Rejeitado';
    const statusColor = isApproved ? '#22c55e' : '#ef4444';
    const statusEmoji = isApproved ? '✅' : '❌';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #18181b; padding: 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 50px; max-width: 200px;">` : '<h1 style="color: #ffffff; margin: 0; font-size: 24px;">FurionPay</h1>'}
                    </td>
                  </tr>

                  <!-- Status Badge -->
                  <tr>
                    <td style="padding: 30px 30px 20px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: ${statusColor}15; border: 2px solid ${statusColor}; border-radius: 50px; padding: 12px 24px;">
                        <span style="color: ${statusColor}; font-size: 18px; font-weight: bold;">
                          ${statusEmoji} Saque ${statusText}
                        </span>
                      </div>
                    </td>
                  </tr>

                  <!-- Amount -->
                  <tr>
                    <td style="padding: 10px 30px 20px 30px; text-align: center;">
                      <p style="color: #71717a; font-size: 14px; margin: 0 0 8px 0;">Valor do saque</p>
                      <p style="color: #18181b; font-size: 36px; font-weight: bold; margin: 0;">${formatCurrency(amount)}</p>
                    </td>
                  </tr>

                  <!-- Details -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                              <span style="color: #71717a; font-size: 14px;">Banco</span>
                            </td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                              <span style="color: #18181b; font-size: 14px; font-weight: 500;">${bankName}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #71717a; font-size: 14px;">Chave PIX</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <span style="color: #18181b; font-size: 14px; font-weight: 500;">${pixKey}</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>

                  ${!isApproved && rejectionReason ? `
                  <!-- Rejection Reason -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
                        <p style="color: #991b1b; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">Motivo da rejeição:</p>
                        <p style="color: #b91c1c; font-size: 14px; margin: 0;">${rejectionReason}</p>
                      </div>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Message -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                      ${isApproved 
                        ? '<p style="color: #22c55e; font-size: 14px; margin: 0;">O valor será transferido para sua conta em breve.</p>'
                        : '<p style="color: #71717a; font-size: 14px; margin: 0;">Entre em contato conosco caso tenha dúvidas.</p>'
                      }
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
                      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                        Este email foi enviado automaticamente. Por favor, não responda.
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

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `FurionPay <${senderEmail}>`,
        to: [userEmail],
        subject: `${statusEmoji} Seu saque foi ${statusText.toLowerCase()} - ${formatCurrency(amount)}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Withdrawal notification sent:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending withdrawal notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
