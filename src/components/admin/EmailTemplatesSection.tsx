import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Pencil, 
  RotateCcw, 
  Save, 
  X, 
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shield,
  CreditCard,
  Key,
  UserCheck,
  Send,
  Loader2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  available_variables: string[];
  is_customized: boolean;
}

const templateIcons: Record<string, React.ReactNode> = {
  'approval_notification': <UserCheck className="h-5 w-5" />,
  'document_approved': <CheckCircle2 className="h-5 w-5" />,
  'document_rejected': <AlertCircle className="h-5 w-5" />,
  'password_reset': <Key className="h-5 w-5" />,
  'account_unlock': <Shield className="h-5 w-5" />,
  'withdrawal_approved': <CreditCard className="h-5 w-5" />,
  'withdrawal_rejected': <CreditCard className="h-5 w-5" />,
};

const defaultTemplates: Record<string, { subject: string; html_content: string }> = {
  'approval_notification': {
    subject: '🎉 Sua conta foi aprovada - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">✅ Conta Aprovada!</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Bem-vindo à FurionPay</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px;"><p style="margin: 0 0 15px 0;">Olá <strong>{userName}</strong>,</p><p style="margin: 0 0 15px 0;">Sua conta foi aprovada com sucesso! Agora você tem acesso completo à plataforma FurionPay.</p><p style="margin: 0;">Acesse sua conta e comece a receber pagamentos via PIX de forma rápida e segura.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'document_approved': {
    subject: '✅ Seus documentos foram aprovados - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">✅ Documentos Aprovados!</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Verificação concluída com sucesso</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px;"><p style="margin: 0 0 15px 0;">Seus documentos foram verificados e aprovados com sucesso!</p><p style="margin: 0;">Agora você tem acesso completo à plataforma FurionPay.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'document_rejected': {
    subject: '❌ Seus documentos precisam de atenção - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">❌ Documentos Rejeitados</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Ação necessária</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px;"><p style="margin: 0 0 15px 0;">Infelizmente, seus documentos não foram aprovados.</p><p style="margin: 0 0 15px 0;"><strong>Motivo:</strong> {reason}</p><p style="margin: 0;">Por favor, envie novos documentos para continuar o processo de verificação.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'password_reset': {
    subject: '🔐 Código de redefinição de senha - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">🔐 Redefinição de Senha</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Use o código abaixo</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center;"><p style="margin: 0 0 20px 0;">Use o código abaixo para redefinir sua senha:</p><div style="background: #1f2937; color: #10b981; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: monospace;">{code}</div><p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Este código expira em 15 minutos.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'account_unlock': {
    subject: '🔓 Código de desbloqueio de conta - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">🔓 Desbloqueio de Conta</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Sua conta foi bloqueada temporariamente</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center;"><p style="margin: 0 0 15px 0;">Detectamos várias tentativas de login malsucedidas para o email <strong>{email}</strong>.</p><p style="margin: 0 0 20px 0;">Use o código abaixo para desbloquear sua conta:</p><div style="background: #1f2937; color: #f59e0b; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: monospace;">{code}</div><p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Este código expira em 15 minutos.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'withdrawal_approved': {
    subject: '💰 Seu saque foi aprovado - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">💰 Saque Aprovado!</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Seu dinheiro está a caminho</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px;"><p style="margin: 0 0 15px 0;">Seu saque foi aprovado com sucesso!</p><div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;"><p style="margin: 0 0 10px 0;"><strong>Valor:</strong> R$ {amount}</p><p style="margin: 0 0 10px 0;"><strong>Banco:</strong> {bankName}</p><p style="margin: 0;"><strong>Chave PIX:</strong> {pixKey}</p></div><p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">O valor será creditado em sua conta em até 24 horas úteis.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  },
  'withdrawal_rejected': {
    subject: '❌ Seu saque foi rejeitado - FurionPay',
    html_content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><img src="{logoUrl}" alt="FurionPay" style="max-width: 200px; height: auto;"></div><div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0 0 10px 0; font-size: 28px;">❌ Saque Rejeitado</h1><p style="margin: 0; font-size: 16px; opacity: 0.9;">Não foi possível processar seu saque</p></div><div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 20px;"><p style="margin: 0 0 15px 0;">Infelizmente, seu saque foi rejeitado.</p><div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 15px;"><p style="margin: 0 0 10px 0;"><strong>Valor:</strong> R$ {amount}</p><p style="margin: 0 0 10px 0;"><strong>Banco:</strong> {bankName}</p><p style="margin: 0;"><strong>Chave PIX:</strong> {pixKey}</p></div><div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;"><p style="margin: 0; color: #dc2626;"><strong>Motivo:</strong> {reason}</p></div><p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">O valor foi devolvido ao seu saldo disponível.</p></div><div style="text-align: center; padding: 20px;"><p style="color: #6b7280; font-size: 14px; margin: 0;">© 2024 FurionPay. Todos os direitos reservados.</p></div></body></html>'
  }
};

export function EmailTemplatesSection() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editHtmlContent, setEditHtmlContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedTemplates = (data || []).map(t => ({
        ...t,
        available_variables: Array.isArray(t.available_variables) 
          ? t.available_variables 
          : JSON.parse(t.available_variables as string || '[]')
      }));

      setTemplates(formattedTemplates);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar templates de email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditSubject(template.subject);
    setEditHtmlContent(template.html_content);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editSubject,
          html_content: editHtmlContent,
          is_customized: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template salvo com sucesso!",
      });

      loadTemplates();
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar template",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate) return;

    const defaultTemplate = defaultTemplates[selectedTemplate.template_key];
    if (!defaultTemplate) {
      toast({
        title: "Erro",
        description: "Template padrão não encontrado",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: defaultTemplate.subject,
          html_content: defaultTemplate.html_content,
          is_customized: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template restaurado para o padrão!",
      });

      setShowResetConfirm(false);
      loadTemplates();
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error('Error resetting template:', error);
      toast({
        title: "Erro",
        description: "Erro ao restaurar template",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setEditHtmlContent(prev => prev + `{${variable}}`);
  };

  const getSampleVariables = () => {
    return {
      logoUrl: 'https://placehold.co/200x60?text=Logo',
      userName: 'João Silva',
      userEmail: 'joao@exemplo.com',
      code: '123456',
      email: 'joao@exemplo.com',
      reason: 'Documento ilegível ou inválido',
      amount: '1.500,00',
      bankName: 'Banco Inter',
      pixKey: 'joao@exemplo.com'
    };
  };

  const getPreviewHtml = () => {
    let html = editHtmlContent;
    const sampleVars = getSampleVariables();
    for (const [key, value] of Object.entries(sampleVars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      html = html.replace(regex, value);
    }
    return html;
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmailAddress) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          templateKey: selectedTemplate.template_key,
          recipientEmail: testEmailAddress,
          subject: editSubject,
          htmlContent: editHtmlContent,
          variables: getSampleVariables()
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Email de teste enviado para ${testEmailAddress}`,
      });
      setShowTestEmail(false);
      setTestEmailAddress("");
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de teste",
        variant: "destructive"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Templates de Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Templates de Email
          </CardTitle>
          <CardDescription>
            Personalize os templates de email enviados pela plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {templateIcons[template.template_key] || <Mail className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{template.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                      {template.subject}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {template.is_customized && (
                    <Badge variant="secondary" className="hidden sm:flex">
                      Customizado
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor Sheet */}
      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedTemplate && templateIcons[selectedTemplate.template_key]}
              {selectedTemplate?.name}
            </SheetTitle>
            <SheetDescription>
              Edite o assunto e o conteúdo HTML do template
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto do Email</Label>
              <Input
                id="subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Assunto do email"
              />
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>Variáveis Disponíveis</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Clique para inserir no conteúdo HTML
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate?.available_variables.map((variable) => (
                  <Button
                    key={variable}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable)}
                    className="text-xs"
                  >
                    {`{${variable}}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* HTML Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="html-content">Conteúdo HTML</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              <Textarea
                id="html-content"
                value={editHtmlContent}
                onChange={(e) => setEditHtmlContent(e.target.value)}
                placeholder="<!DOCTYPE html>..."
                className="font-mono text-xs min-h-[300px]"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                disabled={isSaving || !selectedTemplate?.is_customized}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowTestEmail(true)}
                disabled={isSaving}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Teste
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
            <DialogDescription>
              Visualização do email com valores de exemplo
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getPreviewHtml()) }}
              className="min-h-[400px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Template Padrão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja restaurar o template "{selectedTemplate?.name}" para o padrão original? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={isSaving}>
              {isSaving ? "Restaurando..." : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestEmail} onOpenChange={setShowTestEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Email de Teste
            </DialogTitle>
            <DialogDescription>
              Envie um email de teste para verificar se o template está funcionando corretamente. As variáveis serão substituídas por valores de exemplo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email de Destino</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="seu@email.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Assunto:</strong> [TESTE] {editSubject}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestEmail(false)} disabled={isSendingTest}>
              Cancelar
            </Button>
            <Button onClick={handleSendTestEmail} disabled={isSendingTest || !testEmailAddress}>
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Teste
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
