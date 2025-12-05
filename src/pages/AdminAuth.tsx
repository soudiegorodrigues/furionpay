import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Loader2, Lock, Mail, User, Eye, EyeOff, ArrowRight, ShieldCheck, Ban, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      default: return 'Acessar Painel';
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

  const getIcon = () => {
    if (mode.startsWith('reset')) {
      return <KeyRound className="h-7 w-7 text-primary" />;
    }
    return <ShieldCheck className="h-7 w-7 text-primary" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl" />
        </div>
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="text-sm text-white/80">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large blurred circles */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Floating shapes */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute top-40 left-20 w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4s' }} />
        <div className="absolute bottom-32 right-32 w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.5s' }} />
        <div className="absolute bottom-20 left-1/3 w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
      </div>
      <div className="w-full max-w-[400px] animate-fade-in relative z-10">
        {/* Card */}
        <div className="bg-card rounded-[18px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)] border border-white/20 p-8 md:p-10 backdrop-blur-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(34,197,94,0.3)]">
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight mb-2">
              {getTitle()}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
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
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-[52px] pl-11 pr-4 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-[52px] pl-11 pr-4 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'reset-code' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Código de verificação
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
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
                    className="text-primary hover:text-primary/80 font-medium"
                    disabled={isSubmitting}
                  >
                    Reenviar código
                  </button>
                </p>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-[52px] pl-11 pr-12 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-[52px] pl-11 pr-12 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="h-[52px] pl-11 pr-12 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
              <div className="flex items-center justify-between">
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
              className="w-full h-[52px] text-[15px] font-semibold rounded-xl bg-gradient-to-r from-primary to-[hsl(152,71%,40%)] hover:from-primary/90 hover:to-[hsl(152,71%,35%)] shadow-[0_4px_14px_-2px_rgba(34,197,94,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(34,197,94,0.5)] transition-all duration-200 active:scale-[0.98]"
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
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            {mode.startsWith('reset') ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar ao login
              </button>
            ) : mode === 'login' ? (
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Criar conta
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Blocked User Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent className="rounded-[18px] border-border/50">
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
