import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { User, Save, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { DocumentVerificationSection } from "@/components/profile/DocumentVerificationSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminProfile() {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Reset confirmation dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Load profile name from database
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (data?.full_name) {
        setDisplayName(data.full_name);
      }
    };
    
    loadProfile();
  }, [user?.id]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) return;

    setSavingName(true);
    try {
      // Save to profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: displayName.trim()
        }, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nome atualizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar nome",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleResetAccount = async () => {
    if (!confirmEmail.trim() || !confirmPassword.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o email e a senha para confirmar",
        variant: "destructive",
      });
      return;
    }

    if (confirmEmail.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      toast({
        title: "Erro",
        description: "O email informado não corresponde à sua conta",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      // Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: confirmEmail.trim(),
        password: confirmPassword,
      });

      if (authError) {
        toast({
          title: "Erro",
          description: "Senha incorreta. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Password verified, proceed with reset
      setResetting(true);
      const { error: txError } = await supabase.rpc('reset_user_transactions');
      if (txError) throw txError;

      toast({
        title: "Conta resetada",
        description: "Seu histórico de transações foi removido com sucesso.",
      });

      // Close dialog and reset fields
      setResetDialogOpen(false);
      setConfirmEmail("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar conta",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Meu Perfil" icon={User} />
        
        <div className="flex-1 p-6 space-y-6">
          {/* Informações do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input 
                  id="displayName" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={100}
                />
              </div>

              <Button 
                onClick={handleSaveName} 
                disabled={savingName}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingName ? "Salvando..." : "Salvar Nome"}
              </Button>
            </CardContent>
          </Card>

          {/* Verificação de Documentos */}
          {user?.id && (
            <DocumentVerificationSection userId={user.id} />
          )}

          {/* Zona de Perigo */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis para sua conta. Seus dados históricos permanecerão visíveis para administradores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <h4 className="font-medium text-destructive mb-2">Resetar Minha Conta</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Esta ação irá apagar todas as suas transações e configurações pessoais. 
                    Use isso se deseja iniciar um novo projeto do zero. 
                    <strong className="text-foreground"> Seus dados históricos permanecerão registrados no sistema administrativo.</strong>
                  </p>
                  <AlertDialog open={resetDialogOpen} onOpenChange={(open) => {
                    setResetDialogOpen(open);
                    if (!open) {
                      setConfirmEmail("");
                      setConfirmPassword("");
                    }
                  }}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={resetting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {resetting ? "Resetando..." : "Resetar Minha Conta"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirme sua identidade</AlertDialogTitle>
                        <AlertDialogDescription>
                          Para resetar sua conta, confirme seu email e senha. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="confirm-email">Email</Label>
                          <Input
                            id="confirm-email"
                            type="email"
                            placeholder="Digite seu email"
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Senha</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Digite sua senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={verifying || resetting}>Cancelar</AlertDialogCancel>
                        <Button
                          variant="destructive"
                          onClick={handleResetAccount}
                          disabled={verifying || resetting || !confirmEmail || !confirmPassword}
                        >
                          {verifying ? "Verificando..." : resetting ? "Resetando..." : "Confirmar e Resetar"}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
