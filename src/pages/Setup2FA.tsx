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
  const { toast } = useToast();
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
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-3 sm:p-4 relative overflow-hidden dark">
      <AuthBackground />

      <Card className="max-w-lg w-full relative z-10 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-black/60">
        <CardContent className="p-4 sm:p-6 md:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <img 
              src={furionPayLogo}
              alt="FurionPay" 
              className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.35)]" 
            />
          </div>

          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  Proteja sua conta
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                  Configure a autenticação em duas etapas para maior segurança
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base">App Autenticador</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use Google Authenticator, Authy ou similar para gerar códigos
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <a 
                        href="#" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="transition-opacity hover:opacity-80"
                        aria-label="Baixar no Google Play"
                      >
                        <svg className="h-7 sm:h-9" viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg">
                          <rect width="135" height="40" rx="5" fill="#000"/>
                          <path d="M47.418 10.24c0 .93-.276 1.67-.828 2.221-.627.66-1.444.99-2.446.99-.963 0-1.783-.334-2.458-1.003-.675-.67-1.012-1.493-1.012-2.472 0-.98.337-1.802 1.012-2.471.675-.67 1.495-1.004 2.458-1.004.48 0 .94.096 1.377.286.438.19.788.447 1.05.766l-.59.59c-.438-.527-1.037-.79-1.798-.79-.7 0-1.304.248-1.811.745-.508.498-.762 1.144-.762 1.94 0 .795.254 1.44.762 1.938.507.497 1.111.746 1.811.746.74 0 1.358-.25 1.851-.75.32-.325.505-.777.553-1.357h-2.404v-.81h3.21c.032.17.05.334.05.494l-.025-.06z" fill="#fff"/>
                          <path d="M52.003 7.704h-2.89v2.196h2.606v.81h-2.606v2.195h2.89v.824h-3.75V6.88h3.75v.824zM55.58 13.73h-.86V7.704h-1.77V6.88h4.4v.824h-1.77v6.025zM60.935 13.73V6.88h.86v6.848h-.86zM65.573 13.73h-.86V7.704H62.94V6.88h4.4v.824h-1.77l.003 6.025zM74.645 12.892c-.66.68-1.48 1.02-2.458 1.02-.978 0-1.798-.34-2.458-1.02-.66-.68-.99-1.5-.99-2.456 0-.956.33-1.776.99-2.455.66-.68 1.48-1.02 2.458-1.02.973 0 1.79.342 2.453 1.024.662.682.993 1.5.993 2.45 0 .957-.33 1.777-.988 2.457zm-4.274-.565c.497.507 1.104.76 1.816.76.712 0 1.32-.253 1.816-.76.498-.506.746-1.15.746-1.93 0-.78-.248-1.424-.746-1.93-.497-.508-1.104-.762-1.816-.762-.712 0-1.32.254-1.816.762-.497.506-.746 1.15-.746 1.93 0 .78.249 1.424.746 1.93zM76.502 13.73V6.88h1.047l3.257 5.342h.037l-.037-1.324V6.88h.86v6.848h-.897l-3.408-5.608h-.037l.037 1.324v4.284h-.86z" fill="#fff"/>
                          <path d="M68.136 21.753c-2.278 0-4.132 1.733-4.132 4.124 0 2.374 1.854 4.125 4.132 4.125 2.28 0 4.133-1.75 4.133-4.125 0-2.39-1.853-4.124-4.133-4.124zm0 6.626c-1.249 0-2.327-1.032-2.327-2.502 0-1.487 1.078-2.502 2.327-2.502 1.25 0 2.328 1.015 2.328 2.502 0 1.47-1.078 2.502-2.328 2.502zm-9.014-6.626c-2.277 0-4.131 1.733-4.131 4.124 0 2.374 1.854 4.125 4.131 4.125 2.28 0 4.133-1.75 4.133-4.125 0-2.39-1.854-4.124-4.133-4.124zm0 6.626c-1.248 0-2.327-1.032-2.327-2.502 0-1.487 1.079-2.502 2.327-2.502 1.25 0 2.328 1.015 2.328 2.502 0 1.47-1.078 2.502-2.328 2.502zm-10.727-5.36v1.744h4.168c-.125.978-.45 1.693-.945 2.197-.607.607-1.554 1.27-3.223 1.27-2.569 0-4.577-2.072-4.577-4.64 0-2.57 2.008-4.641 4.577-4.641 1.386 0 2.398.545 3.145 1.248l1.232-1.232c-1.04-.996-2.426-1.76-4.377-1.76-3.523 0-6.485 2.87-6.485 6.385 0 3.515 2.962 6.385 6.485 6.385 1.903 0 3.337-.625 4.46-1.794 1.153-1.153 1.513-2.777 1.513-4.089 0-.406-.031-.781-.094-1.093h-5.88l.001.02zm43.86 1.354c-.344-.923-1.396-2.626-3.543-2.626-2.13 0-3.902 1.676-3.902 4.124 0 2.31 1.755 4.125 4.106 4.125 1.897 0 2.995-1.16 3.449-1.835l-1.411-.94c-.47.69-1.113 1.146-2.038 1.146-.923 0-1.58-.423-2.003-1.253l5.529-2.287-.187-.453zm-5.64 1.378c-.047-1.595 1.236-2.407 2.158-2.407.72 0 1.33.36 1.533.877l-3.69 1.53zm-4.474 4h1.806V17.398h-1.806v12.353zm-2.96-7.218h-.062c-.408-.487-1.19-.926-2.18-.926-2.07 0-3.966 1.82-3.966 4.142 0 2.305 1.896 4.108 3.966 4.108.99 0 1.772-.44 2.18-.943h.063v.597c0 1.586-.846 2.437-2.21 2.437-1.114 0-1.803-.801-2.088-1.476l-1.57.655c.46 1.113 1.682 2.478 3.657 2.478 2.131 0 3.933-1.255 3.933-4.313V21.94h-1.724v.593zm-2.085 5.715c-1.25 0-2.294-1.05-2.294-2.49 0-1.455 1.044-2.517 2.294-2.517 1.234 0 2.21 1.063 2.21 2.518 0 1.44-.976 2.49-2.21 2.49zm23.71-10.78h-4.32v12.354h1.8v-4.68h2.52c2.003 0 3.97-1.45 3.97-3.838 0-2.386-1.967-3.836-3.97-3.836zm.047 5.953h-2.567v-4.24h2.567c1.352 0 2.12 1.12 2.12 2.12 0 .98-.768 2.12-2.12 2.12zm11.155-1.772c-1.31 0-2.663.577-3.224 1.854l1.6.666c.343-.666.98-.884 1.65-.884.938 0 1.887.562 1.903 1.556v.125c-.327-.188-1.028-.468-1.887-.468-1.73 0-3.49.95-3.49 2.725 0 1.62 1.417 2.665 3.007 2.665 1.216 0 1.887-.545 2.307-1.184h.063v.934h1.742v-4.648c0-2.15-1.605-3.34-3.671-3.34zm-.218 6.634c-.592 0-1.417-.296-1.417-1.028 0-.935 1.028-1.294 1.918-1.294.796 0 1.17.172 1.65.405-.14 1.123-1.106 1.917-2.15 1.917zm10.244-6.368l-2.07 5.243h-.063l-2.148-5.243h-1.946l3.224 7.34-1.837 4.078h1.887l4.968-11.418h-2.014zm-16.344 7.746h1.806V17.398h-1.806v12.353z" fill="#fff"/>
                          <path d="M10.435 7.538c-.278.292-.442.737-.442 1.315v22.298c0 .578.164 1.023.442 1.315l.07.068 12.49-12.491v-.295L10.504 7.47l-.07.068z" fill="url(#a)"/>
                          <path d="M27.16 24.207l-4.166-4.165v-.295l4.166-4.165.094.054 4.936 2.804c1.41.8 1.41 2.112 0 2.912l-4.936 2.804-.094.05z" fill="url(#b)"/>
                          <path d="M27.254 24.153l-4.26-4.26-12.56 12.56c.465.492 1.233.551 2.102.062l14.718-8.362" fill="url(#c)"/>
                          <path d="M27.254 15.635L12.536 7.273c-.869-.49-1.637-.43-2.102.062l12.56 12.558 4.26-4.258z" fill="url(#d)"/>
                          <defs>
                            <linearGradient id="a" x1="21.8" y1="8.711" x2="5.017" y2="25.494" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#00A0FF"/><stop offset=".007" stopColor="#00A1FF"/><stop offset=".26" stopColor="#00BEFF"/><stop offset=".512" stopColor="#00D2FF"/><stop offset=".76" stopColor="#00DFFF"/><stop offset="1" stopColor="#00E3FF"/>
                            </linearGradient>
                            <linearGradient id="b" x1="34.176" y1="19.894" x2="10.062" y2="19.894" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FFE000"/><stop offset=".409" stopColor="#FFBD00"/><stop offset=".775" stopColor="#FFA500"/><stop offset="1" stopColor="#FF9C00"/>
                            </linearGradient>
                            <linearGradient id="c" x1="24.827" y1="22.296" x2="2.069" y2="45.054" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FF3A44"/><stop offset="1" stopColor="#C31162"/>
                            </linearGradient>
                            <linearGradient id="d" x1="7.297" y1=".176" x2="17.46" y2="10.339" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#32A071"/><stop offset=".069" stopColor="#2DA771"/><stop offset=".476" stopColor="#15CF74"/><stop offset=".801" stopColor="#06E775"/><stop offset="1" stopColor="#00F076"/>
                            </linearGradient>
                          </defs>
                        </svg>
                      </a>
                      <a 
                        href="#" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="transition-opacity hover:opacity-80"
                        aria-label="Baixar na App Store"
                      >
                        <svg className="h-7 sm:h-9" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                          <rect width="120" height="40" rx="5" fill="#000"/>
                          <path d="M24.769 20.3a4.948 4.948 0 012.356-4.151 5.066 5.066 0 00-3.99-2.158c-1.68-.176-3.308 1.005-4.164 1.005-.872 0-2.19-.988-3.608-.958a5.315 5.315 0 00-4.473 2.728c-1.934 3.348-.491 8.269 1.361 10.976.927 1.325 2.01 2.805 3.428 2.753 1.387-.058 1.905-.885 3.58-.885 1.658 0 2.144.885 3.59.852 1.489-.025 2.426-1.332 3.32-2.67a10.962 10.962 0 001.52-3.092 4.782 4.782 0 01-2.92-4.4zM22.037 12.21a4.872 4.872 0 001.115-3.49 4.957 4.957 0 00-3.208 1.66 4.636 4.636 0 00-1.144 3.36 4.1 4.1 0 003.237-1.53z" fill="#fff"/>
                          <path d="M42.302 27.14H37.57l-1.137 3.356h-2.005l4.484-12.418h2.083l4.483 12.418h-2.039l-1.136-3.356zm-4.243-1.55h3.752l-1.85-5.446h-.051l-1.85 5.447zM55.16 25.97c0 2.813-1.506 4.62-3.779 4.62a3.07 3.07 0 01-2.848-1.583h-.043v4.484H46.63V21.442h1.8v1.506h.034a3.212 3.212 0 012.883-1.6c2.298 0 3.813 1.816 3.813 4.621zm-1.91 0c0-1.833-.948-3.038-2.393-3.038-1.42 0-2.375 1.23-2.375 3.038 0 1.824.955 3.046 2.375 3.046 1.445 0 2.392-1.197 2.392-3.046zM65.125 25.97c0 2.813-1.506 4.62-3.779 4.62a3.07 3.07 0 01-2.848-1.583h-.043v4.484h-1.859V21.442h1.799v1.506h.034a3.212 3.212 0 012.883-1.6c2.298 0 3.813 1.816 3.813 4.621zm-1.91 0c0-1.833-.948-3.038-2.393-3.038-1.42 0-2.375 1.23-2.375 3.038 0 1.824.955 3.046 2.375 3.046 1.445 0 2.393-1.197 2.393-3.046zM71.71 27.036c.138 1.231 1.334 2.04 2.97 2.04 1.566 0 2.693-.809 2.693-1.919 0-.964-.68-1.54-2.29-1.936l-1.609-.388c-2.28-.55-3.339-1.617-3.339-3.348 0-2.142 1.867-3.614 4.519-3.614 2.624 0 4.423 1.472 4.483 3.614h-1.876c-.112-1.239-1.136-1.987-2.634-1.987-1.497 0-2.521.757-2.521 1.858 0 .878.654 1.395 2.255 1.79l1.368.336c2.548.603 3.606 1.626 3.606 3.443 0 2.323-1.85 3.778-4.793 3.778-2.754 0-4.614-1.42-4.734-3.667h1.902zM83.346 19.3v2.142h1.722v1.472h-1.722v4.991c0 .776.345 1.137 1.102 1.137.204-.004.408-.018.611-.043v1.463c-.34.063-.686.092-1.032.086-1.833 0-2.548-.689-2.548-2.444v-5.19h-1.316v-1.472h1.316V19.3h1.867zM86.065 25.97c0-2.849 1.678-4.639 4.294-4.639 2.625 0 4.295 1.79 4.295 4.639 0 2.856-1.661 4.638-4.295 4.638-2.633 0-4.294-1.782-4.294-4.638zm6.695 0c0-1.954-.895-3.108-2.401-3.108s-2.4 1.162-2.4 3.108c0 1.962.894 3.106 2.4 3.106s2.401-1.144 2.401-3.106zM96.186 21.442h1.773v1.541h.043a2.16 2.16 0 012.177-1.635c.214 0 .428.023.637.07v1.738a2.598 2.598 0 00-.835-.112 1.873 1.873 0 00-1.937 2.083v5.37h-1.858v-9.055zM109.384 27.837c-.25 1.643-1.85 2.771-3.898 2.771-2.634 0-4.269-1.764-4.269-4.595 0-2.84 1.644-4.682 4.19-4.682 2.506 0 4.08 1.72 4.08 4.466v.637h-6.394v.112a2.358 2.358 0 002.436 2.564 2.048 2.048 0 002.09-1.273h1.765zm-6.282-2.702h4.526a2.177 2.177 0 00-2.22-2.298 2.292 2.292 0 00-2.306 2.298z" fill="#fff"/>
                          <path d="M37.826 8.731a2.64 2.64 0 012.808 2.965c0 1.906-1.03 3.002-2.808 3.002h-2.155V8.73h2.155zm-1.228 5.123h1.125a1.876 1.876 0 001.967-2.146 1.881 1.881 0 00-1.967-2.134h-1.125v4.28zM41.68 12.444a2.133 2.133 0 114.247 0 2.134 2.134 0 11-4.247 0zm3.333 0c0-.976-.439-1.547-1.208-1.547-.773 0-1.207.571-1.207 1.547 0 .984.434 1.55 1.207 1.55.77 0 1.208-.57 1.208-1.55zM51.573 14.698h-.922l-.93-3.317h-.07l-.927 3.317h-.913l-1.242-4.503h.902l.806 3.436h.067l.925-3.436h.852l.926 3.436h.07l.803-3.436h.889l-1.236 4.503zM53.853 10.195h.856v.715h.066a1.348 1.348 0 011.344-.802 1.465 1.465 0 011.559 1.675v2.915h-.889v-2.692c0-.724-.314-1.084-.972-1.084a1.033 1.033 0 00-1.075 1.141v2.635h-.889v-4.503zM59.094 8.437h.888v6.261h-.888V8.437zM61.218 12.444a2.133 2.133 0 114.247 0 2.134 2.134 0 11-4.247 0zm3.333 0c0-.976-.439-1.547-1.208-1.547-.773 0-1.207.571-1.207 1.547 0 .984.434 1.55 1.207 1.55.77 0 1.208-.57 1.208-1.55zM66.4 13.424c0-.81.604-1.278 1.676-1.344l1.22-.07v-.389c0-.475-.315-.744-.922-.744-.497 0-.84.182-.939.5h-.86c.09-.773.818-1.269 1.84-1.269 1.128 0 1.765.563 1.765 1.514v3.076h-.855v-.633h-.07a1.515 1.515 0 01-1.353.707 1.36 1.36 0 01-1.501-1.348zm2.895-.384v-.377l-1.1.07c-.62.042-.9.253-.9.65 0 .405.351.641.835.641a1.062 1.062 0 001.165-.984zM71.348 12.444c0-1.423.732-2.324 1.87-2.324a1.484 1.484 0 011.38.79h.067V8.437h.888v6.261h-.851v-.71h-.07a1.563 1.563 0 01-1.415.785c-1.145 0-1.869-.901-1.869-2.329zm.918 0c0 .955.45 1.53 1.203 1.53.75 0 1.212-.583 1.212-1.526 0-.938-.468-1.53-1.212-1.53-.748 0-1.203.58-1.203 1.526zM79.23 12.444a2.133 2.133 0 114.247 0 2.134 2.134 0 11-4.247 0zm3.333 0c0-.976-.438-1.547-1.208-1.547-.772 0-1.207.571-1.207 1.547 0 .984.435 1.55 1.207 1.55.77 0 1.208-.57 1.208-1.55zM84.669 10.195h.855v.715h.066a1.348 1.348 0 011.344-.802 1.465 1.465 0 011.56 1.675v2.915h-.89v-2.692c0-.724-.313-1.084-.97-1.084a1.033 1.033 0 00-1.076 1.141v2.635h-.889v-4.503zM93.515 9.074v1.141h.976v.749h-.976v2.315c0 .472.194.679.637.679.113 0 .226-.008.339-.02v.74c-.16.029-.322.044-.484.045-.988 0-1.381-.346-1.381-1.216v-2.543h-.715v-.749h.715V9.074h.89zM95.705 8.437h.88v2.481h.07a1.386 1.386 0 011.374-.806 1.483 1.483 0 011.55 1.679v2.907h-.889v-2.688c0-.72-.335-1.084-.963-1.084a1.052 1.052 0 00-1.134 1.142v2.63h-.888V8.437zM104.761 13.482a1.828 1.828 0 01-1.95 1.303 2.045 2.045 0 01-2.081-2.325 2.077 2.077 0 012.076-2.352c1.253 0 2.009.856 2.009 2.27v.31h-3.18v.05a1.19 1.19 0 001.2 1.29 1.08 1.08 0 001.019-.546h.907zm-3.126-1.451h2.275a1.086 1.086 0 00-1.109-1.167 1.152 1.152 0 00-1.166 1.167z" fill="#fff"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground text-sm sm:text-base">Proteção Extra</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Mesmo que sua senha seja comprometida, sua conta estará segura
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground text-sm sm:text-base">Códigos de Backup</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Você receberá códigos de emergência caso perca acesso ao app
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartSetup} 
                disabled={enrolling}
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium mt-2 sm:mt-4"
                size="lg"
              >
                {enrolling ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <>
                    Configurar Agora
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step: QR Code */}
          {step === 'qrcode' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
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

              <Button 
                onClick={() => setStep('verify')} 
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
                size="lg"
              >
                Continuar
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
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
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl sm:text-2xl font-mono tracking-widest h-12 sm:h-14"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('qrcode')}
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-medium"
                >
                  {verifying ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Verificar'}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Backup Codes */}
          {step === 'backup' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
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
                  {backupCodes.map((code, index) => (
                    <code key={index} className="p-1.5 sm:p-2 bg-background rounded-lg text-xs sm:text-sm font-mono text-center border border-border/50">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-xs sm:text-sm text-warning-foreground">
                  <strong>Importante:</strong> Cada código só pode ser usado uma vez. Guarde-os offline em um local seguro.
                </p>
              </div>

              <Button 
                onClick={handleComplete}
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
                size="lg"
              >
                Ir para o Dashboard
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
