import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RESET_KEYWORD = "MELCHIADES";
const DANGER_ZONE_AUTH_KEY = 'danger_zone_authenticated';

export const ZonaDePerigo = () => {
  // Security states - check sessionStorage on init
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(DANGER_ZONE_AUTH_KEY) === 'true';
  });
  const [showKeywordDialog, setShowKeywordDialog] = useState(() => {
    return sessionStorage.getItem(DANGER_ZONE_AUTH_KEY) !== 'true';
  });
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  // Action states
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUser({ email: user.email });
      }
    };
    getCurrentUser();
  }, []);

  const handleKeywordSubmit = () => {
    if (keyword.toUpperCase() !== RESET_KEYWORD) {
      toast({
        title: "Palavra-chave incorreta",
        description: "Digite a palavra-chave correta para continuar",
        variant: "destructive"
      });
      return;
    }

    setShowKeywordDialog(false);
    setKeyword("");
    setShowAuthDialog(true);
  };

  const handleAuthenticate = async () => {
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    // Verify email matches current user
    if (currentUser?.email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
      toast({
        title: "Erro",
        description: "Use o email da sua conta atual",
        variant: "destructive"
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      // Verify user is admin first
      const { data: isAdmin } = await supabase.rpc('is_admin_authenticated');
      if (!isAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem acessar esta área",
          variant: "destructive"
        });
        return;
      }

      // Verify password
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Erro de autenticação",
          description: "Senha incorreta",
          variant: "destructive"
        });
        return;
      }

      // Save to sessionStorage
      sessionStorage.setItem(DANGER_ZONE_AUTH_KEY, 'true');

      setShowAuthDialog(false);
      setIsAuthenticated(true);
      setEmail("");
      setPassword("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha na autenticação",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBackupAndReset = async () => {
    setIsResettingGlobal(true);
    try {
      const { data: backupId, error } = await supabase.rpc('backup_and_reset_transactions');
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Backup criado e transações resetadas! ID do backup: " + backupId?.slice(0, 8)
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
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {/* Keyword Dialog - Step 1 */}
      <Dialog open={showKeywordDialog} onOpenChange={(open) => !isAuthenticated && setShowKeywordDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <Badge variant="outline" className="mb-1 border-destructive/30 text-destructive">Zona de Perigo</Badge>
                <DialogTitle>Acesso à Área Restrita</DialogTitle>
              </div>
            </div>
            <DialogDescription>
              Esta área contém ações críticas e irreversíveis. Digite a palavra-chave de segurança para continuar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input
                id="keyword"
                type="text"
                placeholder="Digite a palavra-chave"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKeywordSubmit()}
                className="uppercase"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="destructive" 
              onClick={handleKeywordSubmit}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog - Step 2 */}
      <Dialog open={showAuthDialog} onOpenChange={(open) => !isAuthenticated && setShowAuthDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <Badge variant="outline" className="mb-1 border-destructive/30 text-destructive">Zona de Perigo</Badge>
                <DialogTitle>Autenticação do Administrador</DialogTitle>
              </div>
            </div>
            <DialogDescription>
              Confirme suas credenciais de administrador para acessar a Zona de Perigo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="destructive" 
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Only show after authentication */}
      {isAuthenticated && (
        <div className="max-w-5xl mx-auto">
          <Card className="w-full border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl text-destructive">Zona de Perigo</CardTitle>
                  <CardDescription>Ações irreversíveis que afetam permanentemente os dados</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <div>
                    <h3 className="font-medium text-foreground">Resetar Faturamento Global</h3>
                    <p className="text-sm text-muted-foreground">
                      Cria um backup automático e remove todas as transações. Você poderá restaurar depois.
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="destructive" 
                  disabled={isResettingGlobal}
                  onClick={() => setShowConfirmDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Executar Reset Global
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Dialog - Step 3 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-destructive">Confirmar Reset Global</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              Esta ação irá:
              <br /><br />
              ✓ <strong>Criar um backup</strong> de todas as transações
              <br />
              ✗ <strong>Apagar todas</strong> as transações da plataforma
              <br /><br />
              <span className="text-muted-foreground">Você poderá restaurar o backup depois se necessário.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBackupAndReset} 
              disabled={isResettingGlobal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
            >
              {isResettingGlobal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Criar Backup e Resetar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
