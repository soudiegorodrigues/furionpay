import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  email: string;
}

const getResendApiKey = async (supabase: any): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'resend_api_key')
      .is('user_id', null)
      .maybeSingle();
    
    if (data?.value) return data.value;
  } catch (e) {
    console.error('Error fetching resend key from settings:', e);
  }
  
  return Deno.env.get('RESEND_API_KEY') || null;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as ResetRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists and has 2FA enabled
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir e tiver 2FA, você receberá um código' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has TOTP factor
    const factors = user.factors || [];
    const hasTOTP = factors.some(f => f.factor_type === 'totp' && f.status === 'verified');

    if (!hasTOTP) {
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir e tiver 2FA, você receberá um código' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the code (reusing password_reset_codes table)
    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error('Error storing code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Resend API key
    const resendApiKey = await getResendApiKey(supabase);
    
    if (!resendApiKey) {
      console.error('Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de email não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FurionPay <noreply@furionpay.com>',
        to: [email],
        subject: 'Código para Desativar 2FA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">Desativar Autenticação em Duas Etapas</h2>
            <p>Você solicitou a desativação do 2FA da sua conta.</p>
            <p>Use o código abaixo para confirmar:</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
            <p style="color: #666; font-size: 14px;">Se você não solicitou isso, ignore este email. Sua conta permanece segura.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">FurionPay - Pagamentos Seguros</p>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Error sending email:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RESET-2FA] Code sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Código enviado para seu email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
