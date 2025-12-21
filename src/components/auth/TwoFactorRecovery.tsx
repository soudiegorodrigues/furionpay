import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface TwoFactorRecoveryProps {
  email?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const TwoFactorRecovery = ({ email: propEmail, onSuccess, onCancel }: TwoFactorRecoveryProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'request' | 'verify'>(propEmail ? 'request' : 'email');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(propEmail || '');

  const handleSubmitEmail = async () => {
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite seu email'
      });
      return;
    }
    setStep('request');
  };

  const handleRequestCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-2fa', {
        body: { email }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.error
        });
        return;
      }

      toast({
        title: 'Código enviado!',
        description: 'Verifique sua caixa de entrada'
      });
      setStep('verify');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao enviar código'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite o código de 6 dígitos'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-reset', {
        body: { email, code }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.error
        });
        return;
      }

      toast({
        title: 'Sucesso!',
        description: '2FA desativado. Você pode fazer login normalmente.'
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Código inválido ou expirado'
      });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Recuperar Acesso</h2>
        <p className="text-white/50 mt-2">
          {step === 'email'
            ? 'Digite seu email para recuperar o acesso'
            : step === 'request'
            ? 'Enviaremos um código para seu email'
            : `Digite o código enviado para ${email}`
          }
        </p>
      </div>

      {step === 'email' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="recovery-email" className="text-white/70">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <Button 
            onClick={handleSubmitEmail} 
            disabled={!email.trim()}
            className="w-full h-12"
          >
            Continuar
          </Button>
        </div>
      ) : step === 'request' ? (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-white/50" />
              <div>
                <p className="text-sm text-white/70">Email de recuperação</p>
                <p className="font-medium text-white">{email}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/40 text-center">
            Ao confirmar, seu 2FA será desativado e você poderá fazer login normalmente. 
            Você pode reativar o 2FA depois nas configurações.
          </p>

          <Button 
            onClick={handleRequestCode} 
            disabled={loading}
            className="w-full h-12"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Código de Recuperação
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            onClick={handleVerifyCode} 
            disabled={loading || code.length !== 6}
            className="w-full h-12"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Desativar 2FA'
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setStep('request'); setCode(''); }}
            className="w-full text-sm text-white/50 hover:text-white/70 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Reenviar código
          </button>
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Voltar
        </button>
      )}
    </div>
  );
};
