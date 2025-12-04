import { useState, useEffect } from "react";
import { Heart, Sprout, ShoppingBasket, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { ExitIntentPopup } from "./ExitIntentPopup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { cn } from "@/lib/utils";
import pixLogo from "@/assets/pix-logo.png";
import vakinhaLogo from "@/assets/vakinha-logo.png";
interface DonationPopupLandingProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
}

const DONATION_AMOUNTS = [
  { amount: 30 },
  { amount: 50 },
  { amount: 75 },
  { amount: 100 },
  { amount: 200 },
  { amount: 500 },
  { amount: 750 },
  { amount: 1000 },
];

const BOOST_OPTIONS = [
  { id: "hearts", label: "10 corações", price: 10.99, icon: Heart, color: "text-emerald-500", bgColor: "bg-emerald-100" },
  { id: "impact", label: "Multiplicador de impacto", price: 25, icon: Sprout, color: "text-amber-600", bgColor: "bg-amber-100" },
  { id: "basket", label: "Doar cesta básica", price: 85, icon: ShoppingBasket, color: "text-orange-500", bgColor: "bg-orange-100" },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupLanding = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
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
  const { trackEvent, utmParams } = usePixel();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(null);
      setCustomAmount("0,00");
      setSelectedBoosts([]);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Landing',
        currency: 'BRL',
      });
    }
  }, [isOpen, trackEvent]);

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

  const handleGeneratePix = async () => {
    const total = calculateTotal();
    if (total <= 0) {
      toast({
        title: "Selecione um valor",
        description: "Escolha um valor para contribuir",
        variant: "destructive",
      });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: total,
          utmParams: utmParams,
          userId: userId,
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

      trackEvent('PixGenerated', {
        value: total,
        currency: 'BRL',
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

  const handleBack = () => {
    setStep("select");
    setPixData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        aria-label="Fechar"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>
      
      <div className="w-full max-w-lg mx-auto px-4 py-6 sm:py-10">
        {step === "select" && (
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center">
              <img src={vakinhaLogo} alt="Vakinha" className="h-12 sm:h-14" />
            </div>


            {/* Contribution Value Section */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Valor da contribuição</h2>
              
              {/* Custom Amount Input */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden mb-4">
                <span className="px-4 py-3.5 bg-white text-gray-500 font-medium border-r border-gray-300">
                  R$
                </span>
                <Input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="border-0 text-lg font-medium h-12 focus-visible:ring-0 bg-white text-gray-900"
                  placeholder="0,00"
                />
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-2 gap-3">
                {DONATION_AMOUNTS.map((item) => (
                  <button
                    key={item.amount}
                    onClick={() => handleSelectAmount(item.amount)}
                    className={cn(
                      "py-3.5 px-4 rounded-lg border transition-all font-medium text-base",
                      selectedAmount === item.amount
                        ? "border-[#00A651] bg-[#00A651]/5 text-[#00A651]"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#00A651]/50"
                    )}
                  >
                    {formatCurrency(item.amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Forma de pagamento</h2>
              <div className="inline-flex items-center gap-2 bg-[#00A651] text-white px-5 py-2.5 rounded-lg">
                <img src={pixLogo} alt="PIX" className="w-5 h-5 brightness-0 invert" />
                <span className="font-medium">Pix</span>
              </div>
            </div>

            {/* Boost Section */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Turbine sua doação</h2>
              <p className="text-gray-500 text-sm mb-4">
                Ajude MUITO MAIS turbinando sua doação 💚
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  const isSelected = selectedBoosts.includes(boost.id);
                  return (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={cn(
                        "flex flex-col items-center p-3 sm:p-4 rounded-lg transition-all border border-dashed",
                        isSelected 
                          ? "border-[#00A651] bg-[#00A651]/5" 
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                        boost.bgColor
                      )}>
                        <Icon className={cn("w-6 h-6", boost.color)} />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-center text-gray-800 leading-tight">
                        {boost.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {formatCurrency(boost.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 text-base">
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
              onClick={handleGeneratePix}
              className="w-full bg-[#00A651] hover:bg-[#008a44] text-white font-bold text-lg py-7 rounded-lg"
            >
              CONTRIBUIR
            </Button>

            {/* Footer */}
            <p className="text-xs text-gray-500">
              Ao clicar no botão acima você declara que é maior de 18 anos, leu e está de acordo com os{" "}
              <span className="font-semibold text-gray-700">Termos, Taxas e Prazos</span>.
            </p>

            {/* Security Badge */}
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-[#00A651] text-white text-[10px] font-bold px-3 py-2 rounded flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <div className="flex flex-col leading-tight">
                  <span>SELO DE</span>
                  <span>SEGURANÇA</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Garantimos uma <span className="font-semibold text-gray-800">experiência segura</span> para todos os nossos doadores.
              </p>
            </div>

            {/* Additional Info */}
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Informamos que o preenchimento do seu cadastro completo estará disponível em seu painel pessoal na plataforma após a conclusão desta doação. Importante destacar a importância da adequação do seu cadastro, informando o <span className="font-medium text-gray-500">nome social</span>, caso o utilize.
            </p>
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

      {/* Exit Intent Popup */}
      <ExitIntentPopup 
        pixCode={pixData?.code || ""} 
        isActive={step === "pix" && !!pixData} 
        amount={calculateTotal()}
      />
    </div>
  );
};
