// v2.2 - Meta Pixel removed, simplified
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMScriptSection } from "@/components/admin/UTMScriptSection";

const AdminSettings = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loading,
    signOut,
    user,
    isBlocked
  } = useAdminAuth();

  // Load settings when authenticated - AdminLayout handles auth redirects
  useEffect(() => {
    if (isAuthenticated && !loading) {
      checkAdminRole();
      setIsLoading(false);
    }
  }, [isAuthenticated, loading]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_settings')) {
    return <AccessDenied message="Você não tem permissão para gerenciar Configurações." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize suas configurações de pagamento</p>
          </div>
        </div>

        {/* UTM Script Section */}
        <UTMScriptSection />
    </div>
  );
};
export default AdminSettings;
