import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Loader2, Lock, Mail, User, Eye, EyeOff, ArrowRight, Ban, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import furionLogo from '@/assets/furionpay-logo-white-text.png';

const authSchema = z.object({
  email: z.string().trim().email({
    message: "Email inválido"
  }),
  password: z.string().min(6, {
    message: "Senha deve ter no mínimo 6 caracteres"
  })
});

const signUpSchema = authSchema.extend({
  name: z.string().min(2, {
    message: "Nome deve ter no mínimo 2 caracteres"
  })
});

type AuthMode = 'login' | 'signup' | 'reset-email' | 'reset-code' | 'reset-password' | 'unlock-code';

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
  const [mode, setMode] = useState<AuthMode>(() => 
    location.pathname === '/cadastro' ? 'signup' : 'login'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  // Sync mode with URL path changes
  useEffect(() => {
    if (location.pathname === '/cadastro') {
      setMode('signup');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const {
    signIn,
    signUp,
    isAuthenticated,
    isAdmin,
    loading
  } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && !loading && mode !== 'reset-password') {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, loading, navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle sending OTP code via edge function
    if (mode === 'reset-email') {
      const emailValidation = z.string().trim().email({
        message: "Email inválido"
      }).safeParse(email);

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
            description: "Não foi possível enviar o código. Tente novamente."
          });
        } else {
          setResetEmail(email);
          setMode('reset-code');
          toast({
            title: "Código enviado!",
            description: "Verifique sua caixa de entrada e copie o código de 6 dígitos"
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
      
      // Move to password screen - verification happens when submitting new password
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
          body: { 
            email: resetEmail, 
            code: otpCode,
            newPassword: password 
          }
        });
        
        if (error || data?.error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: data?.error || "Código inválido ou expirado. Tente novamente."
          });
          // Go back to code entry if code is invalid
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

    if (mode === 'signup') {
      const validation = signUpSchema.safeParse({
        email,
        password,
        name
      });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: validation.error.errors[0].message
        });
        return;
      }
    } else {
      const validation = authSchema.safeParse({
        email,
        password
      });
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

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    if (newMode === 'login' || newMode === 'signup') {
      setResetEmail('');
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'reset-email': return 'Recuperar Senha';
      case 'reset-code': return 'Verificar Código';
      case 'reset-password': return 'Nova Senha';
      case 'signup': return 'Criar Conta';
      case 'unlock-code': return 'Conta Bloqueada';
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent animate-pulse" />
        
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <img src={furionLogo} alt="FurionPay" className="h-16 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
          <div className="relative">
            <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <span className="text-sm text-white/60 tracking-wider uppercase">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950/40" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow - top right */}
        <div 
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        
        {/* Secondary glow - bottom left */}
        <div 
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animationDelay: '1.5s',
          }}
        />
        
        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* Animated lines */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-20 right-[15%] w-1.5 h-1.5 bg-primary/60 rounded-full animate-float" />
        <div className="absolute top-[30%] left-[10%] w-1 h-1 bg-primary/40 rounded-full animate-float-slow" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[25%] right-[20%] w-2 h-2 bg-primary/50 rounded-full animate-drift" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-[30%] w-1 h-1 bg-primary/50 rounded-full animate-float-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-2 h-2 bg-primary/40 rounded-full animate-drift" style={{ animationDelay: '0.8s' }} />
        
        {/* Geometric accents */}
        <div className="absolute top-[20%] left-[8%] w-20 h-20 border border-primary/10 rounded-full animate-spin-slow" />
        <div className="absolute bottom-[15%] right-[8%] w-32 h-32 border border-primary/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-[40%] right-[5%] w-16 h-16 border border-primary/10 rotate-45 animate-float-slow" />
      </div>

      <div className="w-full max-w-[440px] animate-fade-in relative z-10">
        {/* Logo with glow effect */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div 
              className="absolute inset-0 blur-2xl opacity-60"
              style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)' }}
            />
            <img 
              src={furionLogo} 
              alt="FurionPay" 
              className="h-20 relative z-10 drop-shadow-[0_0_40px_rgba(239,68,68,0.4)]"
            />
          </div>
        </div>

        {/* Card with glassmorphism */}
        <div className="relative">
          {/* Card glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-xl opacity-60" />
          
          <div className="relative bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {/* Header with icon */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-5">
                <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl" />
                {mode.startsWith('reset') ? (
                  <KeyRound className="h-8 w-8 text-primary relative z-10" />
                ) : mode === 'signup' ? (
                  <User className="h-8 w-8 text-primary relative z-10" />
                ) : mode === 'unlock-code' ? (
                  <Ban className="h-8 w-8 text-primary relative z-10" />
                ) : (
                  <Lock className="h-8 w-8 text-primary relative z-10" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                {getTitle()}
              </h1>
              <p className="text-sm text-white/50 leading-relaxed">
                {getDescription()}
              </p>
            </div>


            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-white/80">
                  Nome completo
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-12 pl-11 pr-4 text-[15px] bg-white/5 border-white/10 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all placeholder:text-white/30"
                    required
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset-email') && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/80">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-12 pl-11 pr-4 text-[15px] bg-white/5 border-white/10 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all placeholder:text-white/30"
                    required
                  />
                </div>
              </div>
            )}

            {(mode === 'reset-code' || mode === 'unlock-code') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white/80">
                  {mode === 'unlock-code' ? 'Código de desbloqueio' : 'Código de verificação'}
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg rounded-lg border-white/10 bg-white/5 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {mode === 'reset-code' && (
                  <p className="text-xs text-center text-white/40 mt-3">
                    Não recebeu?{' '}
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSubmitting(true);
                        await supabase.functions.invoke('send-password-reset', {
                          body: { email: resetEmail }
                        });
                        setIsSubmitting(false);
                        toast({
                          title: "Código reenviado!",
                          description: "Verifique sua caixa de entrada"
                        });
                      }}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                      disabled={isSubmitting}
                    >
                      Reenviar código
                    </button>
                  </p>
                )}
                {mode === 'unlock-code' && (
                  <p className="text-xs text-center text-white/40 mt-3">
                    Um código de desbloqueio foi enviado para seu email.
                  </p>
                )}
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-white/80">
                  {mode === 'signup' ? 'Criar senha' : 'Senha'}
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-12 text-[15px] bg-white/5 border-white/10 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all placeholder:text-white/30"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset-password' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-white/80">
                    Nova senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 pl-11 pr-12 text-[15px] bg-white/5 border-white/10 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all placeholder:text-white/30"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
                    Confirmar senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="h-12 pl-11 pr-12 text-[15px] bg-white/5 border-white/10 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all placeholder:text-white/30"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={checked => setRememberMe(checked as boolean)}
                    className="h-4 w-4 rounded border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember" className="text-sm text-white/50 cursor-pointer hover:text-white/70 transition-colors">
                    Lembrar-me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('reset-email')}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

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
                <Link
                  to="/cadastro"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Criar conta
                </Link>
              </p>
            ) : (
              <p className="text-sm text-white/50">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Fazer login
                </Link>
              </p>
            )}
          </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-white/40 text-xs mt-8">
          © {new Date().getFullYear()} FurionPay. Todos os direitos reservados.
        </p>
      </div>

      {/* Blocked User Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent className="rounded-2xl bg-black/90 border-white/10 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-semibold text-white">
              Usuário Bloqueado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/50">
              Sua conta foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setShowBlockedDialog(false)} className="rounded-xl bg-primary hover:bg-primary/90">
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuth;