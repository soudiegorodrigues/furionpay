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
import authHeroImage from '@/assets/auth-hero-image.png';

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
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"]
});

type AuthMode = 'login' | 'signup' | 'reset-email' | 'reset-code' | 'reset-password';

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
        name,
        confirmPassword
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
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message === "User is banned" || error.message?.includes("banned")) {
            setShowBlockedDialog(true);
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message
            });
          }
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso"
          });
        }
      } else {
        const { error } = await signUp(email, password);
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
      default: return 'Fazer Login';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'reset-email': return 'Digite seu email para receber o código de recuperação';
      case 'reset-code': return `Enviamos um código de 6 dígitos para ${resetEmail}`;
      case 'reset-password': return 'Crie sua nova senha de acesso';
      case 'signup': return 'Preencha os dados para criar sua conta';
      default: return 'Entre com suas credenciais para continuar';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'reset-email': return 'Enviar Código';
      case 'reset-code': return 'Verificar';
      case 'reset-password': return 'Salvar Senha';
      case 'signup': return 'Criar Conta';
      default: return 'Entrar';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <img src={furionLogo} alt="FurionPay" className="h-12 mb-2" />
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="text-sm text-white/80">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding & Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-float-slow" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <div>
            <img 
              src={furionLogo} 
              alt="FurionPay" 
              className="h-12 drop-shadow-lg"
            />
          </div>

          {/* Center content with image */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-12">
            <div className="relative">
              <img 
                src={authHeroImage} 
                alt="Mulher de sucesso com notificações PIX" 
                className="max-h-[500px] object-contain drop-shadow-2xl rounded-2xl"
              />
            </div>
          </div>

          {/* Bottom text */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Bem-vindo de volta!
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Entre para continuar sua jornada conosco e escalar suas vendas.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col bg-background min-h-screen lg:min-h-0">
        {/* Mobile header with logo */}
        <div className="lg:hidden bg-primary p-6 flex items-center justify-center">
          <img 
            src={furionLogo} 
            alt="FurionPay" 
            className="h-10"
          />
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[420px] animate-fade-in">
            {/* Header with icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-5">
                {mode.startsWith('reset') ? (
                  <KeyRound className="h-6 w-6 text-primary" />
                ) : mode === 'signup' ? (
                  <User className="h-6 w-6 text-primary" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
                {getTitle()}
              </h1>
              <p className="text-muted-foreground">
                {getDescription()}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Nome completo
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="h-12 pl-11 pr-4 text-[15px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                      required
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'reset-email') && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 pl-11 pr-4 text-[15px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'reset-code' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Código de verificação
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                        <InputOTPSlot index={1} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                        <InputOTPSlot index={2} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                        <InputOTPSlot index={3} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                        <InputOTPSlot index={4} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                        <InputOTPSlot index={5} className="h-12 w-12 text-lg rounded-lg border-border/50 bg-secondary/50" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">
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
                </div>
              )}

              {(mode === 'login' || mode === 'signup') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Senha
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset-email')}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Esqueceu sua senha?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 pl-11 pr-12 text-[15px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>
              )}

              {(mode === 'signup' || mode === 'reset-password') && (
                <>
                  {mode === 'reset-password' && (
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                        Nova senha
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="h-12 pl-11 pr-12 text-[15px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirmar senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="h-12 pl-11 pr-12 text-[15px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'login' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={checked => setRememberMe(checked as boolean)}
                    className="h-4 w-4 rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Lembrar-me
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-[15px] font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
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
            <div className="mt-8 text-center">
              {mode.startsWith('reset') ? (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  <ArrowRight className="h-3 w-3 rotate-180" />
                  Voltar ao login
                </button>
              ) : mode === 'login' ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não tem uma conta?{' '}
                  <Link
                    to="/cadastro"
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Registre-se
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
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

        {/* Footer */}
        <div className="p-6 text-center lg:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FurionPay. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Blocked User Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-semibold">
              Usuário Bloqueado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Sua conta foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setShowBlockedDialog(false)} className="rounded-xl">
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuth;