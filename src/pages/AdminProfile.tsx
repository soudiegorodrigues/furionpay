import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminProfile() {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

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
      </div>
    </div>
  );
}
