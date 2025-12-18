import { Zap, Shield, BarChart3 } from 'lucide-react';
import furionLogo from '@/assets/furionpay-logo-white-text.png';

const features = [
  {
    icon: Zap,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-400/10',
    title: 'Processamento em tempo real',
    description: 'Receba suas transações instantaneamente com total segurança'
  },
  {
    icon: Shield,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Máxima segurança',
    description: 'Autenticação de dois fatores, criptografia avançada e total conformidade'
  },
  {
    icon: BarChart3,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Dashboard completo',
    description: 'Acompanhe métricas e relatórios detalhados em tempo real'
  }
];

export function AuthMarketingPanel() {
  return (
    <div className="relative h-full w-full flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-red-950/40" />
      
      {/* Animated gradient orbs - More intense */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full animate-pulse" 
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
          filter: 'blur(80px)'
        }} 
      />
      <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full animate-pulse" 
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 60%)',
          filter: 'blur(100px)',
          animationDelay: '1s'
        }} 
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full animate-pulse" 
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          filter: 'blur(120px)',
          animationDelay: '0.5s'
        }} 
      />

      {/* Floating particles - More visible */}
      <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-primary/60 rounded-full animate-float" />
      <div className="absolute top-[35%] right-[15%] w-2 h-2 bg-primary/50 rounded-full animate-float-slow" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-[30%] left-[10%] w-2 h-2 bg-primary/70 rounded-full animate-drift" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[60%] right-[25%] w-3 h-3 bg-yellow-400/50 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-[20%] right-[10%] w-2 h-2 bg-primary/40 rounded-full animate-float-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[80%] left-[30%] w-2 h-2 bg-primary/60 rounded-full animate-drift" style={{ animationDelay: '0.8s' }} />
      <div className="absolute top-[10%] right-[30%] w-1.5 h-1.5 bg-red-400/50 rounded-full animate-float" style={{ animationDelay: '1.2s' }} />
      <div className="absolute bottom-[45%] left-[25%] w-2 h-2 bg-primary/50 rounded-full animate-drift" style={{ animationDelay: '0.3s' }} />

      {/* Geometric circles - More visible */}
      <div className="absolute top-[25%] right-[5%] w-28 h-28 border-2 border-primary/15 rounded-full animate-spin-slow" />
      <div className="absolute bottom-[10%] left-[5%] w-36 h-36 border border-primary/10 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
      <div className="absolute top-[50%] right-[20%] w-16 h-16 border border-red-500/10 rounded-full animate-spin-slow" style={{ animationDelay: '2s' }} />

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mt-4 lg:mt-6">
        {/* Logo */}
        <div className="mb-12">
          <img 
            src={furionLogo} 
            alt="FurionPay" 
            className="h-10 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
          />
        </div>

        {/* Main headline */}
        <div className="space-y-4 mb-12">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Infraestrutura de pagamentos de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">
              alta performance
            </span>
          </h1>
          <p className="text-base lg:text-lg text-white/60 max-w-md leading-relaxed">
            Gerencie suas transações com segurança e controle. Uma plataforma moderna para pagamentos digitais.
          </p>
        </div>

        {/* Feature cards - Enhanced borders */}
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-primary/10 backdrop-blur-sm hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${feature.iconBg} flex items-center justify-center`}>
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="relative z-10 mt-8">
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-transparent" />
          <span>© 2025 FurionPay · Pagamentos Digitais</span>
        </div>
      </div>
    </div>
  );
}
