import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Check, Shield, Smartphone, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BackupCodesDisplay } from './BackupCodesDisplay';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup = ({ onComplete, onCancel }: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [totpUri, setTotpUri] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    enrollTotp();
  }, []);

  const enrollTotp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      if (data?.totp) {
        setTotpUri(data.totp.uri);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao configurar 2FA'
      });
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite o código de 6 dígitos'
      });
      return;
    }

    setVerifying(true);
    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      // Generate backup codes
      const { data: codes, error: codesError } = await supabase.rpc('generate_backup_codes', { p_count: 8 });
      
      if (codesError) {
        console.error('Error generating backup codes:', codesError);
      } else {
        setBackupCodes(codes || []);
      }

      // Log the enrollment
      await supabase.from('mfa_audit_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: 'enrolled'
      });

      toast({
        title: 'Sucesso!',
        description: '2FA ativado com sucesso'
      });

      setStep('backup');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Código inválido'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copiado!',
      description: 'Chave secreta copiada para a área de transferência'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <BackupCodesDisplay 
        codes={backupCodes} 
        onComplete={onComplete} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Configurar Autenticação em Duas Etapas</h2>
        <p className="text-muted-foreground mt-2">
          {step === 'qr' 
            ? 'Escaneie o QR Code com seu app autenticador'
            : 'Digite o código de 6 dígitos do app'
          }
        </p>
      </div>

      {step === 'qr' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Passo 1: Escaneie o QR Code
            </CardTitle>
            <CardDescription>
              Use o Google Authenticator, Authy ou outro app compatível
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG value={totpUri} size={200} />
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Ou digite a chave manualmente:
              </Label>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={() => setStep('verify')} className="flex-1">
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Passo 2: Verificar Código
            </CardTitle>
            <CardDescription>
              Digite o código de 6 dígitos exibido no seu app autenticador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="verify-code">Código de Verificação</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={verifying || verifyCode.length !== 6}
                className="flex-1"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Verificar e Ativar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
