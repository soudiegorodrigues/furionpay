import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // First try to get from admin_settings
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['inter_client_id', 'inter_client_secret', 'inter_certificate', 'inter_private_key', 'inter_pix_key']);

    const getValue = (key: string) => {
      const setting = settings?.find(s => s.key === key);
      return setting?.value || null;
    };

    // Get from admin_settings or fall back to environment variables
    const credentials = {
      clientId: getValue('inter_client_id') || Deno.env.get('INTER_CLIENT_ID') || '',
      clientSecret: getValue('inter_client_secret') || Deno.env.get('INTER_CLIENT_SECRET') || '',
      certificate: getValue('inter_certificate') || Deno.env.get('INTER_CERTIFICATE') || '',
      privateKey: getValue('inter_private_key') || Deno.env.get('INTER_PRIVATE_KEY') || '',
      pixKey: getValue('inter_pix_key') || Deno.env.get('INTER_PIX_KEY') || ''
    };

    console.log('Credentials loaded for admin:', user.email);

    return new Response(
      JSON.stringify({ success: true, credentials }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching Inter credentials:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
