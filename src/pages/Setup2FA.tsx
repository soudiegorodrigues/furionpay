import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, Check, Smartphone, Shield, ChevronRight, Lock, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { QRCodeSVG } from 'qrcode.react';
import furionPayLogo from '@/assets/furionpay-logo-white-text.png';
export default function Setup2FA() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    mfaInfo,
    checkMFAStatus
  } = useAdminAuth();
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'backup' | 'complete'>('intro');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Check if user already has 2FA enabled
  useEffect(() => {
    const checkExisting2FA = async () => {
      if (!authLoading && isAuthenticated) {
        const info = await checkMFAStatus();
        if (info?.hasTOTPFactor) {
          // User already has 2FA, redirect to dashboard
          navigate('/admin/dashboard', {
            replace: true
          });
        }
      }
    };
    checkExisting2FA();
  }, [authLoading, isAuthenticated, checkMFAStatus, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', {
        replace: true
      });
    }
  }, [authLoading, isAuthenticated, navigate]);
  const handleStartSetup = async () => {
    setEnrolling(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      if (error) throw error;
      if (data?.totp) {
        setQrCodeUrl(data.totp.uri);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('qrcode');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao iniciar configuração'
      });
    } finally {
      setEnrolling(false);
    }
  };
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos do seu app autenticador'
      });
      return;
    }
    setVerifying(true);
    try {
      const {
        data: challengeData,
        error: challengeError
      } = await supabase.auth.mfa.challenge({
        factorId
      });
      if (challengeError) throw challengeError;
      const {
        error: verifyError
      } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });
      if (verifyError) throw verifyError;

      // Generate backup codes
      const {
        data: codes,
        error: codesError
      } = await supabase.rpc('generate_backup_codes', {
        p_count: 8
      });
      if (codesError) throw codesError;

      // Log the enrollment
      await supabase.from('mfa_audit_logs').insert({
        user_id: user?.id,
        event_type: 'enrolled'
      });
      setBackupCodes(codes || []);
      setStep('backup');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na verificação',
        description: error.message || 'Código inválido. Tente novamente.'
      });
    } finally {
      setVerifying(false);
    }
  };
  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const copyBackupCodes = async () => {
    const codesText = backupCodes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: 'Códigos copiados',
      description: 'Guarde-os em um local seguro'
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };
  const handleComplete = async () => {
    await checkMFAStatus();
    navigate('/admin/dashboard', {
      replace: true
    });
  };
  if (authLoading) {
    return <AuthLoadingScreen />;
  }
  return <div className="min-h-screen flex items-center justify-center bg-black p-3 sm:p-4 relative overflow-hidden dark">
      <AuthBackground />

      <Card className="max-w-lg w-full relative z-10 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-black/60">
        <CardContent className="p-4 sm:p-6 md:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={furionPayLogo} alt="FurionPay" className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.35)]" />
          </div>

          {/* Step: Intro */}
          {step === 'intro' && <div className="space-y-3 sm:space-y-4 animate-fade-in">
              <div className="text-center space-y-1.5">
                <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 sm:mb-3">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Proteja sua conta
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Configure a autenticação em duas etapas para maior segurança
                </p>
              </div>

              <div className="space-y-2 sm:space-y-2.5 pt-1 sm:pt-2">
                <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0">
                    <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground text-xs sm:text-sm">App Autenticador</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                      Google Authenticator, Authy ou similar
                    </p>
                    
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0">
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground text-xs sm:text-sm">Proteção Extra</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                      Sua conta permanece segura mesmo com senha comprometida
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0">
                    <KeyRound className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground text-xs sm:text-sm">Códigos de Backup</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                      Códigos de emergência para recuperação de acesso
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleStartSetup} disabled={enrolling} className="w-full h-9 sm:h-10 text-xs sm:text-sm font-medium mt-1 sm:mt-2">
                {enrolling ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <>
                    Configurar Agora
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
                  </>}
              </Button>
            </div>}

          {/* Step: QR Code */}
          {step === 'qrcode' && <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Escaneie o QR Code
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Abra seu app autenticador e escaneie o código abaixo
                </p>
              </div>

              <div className="flex justify-center">
                <div className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl shadow-lg">
                  <QRCodeSVG value={qrCodeUrl} size={150} level="M" className="sm:hidden" />
                  <QRCodeSVG value={qrCodeUrl} size={180} level="M" className="hidden sm:block" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-center text-muted-foreground">
                  Ou insira o código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm font-mono break-all text-center">
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium" size="lg">
                Continuar
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>
            </div>}

          {/* Step: Verify */}
          {step === 'verify' && <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Digite o código
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Insira o código de 6 dígitos do seu app autenticador
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs sm:text-sm font-medium">Código de verificação</Label>
                  <Input id="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000" value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))} className="text-center text-xl sm:text-2xl font-mono tracking-widest h-12 sm:h-14" autoFocus />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setStep('qrcode')} className="flex-1 h-11 sm:h-12 text-sm sm:text-base">
                  Voltar
                </Button>
                <Button onClick={handleVerifyCode} disabled={verifying || verificationCode.length !== 6} className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-medium">
                  {verifying ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Verificar'}
                </Button>
              </div>
            </div>}

          {/* Step: Backup Codes */}
          {step === 'backup' && <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <Check className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  2FA Ativado com Sucesso!
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Guarde seus códigos de backup em local seguro
                </p>
              </div>

              <div className="p-3 sm:p-4 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Códigos de Backup</span>
                  <Button variant="ghost" size="sm" onClick={copyBackupCodes} className="h-8 text-xs sm:text-sm">
                    {copiedCodes ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    <span className="ml-1.5 sm:ml-2">Copiar</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {backupCodes.map((code, index) => <code key={index} className="p-1.5 sm:p-2 bg-background rounded-lg text-xs sm:text-sm font-mono text-center border border-border/50">
                      {code}
                    </code>)}
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-xs sm:text-sm text-warning-foreground">
                  <strong>Importante:</strong> Cada código só pode ser usado uma vez. Guarde-os offline em um local seguro.
                </p>
              </div>

              <Button onClick={handleComplete} className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium" size="lg">
                Ir para o Dashboard
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>
            </div>}
        </CardContent>
      </Card>
    </div>;
}