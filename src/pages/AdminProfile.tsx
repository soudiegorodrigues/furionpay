import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { User, Save, Lock, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { DocumentVerificationSection } from "@/components/profile/DocumentVerificationSection";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { Separator } from "@/components/ui/separator";

export default function AdminProfile() {
  const { user, updatePassword } = useAdminAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (authError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta",
          variant: "destructive",
        });
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.functions.invoke('send-password-reset', {
      body: { email: user.email }
    });
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar email de recuperação",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir a senha",
      });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <AdminHeader title="Meu Perfil" icon={User} />
      
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Profile Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10">
            <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 border-2 border-primary/20">
              <User className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                {displayName || "Usuário"}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Informações Pessoais */}
            <Card className="animate-fade-in border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                    <CardDescription className="text-sm">
                      Atualize suas informações de perfil
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      value={user?.email || ""} 
                      disabled 
                      className="pl-10 bg-muted/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium">Nome de Exibição</Label>
                  <Input 
                    id="displayName" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={100}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
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

            {/* Segurança - Alterar Senha */}
            <Card className="animate-fade-in border-border/50 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Alterar Senha</CardTitle>
                    <CardDescription className="text-sm">
                      Atualize sua senha de acesso
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="currentPassword" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">Nova Senha</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword" className="text-sm font-medium">Confirmar</Label>
                    <Input 
                      id="confirmNewPassword" 
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirme a senha"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changingPassword}
                    className="flex-1 sm:flex-none"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {changingPassword ? "Alterando..." : "Alterar Senha"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleForgotPassword}
                    className="text-primary hover:text-primary/80"
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Autenticação em Duas Etapas */}
            <div className="animate-fade-in [&>*]:border-border/50 [&>*]:shadow-sm [&>*:hover]:shadow-md [&>*]:transition-shadow" style={{ animationDelay: '0.2s' }}>
              <TwoFactorSettings />
            </div>

            {/* Verificação de Documentos */}
            {user?.id && (
              <div className="animate-fade-in [&>*]:border-border/50 [&>*]:shadow-sm [&>*:hover]:shadow-md [&>*]:transition-shadow" style={{ animationDelay: '0.3s' }}>
                <DocumentVerificationSection userId={user.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
