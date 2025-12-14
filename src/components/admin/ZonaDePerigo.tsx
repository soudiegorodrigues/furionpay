import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const ZonaDePerigo = () => {
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);

  useEffect(() => {
    const loadOwnerEmail = async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'system_owner_email')
          .is('user_id', null)
          .single();
        
        if (data?.value) {
          setOwnerEmail(data.value);
        }
      } catch (error) {
        console.error('Error loading owner email:', error);
      } finally {
        setIsLoadingOwner(false);
      }
    };
    
    loadOwnerEmail();
  }, []);

  const handleAuthenticate = async () => {
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    // Check if email matches owner email from database
    if (!ownerEmail || email.toLowerCase() !== ownerEmail.toLowerCase()) {
      toast({
        title: "Acesso negado",
        description: "Apenas o proprietário do sistema pode acessar esta área",
        variant: "destructive"
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Erro de autenticação",
          description: "Email ou senha incorretos",
          variant: "destructive"
        });
        return;
      }

      setIsAuthenticated(true);
      setShowAuthDialog(false);
      toast({
        title: "Acesso liberado",
        description: "Zona de Perigo desbloqueada"
      });
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Erro",
        description: "Falha na autenticação",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResetGlobalDashboard = async () => {
    setIsResettingGlobal(true);
    try {
      const { error } = await supabase.rpc('reset_pix_transactions_auth');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações da plataforma foram apagadas!"
      });
    } catch (error) {
      console.error('Error resetting global transactions:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar transações globais",
        variant: "destructive"
      });
    } finally {
      setIsResettingGlobal(false);
    }
  };

  // Show locked state if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Card className="border-destructive/50 max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Lock className="w-5 h-5" />
              Zona de Perigo - Bloqueada
            </CardTitle>
            <CardDescription>
              Autenticação necessária para acessar ações críticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Por segurança, você precisa confirmar sua identidade para acessar esta seção.
            </p>
          </CardContent>
        </Card>

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Autenticação Necessária
              </DialogTitle>
              <DialogDescription>
                Para acessar a Zona de Perigo, confirme suas credenciais de administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isAuthenticating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthenticate();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
              <Button 
                onClick={handleAuthenticate} 
                className="w-full"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Confirmar Acesso"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card className="border-destructive/50 max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis que afetam permanentemente os dados da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResettingGlobal}>
                {isResettingGlobal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetando Global...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Resetar Faturamento Global
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ ATENÇÃO: Ação Crítica!</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá apagar TODAS as transações de TODOS os usuários da plataforma.
                  Isso inclui o histórico completo de pagamentos de todas as contas.
                  Esta ação NÃO pode ser desfeita!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetGlobalDashboard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, apagar TUDO da plataforma
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground">
            Isso irá apagar todas as transações de todos os usuários da plataforma.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
