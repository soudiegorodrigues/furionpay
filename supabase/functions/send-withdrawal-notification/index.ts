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
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 40px 30px 30px 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="FurionPay" style="max-height: 60px; max-width: 220px;">` : '<h1 style="color: #18181b; margin: 0; font-size: 28px; font-weight: 700;">FurionPay</h1>'}
                    </td>
                  </tr>

                  <!-- Status Badge -->
                  <tr>
                    <td style="padding: 0 30px 24px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: ${isApproved ? '#dcfce7' : '#fee2e2'}; border: 1.5px solid ${statusColor}; border-radius: 100px; padding: 10px 20px;">
                        <span style="color: ${statusColor}; font-size: 15px; font-weight: 600;">
                          ${statusEmoji} Saque ${statusText.toLowerCase()}
                        </span>
                      </div>
                    </td>
                  </tr>

                  <!-- Amount Section -->
                  <tr>
                    <td style="padding: 0 30px 28px 30px; text-align: center;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 400;">Valor do saque</p>
                      <p style="color: #111827; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: -1px;">${formatCurrency(amount)}</p>
                    </td>
                  </tr>

                  <!-- Bank Details Box -->
                  <tr>
                    <td style="padding: 0 30px 28px 30px;">
                      <div style="background-color: #f5f5f5; border-radius: 12px; overflow: hidden;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5;">
                              <span style="color: #6b7280; font-size: 14px;">Banco</span>
                            </td>
                            <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                              <span style="color: #111827; font-size: 14px; font-weight: 600;">${bankName}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 16px 20px;">
                              <span style="color: #6b7280; font-size: 14px;">Chave Pix</span>
                            </td>
                            <td style="padding: 16px 20px; text-align: right;">
                              <span style="color: #111827; font-size: 14px; font-weight: 600;">${pixKey}</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>

                  ${!isApproved && rejectionReason ? `
                  <!-- Rejection Reason -->
                  <tr>
                    <td style="padding: 0 30px 28px 30px;">
                      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px;">
                        <p style="color: #991b1b; font-size: 13px; margin: 0 0 6px 0; font-weight: 600;">Motivo da rejeição:</p>
                        <p style="color: #b91c1c; font-size: 14px; margin: 0; line-height: 1.5;">${rejectionReason}</p>
                      </div>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Confirmation Message -->
                  <tr>
                    <td style="padding: 0 30px 32px 30px; text-align: center;">
                      ${isApproved 
                        ? '<p style="color: #16a34a; font-size: 15px; margin: 0; font-weight: 500;">O valor será transferido para sua conta em breve.</p>'
                        : '<p style="color: #6b7280; font-size: 14px; margin: 0;">Entre em contato conosco caso tenha dúvidas.</p>'
                      }
                    </td>
                  </tr>

                  <!-- Footer Divider -->
                  <tr>
                    <td style="padding: 0 30px;">
                      <div style="height: 1px; background-color: #e5e7eb;"></div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 30px 20px 30px; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                        Este é um e-mail automático. Não responda.
                      </p>
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © FurionPay — Pagamentos inteligentes
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
