import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset-email' | 'reset-code' | 'reset-password' | 'unlock-code';

interface AuthFormFieldsProps {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  otpCode: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  rememberMe: boolean;
  resetEmail: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onOtpCodeChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onShowConfirmPasswordChange: (value: boolean) => void;
  onRememberMeChange: (value: boolean) => void;
  onForgotPassword: () => void;
  onResendCode: () => void;
}

export function AuthFormFields({
  mode,
  name,
  email,
  password,
  confirmPassword,
  otpCode,
  showPassword,
  showConfirmPassword,
  rememberMe,
  resetEmail,
  isSubmitting,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onOtpCodeChange,
  onShowPasswordChange,
  onShowConfirmPasswordChange,
  onRememberMeChange,
  onForgotPassword,
  onResendCode,
}: AuthFormFieldsProps) {
  return (
    <>
      {/* Name field (signup only) */}
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nome completo
          </Label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input 
              id="name" 
              type="text" 
              placeholder="Seu nome" 
              value={name} 
              onChange={e => onNameChange(e.target.value)} 
              className="h-12 pl-11 pr-4 text-[15px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400" 
              required 
            />
          </div>
        </div>
      )}

      {/* Email field */}
      {(mode === 'login' || mode === 'signup' || mode === 'reset-email') && (
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </Label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={e => onEmailChange(e.target.value)} 
              className="h-12 pl-11 pr-4 text-[15px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400" 
              required 
            />
          </div>
        </div>
      )}

      {/* OTP Code field */}
      {(mode === 'reset-code' || mode === 'unlock-code') && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            {mode === 'unlock-code' ? 'Código de desbloqueio' : 'Código de verificação'}
          </Label>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={onOtpCodeChange}>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg rounded-lg border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:ring-primary/20" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {mode === 'reset-code' && (
            <p className="text-xs text-center text-gray-500 mt-3">
              Não recebeu?{' '}
              <button 
                type="button" 
                onClick={onResendCode}
                className="text-primary hover:text-primary/80 font-medium transition-colors" 
                disabled={isSubmitting}
              >
                Reenviar código
              </button>
            </p>
          )}
          {mode === 'unlock-code' && (
            <p className="text-xs text-center text-gray-500 mt-3">
              Um código de desbloqueio foi enviado para seu email.
            </p>
          )}
        </div>
      )}

      {/* Password field (login/signup) */}
      {(mode === 'login' || mode === 'signup') && (
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            {mode === 'signup' ? 'Criar senha' : 'Senha'}
          </Label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password} 
              onChange={e => onPasswordChange(e.target.value)} 
              className="h-12 pl-11 pr-12 text-[15px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400" 
              required 
              minLength={6} 
            />
            <button 
              type="button" 
              onClick={() => onShowPasswordChange(!showPassword)} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      )}

      {/* Reset password fields */}
      {mode === 'reset-password' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
              Nova senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input 
                id="newPassword" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password} 
                onChange={e => onPasswordChange(e.target.value)} 
                className="h-12 pl-11 pr-12 text-[15px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400" 
                required 
                minLength={6} 
              />
              <button 
                type="button" 
                onClick={() => onShowPasswordChange(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirmar senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={e => onConfirmPasswordChange(e.target.value)} 
                className="h-12 pl-11 pr-12 text-[15px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400" 
                required 
                minLength={6} 
              />
              <button 
                type="button" 
                onClick={() => onShowConfirmPasswordChange(!showConfirmPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Remember me and forgot password */}
      {mode === 'login' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberMe} 
              onCheckedChange={checked => onRememberMeChange(checked as boolean)} 
              className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
            />
            <Label htmlFor="remember" className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
              Lembrar-me
            </Label>
          </div>
          <button 
            type="button" 
            onClick={onForgotPassword} 
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Esqueceu a senha?
          </button>
        </div>
      )}
    </>
  );
}
