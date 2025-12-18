import furionLogo from '@/assets/furionpay-logo-white-text.png';
import loginHero from '@/assets/login-hero.png';

export function AuthMarketingPanel() {
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 lg:p-12 overflow-hidden">
      {/* Logo */}
      <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
        <img src={furionLogo} alt="FurionPay" className="h-12 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]" />
      </div>

      {/* Hero Image */}
      <div className="flex-1 flex items-center justify-center w-full">
        <img 
          src={loginHero} 
          alt="FurionPay Security" 
          className="max-h-[70vh] w-auto object-contain drop-shadow-[0_0_60px_rgba(239,68,68,0.3)]"
        />
      </div>
    </div>
  );
}