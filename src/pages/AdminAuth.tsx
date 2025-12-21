import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import furionLogo from '@/assets/furionpay-logo-white-text.png';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { 
  AuthBackground, 
  AuthLoadingScreen, 
  AuthFormFields, 
  BlockedUserDialog,
  TwoFactorVerify,
  TwoFactorRecovery
} from '@/components/auth';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
});

const signUpSchema = authSchema.extend({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" })
});

type AuthMode = 'login' | 'signup' | 'reset-email' | 'reset-code' | 'reset-password' | 'unlock-code' | '2fa-verify' | '2fa-recovery';

const AdminAuth = () => {
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<AuthMode>(() => location.pathname === '/cadastro' ? 'signup' : 'login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [pendingMfaFactorId, setPendingMfaFactorId] = useState<string | null>(null);
  
  const { signIn, signUp, isAuthenticated, loading, mfaInfo, needsMFAVerification, checkMFAStatus } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync mode with URL path changes
  useEffect(() => {
    if (location.pathname === '/cadastro') {
      setMode('signup');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  // Check if MFA verification is needed after login
  useEffect(() => {
    const checkMFA = async () => {
      if (isAuthenticated && !loading && mode !== 'reset-password' && mode !== '2fa-verify' && mode !== '2fa-recovery') {
        const needsMfa = await needsMFAVerification();
        if (needsMfa && mfaInfo?.verifiedFactors?.[0]) {
          setPendingMfaFactorId(mfaInfo.verifiedFactors[0].id);
          setMode('2fa-verify');
        } else if (!needsMfa) {
          navigate('/admin/dashboard');
        }
      }
    };
    checkMFA();
  }, [isAuthenticated, loading, navigate, mode, needsMFAVerification, mfaInfo]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    if (newMode === 'login' || newMode === 'signup') {
      setResetEmail('');
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível reenviar o código."
        });
        return;
      }

      toast({
        title: "Código reenviado!",
        description: data?.message || "Verifique sua caixa de entrada"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle sending OTP code via edge function
    if (mode === 'reset-email') {
      const emailValidation = z.string().trim().email({ message: "Email inválido" }).safeParse(email);
      if (!emailValidation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: emailValidation.error.errors[0].message
        });
        return;
      }
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke('send-password-reset', {
          body: { email }
        });

        if (error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível enviar o código. Verifique as configurações de email e tente novamente."
          });
        } else {
          setResetEmail(email);
          setMode('reset-code');
          toast({
            title: "Solicitação recebida!",
            description: data?.message || "Se o email existir, você receberá um código de 6 dígitos"
          });
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle OTP code entry - just move to password screen
    if (mode === 'reset-code') {
      if (otpCode.length !== 6) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: "Digite o código de 6 dígitos"
        });
        return;
      }
      setMode('reset-password');
      return;
    }

    // Handle new password creation with code verification
    if (mode === 'reset-password') {
      const passwordValidation = z.object({
        password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "As senhas não coincidem",
        path: ["confirmPassword"]
      }).safeParse({ password, confirmPassword });

      if (!passwordValidation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: passwordValidation.error.errors[0].message
        });
        return;
      }
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke('verify-reset-code', {
          body: { email: resetEmail, code: otpCode, newPassword: password }
        });
        if (error || data?.error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: data?.error || "Código inválido ou expirado. Tente novamente."
          });
          if (data?.error?.includes("inválido") || data?.error?.includes("expirado")) {
            setMode('reset-code');
            setOtpCode('');
          }
        } else {
          toast({
            title: "Senha alterada!",
            description: "Sua senha foi atualizada com sucesso. Faça login."
          });
          switchMode('login');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Validate form data
    if (mode === 'signup') {
      const validation = signUpSchema.safeParse({ email, password, name });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: validation.error.errors[0].message
        });
        return;
      }
    } else if (mode === 'login') {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: validation.error.errors[0].message
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        // Check if account is blocked before attempting login
        const { data: blockCheck } = await supabase.functions.invoke('check-login-attempt', {
          body: { email, loginFailed: false }
        });
        if (blockCheck?.isBlocked) {
          setIsAccountBlocked(true);
          setMode('unlock-code');
          toast({
            variant: "destructive",
            title: "Conta bloqueada",
            description: "Sua conta está bloqueada. Digite o código enviado para seu email."
          });
          setIsSubmitting(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message === "User is banned" || error.message?.includes("banned")) {
            setShowBlockedDialog(true);
          } else {
            // Track failed login attempt
            const { data: attemptData } = await supabase.functions.invoke('check-login-attempt', {
              body: { email, loginFailed: true }
            });
            if (attemptData?.isBlocked) {
              setIsAccountBlocked(true);
              setMode('unlock-code');
              toast({
                variant: "destructive",
                title: "Conta bloqueada",
                description: attemptData.message || "Sua conta foi bloqueada após 3 tentativas incorretas. Um código foi enviado para seu email."
              });
            } else {
              setRemainingAttempts(attemptData?.remainingAttempts || 0);
              toast({
                variant: "destructive",
                title: "Erro ao entrar",
                description: attemptData?.message || (error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message)
              });
            }
          }
        } else {
          // Reset login attempts on successful login
          await supabase.functions.invoke('check-login-attempt', {
            body: { email, loginFailed: false }
          });
          try {
            await supabase.rpc('reset_login_attempts' as any, { p_email: email });
          } catch {}
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso"
          });
        }
      } else if (mode === 'unlock-code') {
        // Verify unlock code
        if (otpCode.length !== 6) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Digite o código de 6 dígitos"
          });
          setIsSubmitting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('verify-unlock-code', {
          body: { email, code: otpCode }
        });
        if (error || !data?.success) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: data?.error || "Código inválido ou expirado"
          });
        } else {
          setIsAccountBlocked(false);
          setOtpCode('');
          setRemainingAttempts(3);
          setMode('login');
          toast({
            title: "Conta desbloqueada!",
            description: "Você pode fazer login novamente."
          });
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: error.message.includes("already registered") ? "Este email já está cadastrado" : error.message
          });
        } else {
          toast({
            title: "Conta criada!",
            description: "Você já pode acessar o painel"
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSuccess = () => {
    toast({
      title: "Verificação concluída!",
      description: "Autenticação de dois fatores validada"
    });
    navigate('/admin/dashboard');
  };

  const handleMfaRecoverySuccess = async () => {
    toast({
      title: "2FA desativado",
      description: "Você pode reconfigurar nas configurações de segurança"
    });
    await checkMFAStatus();
    navigate('/admin/dashboard');
  };

  const getTitle = () => {
    switch (mode) {
      case 'reset-email': return 'Recuperar Senha';
      case 'reset-code': return 'Verificar Código';
      case 'reset-password': return 'Nova Senha';
      case 'signup': return 'Criar Conta';
      case 'unlock-code': return 'Conta Bloqueada';
      case '2fa-verify': return 'Verificação 2FA';
      case '2fa-recovery': return 'Recuperar Acesso';
      default: return 'Bem-vindo de volta';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'reset-email': return 'Digite seu email para receber o código de recuperação';
      case 'reset-code': return `Enviamos um código de 6 dígitos para ${resetEmail}`;
      case 'reset-password': return 'Crie sua nova senha de acesso';
      case 'signup': return 'Preencha os dados para criar sua conta';
      case 'unlock-code': return `Digite o código de 6 dígitos enviado para ${email}`;
      case '2fa-verify': return 'Digite o código do seu autenticador';
      case '2fa-recovery': return 'Use um código de backup ou recupere via email';
      default: return 'Entre com suas credenciais para continuar';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'reset-email': return 'Enviar Código';
      case 'reset-code': return 'Verificar';
      case 'reset-password': return 'Salvar Senha';
      case 'signup': return 'Criar Conta';
      case 'unlock-code': return 'Desbloquear Conta';
      default: return 'Entrar';
    }
  };

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <>
      <PWAInstallPrompt />
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <AuthBackground />

        <div className="w-full max-w-[440px] animate-fade-in relative z-10">
          {/* Logo with glow effect */}
          <div className="flex justify-center mb-6 md:mb-10">
            <div className="relative">
              <div 
                className="absolute inset-0 blur-2xl opacity-60" 
                style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)' }} 
              />
              <img 
                src={furionLogo} 
                alt="FurionPay" 
                className="h-16 md:h-20 relative z-10 drop-shadow-[0_0_40px_rgba(239,68,68,0.4)]" 
              />
            </div>
          </div>

          {/* Card with glassmorphism */}
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-xl opacity-60" />
            
            <div className="relative bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Header */}
              <div className="text-center mb-5 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1 md:mb-2">
                  {getTitle()}
                </h1>
                <p className="text-xs md:text-sm text-white/50 leading-relaxed">
                  {getDescription()}
                </p>
              </div>

              {/* 2FA Verification Mode */}
              {mode === '2fa-verify' && pendingMfaFactorId ? (
                <TwoFactorVerify
                  factorId={pendingMfaFactorId}
                  onSuccess={handleMfaSuccess}
                  onRecovery={() => setMode('2fa-recovery')}
                />
              ) : mode === '2fa-recovery' ? (
                <TwoFactorRecovery
                  onSuccess={handleMfaRecoverySuccess}
                  onCancel={() => setMode('2fa-verify')}
                />
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                  <AuthFormFields
                    mode={mode as 'login' | 'signup' | 'reset-email' | 'reset-code' | 'reset-password' | 'unlock-code'}
                    name={name}
                    email={email}
                    password={password}
                    confirmPassword={confirmPassword}
                    otpCode={otpCode}
                    showPassword={showPassword}
                    showConfirmPassword={showConfirmPassword}
                    rememberMe={rememberMe}
                    resetEmail={resetEmail}
                    isSubmitting={isSubmitting}
                    onNameChange={setName}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    onOtpCodeChange={setOtpCode}
                    onShowPasswordChange={setShowPassword}
                    onShowConfirmPasswordChange={setShowConfirmPassword}
                    onRememberMeChange={setRememberMe}
                    onForgotPassword={() => switchMode('reset-email')}
                    onResendCode={handleResendCode}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-[15px] font-semibold rounded-xl bg-gradient-to-r from-primary to-red-500 hover:from-primary/90 hover:to-red-500/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 active:scale-[0.98] border-0" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {getButtonText()}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Footer Links */}
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                {mode.startsWith('reset') || mode === 'unlock-code' ? (
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAccountBlocked(false);
                      setOtpCode('');
                      switchMode('login');
                    }} 
                    className="text-sm text-white/50 hover:text-white/70 transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowRight className="h-3 w-3 rotate-180" />
                    Voltar ao login
                  </button>
                ) : mode === 'login' ? (
                  <p className="text-sm text-white/50">
                    Não tem uma conta?{' '}
                    <Link to="/cadastro" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                      Criar conta
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-white/50">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                      Fazer login
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/40 text-[10px] md:text-xs mt-4 md:mt-8">
            © {new Date().getFullYear()} FurionPay. Todos os direitos reservados.
          </p>
        </div>

        <BlockedUserDialog 
          open={showBlockedDialog} 
          onOpenChange={setShowBlockedDialog} 
        />
      </div>
    </>
  );
};

export default AdminAuth;
