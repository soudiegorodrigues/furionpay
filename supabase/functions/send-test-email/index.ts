import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  templateKey: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  variables: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateKey, recipientEmail, subject, htmlContent, variables }: TestEmailRequest = await req.json();

    console.log(`Sending test email for template: ${templateKey} to: ${recipientEmail}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API key from admin_settings
    const { data: resendSettings } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .is("user_id", null)
      .single();

    const resendApiKey = resendSettings?.value || Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    // Get sender email from admin_settings
    const { data: senderSettings } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "resend_sender_email")
      .is("user_id", null)
      .single();

    const senderEmail = senderSettings?.value || "FurionPay <onboarding@resend.dev>";

    // Get logo URL for variable replacement
    const { data: logoSettings } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "email_logo_url")
      .is("user_id", null)
      .single();

    const logoUrl = logoSettings?.value || "";

    // Replace variables in content
    let processedContent = htmlContent;
    let processedSubject = subject;

    // Add logoUrl to variables if not present
    const allVariables = { ...variables, logoUrl };

    for (const [key, value] of Object.entries(allVariables)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      processedContent = processedContent.replace(regex, value);
      processedSubject = processedSubject.replace(regex, value);
    }

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [recipientEmail],
        subject: `[TESTE] ${processedSubject}`,
        html: processedContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Test email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending test email:", error);
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
