import { useState, useEffect } from "react";
import { Heart, Sprout, ShoppingBasket, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { cn } from "@/lib/utils";
import pixLogo from "@/assets/pix-logo.png";
import vakinhaLogo from "@/assets/vakinha-logo.png";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";

interface DonationPopupLandingProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  isPreview?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

const DONATION_AMOUNTS: { amount: number; badge?: string }[] = [
  { amount: 30 },
  { amount: 50 },
  { amount: 75 },
  { amount: 100, badge: "Doe com Amor 💚" },
  { amount: 200 },
  { amount: 500 },
  { amount: 750 },
  { amount: 1000 },
];

const BOOST_OPTIONS = [
  { id: "hearts", label: "10 corações", price: 10.99, icon: Heart, color: "text-emerald-500", bgColor: "bg-emerald-100" },
  { id: "impact", label: "Ajudar Uma Vida a Florescer", price: 25, icon: Sprout, color: "text-amber-600", bgColor: "bg-amber-100" },
  { id: "basket", label: "Doar cesta básica", price: 65, icon: ShoppingBasket, color: "text-orange-500", bgColor: "bg-orange-100" },
];

type Step = "select" | "upsell" | "loading" | "pix";

export const DonationPopupLanding = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
  showCloseButton = false,
  isPreview = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupLandingProps) => {
  const [customAmount, setCustomAmount] = useState<string>("0,00");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const { toast } = useToast();
  const { trackEventWithCAPI, utmParams: contextUtmParams } = usePixel();
  const { getFingerprint } = useDeviceFingerprint();
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) {
      return propUtmParams;
    }
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) {
      return contextUtmParams;
    }
    // Fallback: recupera diretamente do storage
    const savedParams = getSavedUTMParams();
    console.log('[UTM DEBUG] DonationPopupLanding - Usando UTMs do storage:', savedParams);
    return savedParams;
  };
  
  const utmParams = getEffectiveUtmParams();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(null);
      setCustomAmount("0,00");
      setSelectedBoosts([]);
    }
  }, [isOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const parseCustomAmount = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length === 0) value = '0';
    const numValue = parseInt(value, 10);
    const formatted = (numValue / 100).toFixed(2).replace('.', ',');
    setCustomAmount(formatted);
    setSelectedAmount(null);
  };

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("0,00");
  };

  const toggleBoost = (boostId: string) => {
    setSelectedBoosts(prev => 
      prev.includes(boostId) 
        ? prev.filter(id => id !== boostId)
        : [...prev, boostId]
    );
  };

  const calculateTotal = () => {
    const baseAmount = selectedAmount || parseCustomAmount(customAmount);
    const boostTotal = selectedBoosts.reduce((sum, boostId) => {
      const boost = BOOST_OPTIONS.find(b => b.id === boostId);
      return sum + (boost?.price || 0);
    }, 0);
    return baseAmount + boostTotal;
  };

  const getContributionAmount = () => {
    return selectedAmount || parseCustomAmount(customAmount);
  };

  const handleContributeClick = () => {
    const baseAmount = selectedAmount || parseCustomAmount(customAmount);
    if (baseAmount < 10) {
      toast({
        title: "Valor mínimo",
        description: "O valor mínimo para contribuição é R$ 10,00",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Vai direto pro PIX
    handleGeneratePix();
  };

  const handleGeneratePix = async () => {
    const total = calculateTotal();
    setStep("loading");

    try {
      // Get device fingerprint for anti-abuse
      const fingerprint = await getFingerprint();
      
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: total,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'landing',
          fingerprint,
          offerId: offerId,
        },
      });

      if (error) {
        console.error('Error generating PIX:', error);
        toast({
          title: "Erro ao gerar PIX",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setStep("select");
        return;
      }

      // Check for rate limit error
      if (data?.error === 'RATE_LIMIT') {
        toast({
          title: "Limite atingido",
          description: data.message || "Você atingiu o limite de PIX. Tente novamente mais tarde.",
          variant: "destructive",
          duration: 6000,
        });
        setStep("select");
        return;
      }

      // Track InitiateCheckout when PIX is generated
      trackEventWithCAPI('InitiateCheckout', {
        value: total,
        currency: 'BRL',
        content_name: 'Donation Landing',
      });

      setPixData({
        code: data.pixCode,
        qrCodeUrl: data.qrCodeUrl,
        transactionId: data.transactionId,
      });
      setStep("pix");
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Erro ao gerar PIX",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setStep("select");
    }
  };

  const handleUpsellAccept = (boostId: string) => {
    setSelectedBoosts([boostId]);
    handleGeneratePix();
  };

  const handleUpsellDecline = () => {
    handleGeneratePix();
  };

  const handleBack = () => {
    setStep("select");
    setPixData(null);
  };

  if (!isOpen) return null;

  return (
    <div className={isPreview ? "bg-white overflow-auto" : "fixed inset-0 z-50 bg-white overflow-auto"}>
      {/* Close Button */}
      {showCloseButton && (
        <button
          onClick={onClose}
          className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-10">
        {step === "select" && (
          <div className="space-y-5 sm:space-y-6">
            {/* Logo */}
            <div className="flex items-center">
              <img src={vakinhaLogo} alt="Vakinha" className="h-10 sm:h-14" />
            </div>

            {/* Contribution Value Section */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Valor da contribuição</h2>
              
              {/* Custom Amount Input */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden mb-3 sm:mb-4">
                <span className="px-3 sm:px-4 py-3 bg-white text-gray-500 font-medium border-r border-gray-300 text-sm sm:text-base">
                  R$
                </span>
                <Input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="border-0 text-base sm:text-lg font-medium h-11 sm:h-12 focus-visible:ring-0 bg-white text-gray-900"
                  placeholder="0,00"
                />
              </div>

              {parseCustomAmount(customAmount) > 0 && parseCustomAmount(customAmount) < 10 && (
                <p className="text-red-500 text-sm text-center font-medium mb-2">
                  Valor mínimo: R$ 10,00
                </p>
              )}

              {/* Amount Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {DONATION_AMOUNTS.map((item) => (
                  <button
                    key={item.amount}
                    onClick={() => handleSelectAmount(item.amount)}
                    className={cn(
                      "relative py-3 px-3 sm:py-3.5 sm:px-4 rounded-lg border transition-all font-medium text-sm sm:text-base",
                      selectedAmount === item.amount
                        ? "border-[#00A651] bg-[#00A651]/5 text-[#00A651]"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#00A651]/50"
                    )}
                  >
                    {item.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00A651] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                    {formatCurrency(item.amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Forma de pagamento</h2>
              <div className="inline-flex items-center gap-1.5 bg-[#E8F5F0] text-[#00A651] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                <img src={pixLogo} alt="PIX" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold text-xs sm:text-sm">PIX</span>
              </div>
            </div>

            {/* Boost Section */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Turbine sua doação</h2>
              <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
                Ajude MUITO MAIS turbinando sua doação 💚
              </p>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  const isSelected = selectedBoosts.includes(boost.id);
                  return (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={cn(
                        "flex flex-col items-center p-2 sm:p-4 rounded-lg transition-all border border-dashed",
                        isSelected 
                          ? "border-[#00A651] bg-[#00A651]/5" 
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2",
                        boost.bgColor
                      )}>
                        <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", boost.color)} />
                      </div>
                      <span className="text-[10px] sm:text-sm font-medium text-center text-gray-800 leading-tight">
                        {boost.label}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        {formatCurrency(boost.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <div className="flex justify-between text-gray-700">
                <span>Contribuição:</span>
                <span>{formatCurrency(getContributionAmount())}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleContributeClick}
              className="w-full bg-[#00A651] hover:bg-[#008a44] text-white font-bold text-base sm:text-lg py-6 sm:py-7 rounded-lg"
            >
              CONTRIBUIR
            </Button>

            {/* Social Proof - Supporters */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {[
                  "https://randomuser.me/api/portraits/women/1.jpg",
                  "https://randomuser.me/api/portraits/men/2.jpg",
                  "https://randomuser.me/api/portraits/women/3.jpg",
                  "https://randomuser.me/api/portraits/men/4.jpg",
                  "https://randomuser.me/api/portraits/women/5.jpg",
                  "https://randomuser.me/api/portraits/men/6.jpg",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">+1.542</span> apoiadores
              </span>
            </div>

            {/* Footer */}
              <p className="text-[10px] sm:text-xs text-gray-600">
              Ao clicar no botão acima você declara que é maior de 18 anos, leu e está de acordo com os{" "}
              <span className="font-bold text-gray-900">Termos, Taxas e Prazos</span>.
            </p>

            {/* Security Badge */}
            <div className="bg-[#E8F5E9] rounded-2xl p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
              {/* Badge pill */}
              <div className="inline-flex items-center bg-[#1a3a2a] rounded-full pl-0.5 pr-2 py-0.5 sm:pl-1 sm:pr-3 sm:py-1 gap-1.5 sm:gap-2 shrink-0">
                {/* Green circle with lock icon */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-400 border-2 border-[#00A651] flex items-center justify-center">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-[#00A651]" />
                </div>
                {/* Badge text */}
                <div className="text-white text-[8px] sm:text-[10px] font-bold leading-tight">
                  <div>SELO DE</div>
                  <div>SEGURANÇA</div>
                </div>
              </div>
              {/* Description text */}
              <p className="text-[10px] sm:text-sm text-gray-700">
                Garantimos uma <span className="font-bold text-gray-900">experiência segura</span> para todos os nossos doadores.
              </p>
            </div>

            {/* Additional Info */}
            <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
              Informamos que o preenchimento do seu cadastro completo estará disponível em seu painel pessoal na plataforma após a conclusão desta doação.
            </p>
          </div>
        )}

        {step === "upsell" && (
          <div className="space-y-5 sm:space-y-6">
            {/* Logo */}
            <div className="flex items-center">
              <img src={vakinhaLogo} alt="Vakinha" className="h-10 sm:h-14" />
            </div>

            <div className="bg-[#E8F5E9] rounded-2xl p-4 sm:p-6 text-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Turbine sua doação! 💚
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-4">
                Você pode ajudar MUITO MAIS adicionando um dos itens abaixo:
              </p>
              
              <div className="space-y-3 mb-5">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  return (
                    <button
                      key={boost.id}
                      onClick={() => handleUpsellAccept(boost.id)}
                      className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white border-2 border-[#00A651]/30 hover:border-[#00A651] transition-all"
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                        boost.bgColor
                      )}>
                        <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", boost.color)} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm sm:text-base font-medium text-gray-800">
                          {boost.label}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base font-bold text-[#00A651]">
                        +{formatCurrency(boost.price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleUpsellDecline}
                className="w-full py-3 sm:py-4 px-4 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold text-sm sm:text-base hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Não, obrigado. Continuar com {formatCurrency(getContributionAmount())}
              </button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="bg-white rounded-xl p-4 sm:p-8">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="bg-white rounded-xl p-4 sm:p-8">
            <PixQRCode 
              amount={calculateTotal()} 
              pixCode={pixData.code} 
              qrCodeUrl={pixData.qrCodeUrl}
              transactionId={pixData.transactionId}
              onRegenerate={handleBack}
            />
          </div>
        )}
      </div>

    </div>
  );
};
