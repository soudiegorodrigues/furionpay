import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminResetRequest {
  targetUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetUserId } = await req.json() as AdminResetRequest;

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify admin status
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify caller is admin
    const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin_authenticated');
    
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar 2FA' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's user ID for audit log
    const { data: { user: callerUser } } = await userClient.auth.getUser();

    // Get target user
    const { data: { user: targetUser }, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
    
    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and delete TOTP factors
    const factors = targetUser.factors || [];
    const totpFactors = factors.filter(f => f.factor_type === 'totp');

    if (totpFactors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Usuário não tem 2FA ativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const factor of totpFactors) {
      try {
        const { error: unenrollError } = await supabase.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: targetUserId
        });

        if (unenrollError) {
          console.error('Error unenrolling factor:', unenrollError);
        }
      } catch (e) {
        console.error('Error deleting factor:', e);
      }
    }

    // Delete backup codes
    await supabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', targetUserId);

    // Log the admin reset
    await supabase
      .from('mfa_audit_logs')
      .insert({
        user_id: targetUserId,
        event_type: 'reset_by_admin',
        metadata: { 
          reset_by_user_id: callerUser?.id,
          reset_by_email: callerUser?.email
        }
      });

    console.log(`[ADMIN-RESET-2FA] 2FA disabled for user ${targetUserId} by admin ${callerUser?.email}`);

    return new Response(
      JSON.stringify({ success: true, message: '2FA do usuário foi desativado' }),
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
