import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SECRET_TOKEN = "FURION_RESET_2024";

export const ZonaDePerigo = () => {
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleResetGlobalDashboard = async () => {
    if (tokenInput !== SECRET_TOKEN) {
      toast({
        title: "Token inválido",
        description: "O token secreto informado está incorreto.",
        variant: "destructive"
      });
      return;
    }

    setIsResettingGlobal(true);
    try {
      const { error } = await supabase.rpc('reset_pix_transactions_auth');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações da plataforma foram apagadas!"
      });
      setDialogOpen(false);
      setTokenInput("");
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
          <AlertDialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setTokenInput("");
          }}>
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
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  ATENÇÃO: Ação Crítica!
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Esta ação irá apagar TODAS as transações de TODOS os usuários da plataforma.
                    Isso inclui o histórico completo de pagamentos de todas as contas.
                    Esta ação NÃO pode ser desfeita!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-2 py-2">
                <Label htmlFor="secret-token" className="flex items-center gap-2 text-sm font-medium">
                  <Key className="w-4 h-4" />
                  Token Secreto
                </Label>
                <Input
                  id="secret-token"
                  type="password"
                  placeholder="Digite o token secreto para confirmar"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Insira o token secreto de administrador para confirmar esta ação.
                </p>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button 
                  onClick={handleResetGlobalDashboard} 
                  variant="destructive"
                  disabled={!tokenInput || isResettingGlobal}
                >
                  {isResettingGlobal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Apagando...
                    </>
                  ) : (
                    "Sim, apagar TUDO"
                  )}
                </Button>
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