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
import { useTheme } from 'next-themes';
import { QRCodeSVG } from 'qrcode.react';
import furionPayLogoLight from '@/assets/furionpay-logo-dark-text.png';
import furionPayLogoDark from '@/assets/furionpay-logo-white-text.png';

export default function Setup2FA() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { user, loading: authLoading, isAuthenticated, mfaInfo, checkMFAStatus } = useAdminAuth();
  
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
          navigate('/admin/dashboard', { replace: true });
        }
      }
    };
    checkExisting2FA();
  }, [authLoading, isAuthenticated, checkMFAStatus, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleStartSetup = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
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
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      // Generate backup codes
      const { data: codes, error: codesError } = await supabase.rpc('generate_backup_codes', { p_count: 8 });
      
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
    navigate('/admin/dashboard', { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-pink-500/30 via-pink-500/10 to-transparent rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-radial from-blue-500/25 via-blue-500/10 to-transparent rounded-full blur-3xl animate-drift" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-white/10 via-white/5 to-transparent rounded-full blur-2xl" />
        
        {/* Floating soft circles */}
        <div className="absolute top-[15%] right-[20%] w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float-slow" />
        <div className="absolute bottom-[20%] left-[15%] w-40 h-40 bg-pink-400/15 rounded-full blur-2xl animate-drift" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] right-[10%] w-24 h-24 bg-blue-400/20 rounded-full blur-xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        
        {/* Subtle decorative dots */}
        <div className="absolute top-[25%] left-[8%] w-3 h-3 bg-white/40 rounded-full animate-pulse-glow" />
        <div className="absolute top-[70%] right-[25%] w-2 h-2 bg-white/50 rounded-full animate-drift" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-[35%] left-[30%] w-2.5 h-2.5 bg-pink-300/50 rounded-full animate-float-slow" style={{ animationDelay: '0.3s' }} />
      </div>

      <Card className="max-w-lg w-full relative z-10 border-white/20 shadow-2xl shadow-purple-900/30 backdrop-blur-md bg-white/95 dark:bg-slate-900/90">
        <CardContent className="p-6 md:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={theme === "dark" ? furionPayLogoDark : furionPayLogoLight} 
              alt="FurionPay" 
              className="h-12 md:h-14 w-auto object-contain" 
            />
          </div>

          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Proteja sua conta
                </h1>
                <p className="text-muted-foreground text-base md:text-lg">
                  Configure a autenticação em duas etapas para maior segurança
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">App Autenticador</h3>
                    <p className="text-sm text-muted-foreground">
                      Use Google Authenticator, Authy ou similar para gerar códigos
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Proteção Extra</h3>
                    <p className="text-sm text-muted-foreground">
                      Mesmo que sua senha seja comprometida, sua conta estará segura
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Códigos de Backup</h3>
                    <p className="text-sm text-muted-foreground">
                      Você receberá códigos de emergência caso perca acesso ao app
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartSetup} 
                disabled={enrolling}
                className="w-full h-12 text-base font-medium mt-4"
                size="lg"
              >
                {enrolling ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Configurar Agora
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step: QR Code */}
          {step === 'qrcode' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Escaneie o QR Code
                </h2>
                <p className="text-muted-foreground">
                  Abra seu app autenticador e escaneie o código abaixo
                </p>
              </div>

              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG value={qrCodeUrl} size={180} level="M" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">
                  Ou insira o código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all text-center">
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => setStep('verify')} 
                className="w-full h-12 text-base font-medium"
                size="lg"
              >
                Continuar
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Digite o código
                </h2>
                <p className="text-muted-foreground">
                  Insira o código de 6 dígitos do seu app autenticador
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">Código de verificação</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl font-mono tracking-widest h-14"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('qrcode')}
                  className="flex-1 h-12"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 h-12 text-base font-medium"
                >
                  {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar'}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Backup Codes */}
          {step === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <Check className="h-7 w-7 text-green-500" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  2FA Ativado com Sucesso!
                </h2>
                <p className="text-muted-foreground">
                  Guarde seus códigos de backup em local seguro
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Códigos de Backup</span>
                  <Button variant="ghost" size="sm" onClick={copyBackupCodes}>
                    {copiedCodes ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2">Copiar</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="p-2 bg-background rounded-lg text-sm font-mono text-center border border-border/50">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-sm text-warning-foreground">
                  <strong>Importante:</strong> Cada código só pode ser usado uma vez. Guarde-os offline em um local seguro.
                </p>
              </div>

              <Button 
                onClick={handleComplete}
                className="w-full h-12 text-base font-medium"
                size="lg"
              >
                Ir para o Dashboard
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
