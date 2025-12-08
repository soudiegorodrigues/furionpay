import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, Eye, EyeOff, ExternalLink, CheckCircle2 } from "lucide-react";

const AdminEmail = () => {
  const [resendApiKey, setResendApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading, signOut } = useAdminAuth();

  // Load settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;

      if (data) {
        const settings = data as { key: string; value: string }[];
        const apiKey = settings.find(s => s.key === 'resend_api_key');
        if (apiKey?.value) {
          setHasExistingKey(true);
          // Show masked key
          setResendApiKey('re_••••••••••••••••••••••••');
        }
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      if (error.message?.includes('Not authenticated')) {
        await signOut();
        navigate('/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resendApiKey || resendApiKey.includes('••••')) {
      toast({
        title: "Erro",
        description: "Digite uma API Key válida",
        variant: "destructive"
      });
      return;
    }

    if (!resendApiKey.startsWith('re_')) {
      toast({
        title: "Erro",
        description: "API Key inválida. Deve começar com 're_'",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'resend_api_key',
        setting_value: resendApiKey
      });

      if (error) throw error;

      setHasExistingKey(true);
      setResendApiKey('re_••••••••••••••••••••••••');
      setShowApiKey(false);

      toast({
        title: "Sucesso",
        description: "API Key do Resend salva com sucesso!",
      });
    } catch (error: any) {
      console.error('Error saving API key:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar API Key",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (value: string) => {
    // If user is editing a masked key, clear it first
    if (resendApiKey.includes('••••') && !value.includes('••••')) {
      setResendApiKey(value);
    } else if (!resendApiKey.includes('••••')) {
      setResendApiKey(value);
    } else {
      setResendApiKey('');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminNavigation activeSection="email" />
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              Configuração de Email
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure o envio de emails através do Resend
            </p>
          </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Resend API
              {hasExistingKey && (
                <span className="ml-2 flex items-center gap-1 text-sm text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  Configurado
                </span>
              )}
            </CardTitle>
            <CardDescription>
              O Resend é usado para enviar emails transacionais como notificações de pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Como obter sua API Key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Acesse <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a> e crie uma conta</li>
                <li>Valide seu domínio em <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Domains</a></li>
                <li>Crie uma API Key em <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Keys</a></li>
                <li>Cole a chave abaixo</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-api-key">API Key do Resend</Label>
              <div className="relative">
                <Input
                  id="resend-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  value={resendApiKey}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave começa com "re_" e é usada para autenticar envios de email
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar API Key"}
              </Button>
              <Button variant="outline" asChild>
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Resend
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmail;
