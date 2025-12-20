import { useState, useEffect } from "react";
import { AcquirerConfigSection } from "./AcquirerConfigSection";
import { RetryConfigSection } from "./RetryConfigSection";
import { GatewayConfigSection } from "./GatewayConfigSection";
import { AcquirerHealthDashboard } from "./AcquirerHealthDashboard";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, Key, Loader2, Shield, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MULTI_KEYWORD = "MELCHIADES";
const MULTI_ACQUIRER_AUTH_KEY = 'multi_acquirer_authenticated';

export const MultiAcquirersSection = () => {
  const { isAdmin } = useAdminAuth();
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(MULTI_ACQUIRER_AUTH_KEY) === 'true';
  });
  const [showKeywordDialog, setShowKeywordDialog] = useState(() => {
    return sessionStorage.getItem(MULTI_ACQUIRER_AUTH_KEY) !== 'true';
  });
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Get current user email on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
        setEmail(user.email);
      }
    };
    getCurrentUser();
  }, []);

  const handleKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.toUpperCase() === MULTI_KEYWORD) {
      setShowKeywordDialog(false);
      setShowAuthDialog(true);
      setKeyword("");
    } else {
      toast({
        title: "Palavra-chave incorreta",
        description: "A palavra-chave informada não corresponde.",
        variant: "destructive"
      });
    }
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      // Verify credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        toast({
          title: "Erro de autenticação",
          description: "Email ou senha incorretos.",
          variant: "destructive"
        });
        setIsAuthenticating(false);
        return;
      }

      // Verify if user is admin
      const { data: isAdminResult } = await supabase.rpc('is_admin_authenticated');
      
      if (!isAdminResult) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem acessar esta área.",
          variant: "destructive"
        });
        setIsAuthenticating(false);
        return;
      }

      // Success - store in session
      sessionStorage.setItem(MULTI_ACQUIRER_AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setShowAuthDialog(false);
      setPassword("");
      
      toast({
        title: "Acesso autorizado",
        description: "Você agora tem acesso às configurações de multi-adquirência.",
      });
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante a autenticação.",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <>
      {/* Keyword Dialog */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              Esta área contém configurações sensíveis de gateway. Digite a palavra-chave secreta para continuar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleKeywordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input
                id="keyword"
                type="password"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Digite a palavra-chave secreta"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={!keyword}>
                <Lock className="w-4 h-4 mr-2" />
                Verificar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Confirmar Identidade
            </DialogTitle>
            <DialogDescription>
              Para acessar as configurações de multi-adquirência, confirme suas credenciais de administrador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={!!currentUserEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAuthDialog(false);
                  setShowKeywordDialog(true);
                }}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={isAuthenticating || !password}>
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Autenticar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Locked State Card */}
      {!isAuthenticated && !showKeywordDialog && !showAuthDialog && (
        <div className="max-w-5xl mx-auto">
          <Card className="w-full border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Multi-adquirência</CardTitle>
                  <CardDescription>Área protegida - autenticação necessária</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowKeywordDialog(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Desbloquear Acesso
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Only show after authentication */}
      {isAuthenticated && (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 1. Configurações de Gateways (API Keys, Taxas, Testar conexão) */}
          <GatewayConfigSection />

          {/* 2. Configuração de Adquirente Principal por Método de Pagamento */}
          <AcquirerConfigSection isAdmin={isAdmin} />

          {/* 3. Configuração de Retentativas (máximo 3 adquirentes) */}
          <RetryConfigSection />

          {/* 4. Monitoramento de Saúde em Tempo Real */}
          <AcquirerHealthDashboard />
        </div>
      )}
    </>
  );
};
