import { Zap, Shield, BarChart3 } from 'lucide-react';
import furionLogo from '@/assets/furionpay-logo-white-text.png';
const features = [{
  icon: Zap,
  iconColor: 'text-yellow-400',
  iconBg: 'bg-yellow-400/10',
  title: 'Processamento em tempo real',
  description: 'Receba suas transações instantaneamente com total segurança'
}, {
  icon: Shield,
  iconColor: 'text-primary',
  iconBg: 'bg-primary/10',
  title: 'Máxima segurança',
  description: 'Criptografia avançada e total conformidade'
}, {
  icon: BarChart3,
  iconColor: 'text-primary',
  iconBg: 'bg-primary/10',
  title: 'Dashboard completo',
  description: 'Métricas e relatórios em tempo real'
}];
export function AuthMarketingPanel() {
  return <div className="relative h-full flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
      {/* Content */}
      <div className="relative z-10 mt-20 lg:mt-28">
        {/* Logo */}
        <div className="mb-6">
        <img src={furionLogo} alt="FurionPay" className="h-16 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]" />
        </div>

        {/* Main headline */}
        <div className="space-y-3 mb-6">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Infraestrutura de pagamentos
            <br />
            <span className="text-primary">
              de alta performance
            </span>
          </h1>
          <p className="text-base lg:text-lg text-white/60 max-w-md leading-relaxed">
            Gerencie suas transações com segurança e controle. Uma plataforma moderna para pagamentos digitais.
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-3 max-w-md">
          {features.map((feature, index) => <div key={index} className="group flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${feature.iconBg} flex items-center justify-center`}>
                <feature.icon className={`h-4 w-4 ${feature.iconColor}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>)}
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="relative z-10 mt-8">
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-transparent" />
          
        </div>
      </div>
    </div>;
}