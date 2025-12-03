import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Loader2, Lock, Mail, UserPlus, LogIn, Ban } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
});

const AdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
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
    
    if (isResetPassword) {
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
          setIsResetPassword(false);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: validation.error.errors[0].message
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Check if user is banned
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isResetPassword ? 'Recuperar Senha' : isLogin ? 'Acessar Painel' : 'Criar Conta'}
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? 'Digite seu email para receber o link de recuperação'
              : isLogin 
                ? 'Entre com suas credenciais de administrador' 
                : 'Crie uma conta de administrador'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isResetPassword ? (
                <Mail className="h-4 w-4 mr-2" />
              ) : isLogin ? (
                <LogIn className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {isResetPassword ? 'Enviar Link' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
          
          <div className="mt-4 text-center space-y-2">
            {isLogin && !isResetPassword && (
              <button
                type="button"
                onClick={() => setIsResetPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Esqueceu a senha?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsResetPassword(false);
                setIsLogin(!isLogin);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isResetPassword 
                ? 'Voltar ao login'
                : isLogin 
                  ? 'Não tem conta? Criar conta' 
                  : 'Já tem conta? Fazer login'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked User Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Usuário Bloqueado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Sua conta foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setShowBlockedDialog(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuth;