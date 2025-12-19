import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, Save, Eye, EyeOff, ExternalLink, CheckCircle2, Image, Upload, Trash2 } from "lucide-react";
import { EmailTemplatesSection } from "./EmailTemplatesSection";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

export function EmailSection() {
  const [resendApiKey, setResendApiKey] = useState("");
  const [realApiKey, setRealApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [emailLogoUrl, setEmailLogoUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSender, setIsSavingSender] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [hasExistingSender, setHasExistingSender] = useState(false);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Use admin settings function to get global settings (user_id IS NULL)
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      if (error) throw error;

      if (data) {
        const settings = data as { key: string; value: string }[];
        const apiKey = settings.find(s => s.key === 'resend_api_key');
        if (apiKey?.value) {
          setHasExistingKey(true);
          setResendApiKey('re_••••••••••••••••••••••••');
        }
        const sender = settings.find(s => s.key === 'resend_sender_email');
        if (sender?.value) {
          setHasExistingSender(true);
          setSenderEmail(sender.value);
        }
        const logo = settings.find(s => s.key === 'email_logo_url');
        if (logo?.value) {
          setHasExistingLogo(true);
          setEmailLogoUrl(logo.value);
        }
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
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
      // Use admin settings function to save global settings
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'resend_api_key',
        setting_value: resendApiKey
      });

      if (error) throw error;

      setRealApiKey(resendApiKey);
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

  const handleSaveSender = async () => {
    if (!senderEmail || !senderEmail.includes('@')) {
      toast({
        title: "Erro",
        description: "Digite um email válido",
        variant: "destructive"
      });
      return;
    }

    setIsSavingSender(true);
    try {
      // Use admin settings function to save global settings
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'resend_sender_email',
        setting_value: senderEmail
      });

      if (error) throw error;

      setHasExistingSender(true);

      toast({
        title: "Sucesso",
        description: "Email remetente salvo com sucesso!",
      });
    } catch (error: any) {
      console.error('Error saving sender email:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar email remetente",
        variant: "destructive"
      });
    } finally {
      setIsSavingSender(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.product);
      const fileName = `${userData.user.id}/email-logo.webp`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setEmailLogoUrl(logoUrl);

      // Save URL to global settings
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'email_logo_url',
        setting_value: logoUrl
      });

      if (error) throw error;

      setHasExistingLogo(true);
      toast({
        title: "Sucesso",
        description: "Logo do email salva com sucesso!",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da logo",
        variant: "destructive"
      });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveLogoUrl = async () => {
    if (!emailLogoUrl) {
      toast({
        title: "Erro",
        description: "Digite uma URL válida",
        variant: "destructive"
      });
      return;
    }

    setIsSavingLogo(true);
    try {
      // Use admin settings function to save global settings
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'email_logo_url',
        setting_value: emailLogoUrl
      });

      if (error) throw error;

      setHasExistingLogo(true);
      toast({
        title: "Sucesso",
        description: "Logo do email salva com sucesso!",
      });
    } catch (error: any) {
      console.error('Error saving logo URL:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar URL da logo",
        variant: "destructive"
      });
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setIsSavingLogo(true);
    try {
      // Use admin settings function to clear global settings
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'email_logo_url',
        setting_value: ''
      });

      if (error) throw error;

      setEmailLogoUrl('');
      setHasExistingLogo(false);
      toast({
        title: "Sucesso",
        description: "Logo removida com sucesso!",
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover logo",
        variant: "destructive"
      });
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleInputChange = (value: string) => {
    if (resendApiKey.includes('••••') && !value.includes('••••')) {
      setResendApiKey(value);
    } else if (!resendApiKey.includes('••••')) {
      setResendApiKey(value);
    } else {
      setResendApiKey('');
    }
  };

  const handleToggleShowApiKey = async () => {
    if (showApiKey) {
      // Hide: show masked value
      setShowApiKey(false);
      if (hasExistingKey && realApiKey) {
        setResendApiKey('re_••••••••••••••••••••••••');
      }
    } else {
      // Show: fetch real value from database
      if (hasExistingKey && !realApiKey) {
        setIsLoadingKey(true);
        try {
          const { data, error } = await supabase.rpc('get_admin_settings_auth');
          if (error) throw error;
          
          if (data) {
            const settings = data as { key: string; value: string }[];
            const apiKey = settings.find(s => s.key === 'resend_api_key');
            if (apiKey?.value) {
              setRealApiKey(apiKey.value);
              setResendApiKey(apiKey.value);
            }
          }
        } catch (error) {
          console.error('Error fetching API key:', error);
          toast({
            title: "Erro",
            description: "Erro ao buscar API Key",
            variant: "destructive"
          });
        } finally {
          setIsLoadingKey(false);
        }
      } else if (realApiKey) {
        setResendApiKey(realApiKey);
      }
      setShowApiKey(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Principal */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Configuração de Email</h2>
          <p className="text-muted-foreground text-sm">Configure o envio de emails através do Resend</p>
        </div>
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
                onClick={handleToggleShowApiKey}
                disabled={isLoadingKey}
              >
                {isLoadingKey ? (
                  <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                ) : showApiKey ? (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Remetente
            {hasExistingSender && (
              <span className="ml-2 flex items-center gap-1 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Email que aparecerá como remetente nas mensagens enviadas. Deve ser de um domínio verificado no Resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sender-email">Email Remetente</Label>
            <Input
              id="sender-email"
              type="email"
              placeholder="noreply@seudominio.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use um email do domínio que você verificou no Resend (ex: noreply@seudominio.com)
            </p>
          </div>

          <Button onClick={handleSaveSender} disabled={isSavingSender}>
            <Save className="h-4 w-4 mr-2" />
            {isSavingSender ? "Salvando..." : "Salvar Email Remetente"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Logo do Email
            {hasExistingLogo && (
              <span className="ml-2 flex items-center gap-1 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Logo que aparecerá no topo dos emails enviados (recuperação de senha, desbloqueio de conta, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailLogoUrl && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <img 
                src={emailLogoUrl} 
                alt="Logo do email" 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isSavingLogo}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="logo-url">URL da Logo</Label>
            <Input
              id="logo-url"
              type="url"
              placeholder="https://seusite.com/logo.png"
              value={emailLogoUrl}
              onChange={(e) => setEmailLogoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Cole a URL de uma imagem ou faça upload abaixo
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSaveLogoUrl} disabled={isSavingLogo || !emailLogoUrl}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingLogo ? "Salvando..." : "Salvar URL"}
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingLogo ? "Enviando..." : "Fazer Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmailTemplatesSection />
    </div>
  );
}
