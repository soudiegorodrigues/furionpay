import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminNavigation } from "@/components/AdminNavigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { PersonalizacaoSection } from "@/components/admin/PersonalizacaoSection";
import { EmailSection } from "@/components/admin/EmailSection";
import { CheckoutGlobalSection } from "@/components/admin/CheckoutGlobalSection";
import { FaturamentoSection } from "@/components/admin/FaturamentoSection";
import { TransacoesGlobaisSection } from "@/components/admin/TransacoesGlobaisSection";
import { RankingSection } from "@/components/admin/RankingSection";
import { DominiosSection } from "@/components/admin/DominiosSection";
import { UsuariosSection } from "@/components/admin/UsuariosSection";
import { MultiAcquirersSection } from "@/components/admin/MultiAcquirersSection";
import { ZonaDePerigo } from "@/components/admin/ZonaDePerigo";
import { TaxasSection } from "@/components/admin/TaxasSection";
import { SaquesGlobaisSection } from "@/components/admin/SaquesGlobaisSection";
import { DocumentosSection } from "@/components/admin/DocumentosSection";
import { UTMDebugSection } from "@/components/admin/UTMDebugSection";
import { PremiacoesSection } from "@/components/admin/PremiacoesSection";
import { ApiMonitoringSection } from "@/components/admin/ApiMonitoringSection";
import { ReceitaPlataformaSection } from "@/components/admin/ReceitaPlataformaSection";
import { NotificacoesSection } from "@/components/admin/NotificacoesSection";
import { BackupsSection } from "@/components/admin/BackupsSection";
import { AntiFraudeSection } from "@/components/admin/AntiFraudeSection";
import { TemplatesListSection } from "@/components/admin/TemplatesListSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import furionLogoWhite from "@/assets/furionpay-logo-white-text.png";
import furionLogoDark from "@/assets/furionpay-logo-dark-text.png";

const ADMIN_PANEL_AUTH_KEY = 'admin_panel_authenticated';

const Admin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<string>(() => {
    const state = location.state as { section?: string } | null;
    return state?.section || "faturamento";
  });

  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => 
    sessionStorage.getItem(ADMIN_PANEL_AUTH_KEY) === 'true'
  );
  const [showAuthDialog, setShowAuthDialog] = useState(() => 
    sessionStorage.getItem(ADMIN_PANEL_AUTH_KEY) !== 'true'
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  const handleAuthenticate = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    setIsAuthenticating(true);

    try {
      // Verify credentials with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Credenciais inválidas");
        setIsAuthenticating(false);
        return;
      }

      // Verify if this user is an admin
      const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin_authenticated');
      
      if (adminError || !isAdminResult) {
        toast.error("Acesso negado. Somente administradores podem acessar.");
        setIsAuthenticating(false);
        return;
      }

      // Success - save to sessionStorage and grant access
      sessionStorage.setItem(ADMIN_PANEL_AUTH_KEY, 'true');
      setIsAdminAuthenticated(true);
      setShowAuthDialog(false);
      toast.success("Acesso liberado ao Painel Admin");
      
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Erro ao autenticar");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuthenticating) {
      handleAuthenticate();
    }
  };

  // Show nothing while checking or if not admin
  if (loading || !isAdmin) {
    return null;
  }

  // Show authentication dialog if not authenticated
  if (!isAdminAuthenticated || showAuthDialog) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center space-y-6 py-4">
            {/* Logo */}
            <img
              src={furionLogoDark}
              alt="FurionPay"
              className="h-8 dark:hidden"
            />
            <img
              src={furionLogoWhite}
              alt="FurionPay"
              className="h-8 hidden dark:block"
            />

            {/* Shield Icon */}
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Acesso ao Painel Admin</h2>
              <p className="text-sm text-muted-foreground">
                Por segurança, confirme suas credenciais de administrador
              </p>
            </div>

            {/* Form */}
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isAuthenticating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isAuthenticating}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isAuthenticating}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAuthenticate}
                disabled={isAuthenticating || !email || !password}
                className="w-full"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminNavigation activeSection={activeSection} onSectionChange={setActiveSection} />

      {activeSection === "faturamento" && <FaturamentoSection />}
      {activeSection === "receita-plataforma" && <ReceitaPlataformaSection />}
      {activeSection === "transacoes" && <TransacoesGlobaisSection />}
      {activeSection === "ranking" && <RankingSection />}
      {activeSection === "dominios" && <DominiosSection />}
      {activeSection === "multi" && <MultiAcquirersSection />}
      {activeSection === "usuarios" && <UsuariosSection />}
      {activeSection === "zona-perigo" && <ZonaDePerigo />}
      {activeSection === "checkout-global" && <CheckoutGlobalSection />}
      {activeSection === "saques" && <SaquesGlobaisSection />}
      {activeSection === "documentos" && <DocumentosSection />}
      {activeSection === "personalizacao" && <PersonalizacaoSection userId={user?.id} />}
      {activeSection === "email" && <EmailSection />}
      {activeSection === "taxas" && <TaxasSection />}
      {activeSection === "anti-fraude" && <AntiFraudeSection />}
      {activeSection === "notificacoes" && <NotificacoesSection />}
      {activeSection === "utm-debug" && <UTMDebugSection />}
      {activeSection === "premiacoes" && <PremiacoesSection />}
      {activeSection === "api-monitoring" && <ApiMonitoringSection />}
      {activeSection === "backups" && <BackupsSection />}
      {activeSection === "templates" && <TemplatesListSection />}
    </div>
  );
};

export default Admin;
