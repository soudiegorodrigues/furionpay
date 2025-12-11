import { Loader2 } from 'lucide-react';
import furionLogo from '@/assets/furionpay-logo-white-text.png';

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent animate-pulse" />
      
      {/* Glow effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
      <div 
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse" 
        style={{ animationDelay: '1s' }} 
      />
      
      <div className="flex flex-col items-center gap-6 relative z-10">
        <img 
          src={furionLogo} 
          alt="FurionPay" 
          className="h-16 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" 
        />
        <div className="relative">
          <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        </div>
        <span className="text-sm text-white/60 tracking-wider uppercase">Carregando...</span>
      </div>
    </div>
  );
}
