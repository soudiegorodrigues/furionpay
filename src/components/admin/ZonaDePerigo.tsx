import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RESET_KEYWORD = "MELCHIADES";

export const ZonaDePerigo = () => {
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Erro de autenticação",
          description: "Email ou senha incorretos",
          variant: "destructive"
        });
        return;
      }

      const { data: isAdmin } = await supabase.rpc('is_admin_authenticated');
      if (!isAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem executar esta ação",
          variant: "destructive"
        });
        return;
      }

      setShowAuthDialog(false);
      setShowConfirmDialog(true);
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
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 max-w-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-destructive/5 rounded-full translate-y-12 -translate-x-12" />
        
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/20">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl text-destructive font-bold">
                Zona de Perigo
              </CardTitle>
              <CardDescription className="text-muted-foreground/80">
                Ações irreversíveis que afetam permanentemente os dados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-6">
          <div className="p-4 rounded-xl bg-background/60 border border-destructive/20 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">Resetar Faturamento Global</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Remove todas as transações de todos os usuários da plataforma. Esta ação é permanente e não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                disabled={isResettingGlobal}
                onClick={() => setShowKeywordDialog(true)}
                className="w-full sm:w-auto shadow-lg shadow-destructive/25 hover:shadow-destructive/40 transition-all duration-300"
              >
                <Lock className="w-4 h-4 mr-2" />
                Executar Reset Global
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Dialog - Step 1 */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <Key className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle>Palavra-chave de Segurança</DialogTitle>
            </div>
            <DialogDescription>
              Digite <strong className="text-destructive">{RESET_KEYWORD}</strong> para continuar com esta ação crítica.
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
            <Button variant="outline" onClick={() => { setShowKeywordDialog(false); setKeyword(""); }}>
              Cancelar
            </Button>
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
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle>Autenticação do Administrador</DialogTitle>
            </div>
            <DialogDescription>
              Confirme suas credenciais de administrador para prosseguir.
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
            <Button variant="outline" onClick={() => { setShowAuthDialog(false); setEmail(""); setPassword(""); }}>
              Cancelar
            </Button>
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

      {/* Confirm Dialog - Step 3 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-destructive">ATENÇÃO: Ação Crítica!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              Esta ação irá apagar <strong>TODAS</strong> as transações de <strong>TODOS</strong> os usuários da plataforma.
              Isso inclui o histórico completo de pagamentos de todas as contas.
              <br /><br />
              <span className="font-semibold text-destructive">Esta ação NÃO pode ser desfeita!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetGlobalDashboard} 
              disabled={isResettingGlobal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
            >
              {isResettingGlobal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetando...
                </>
              ) : (
                "Sim, apagar TUDO"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};