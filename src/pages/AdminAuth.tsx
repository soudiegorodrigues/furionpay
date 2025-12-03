import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Loader2, Lock, Mail, User, Eye, EyeOff, ArrowRight, ShieldCheck, Ban } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
});

const signUpSchema = authSchema.extend({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type AuthMode = 'login' | 'signup' | 'reset';

const AdminAuth = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const { signIn, signUp, resetPassword, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'reset') {
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
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: error.message
          });
        } else {
          toast({
            title: "Email enviado!",
            description: "Verifique sua caixa de entrada para redefinir a senha"
          });
          setMode('login');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      const validation = signUpSchema.safeParse({ email, password, name, confirmPassword });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: validation.error.errors[0].message
        });
        return;
      }
    } else {
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
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message === "User is banned" || error.message?.includes("banned")) {
            setShowBlockedDialog(true);
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: error.message === "Invalid login credentials" 
                ? "Email ou senha incorretos" 
                : error.message
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
            description: error.message.includes("already registered")
              ? "Este email já está cadastrado"
              : error.message
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF] p-4">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="bg-card rounded-[18px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-border/50 p-8 md:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(34,197,94,0.3)]">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight mb-2">
              {mode === 'reset' ? 'Recuperar Senha' : mode === 'login' ? 'Acessar Painel' : 'Criar Conta'}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mode === 'reset'
                ? 'Digite seu email para receber o link de recuperação'
                : mode === 'login' 
                  ? 'Entre com suas credenciais para continuar' 
                  : 'Preencha os dados para criar sua conta'}
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
                    onChange={(e) => setName(e.target.value)}
                    className="h-[52px] pl-11 pr-4 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
              </div>
            )}

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
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[52px] pl-11 pr-4 text-[15px] bg-secondary/30 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
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
                    onChange={(e) => setPassword(e.target.value)}
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

            {mode === 'signup' && (
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="h-4 w-4 rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label 
                    htmlFor="remember" 
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    Lembrar-me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
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
                  {mode === 'reset' ? 'Enviar Link' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            {mode === 'reset' ? (
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

        {/* Brand */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Plataforma Doar com Amor
        </p>
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
            <AlertDialogAction 
              onClick={() => setShowBlockedDialog(false)}
              className="rounded-xl"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuth;
