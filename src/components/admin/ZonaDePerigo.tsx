import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const ZonaDePerigo = () => {
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);

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

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 w-full max-w-md aspect-square overflow-hidden relative flex flex-col">
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
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isResettingGlobal}
                  className="w-full sm:w-auto shadow-lg shadow-destructive/25 hover:shadow-destructive/40 transition-all duration-300"
                >
                  {isResettingGlobal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetando Global...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Executar Reset Global
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
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
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
                  >
                    Sim, apagar TUDO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
};
