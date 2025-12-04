import { useState, useEffect } from "react";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { ExitIntentPopup } from "./ExitIntentPopup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { cn } from "@/lib/utils";

interface DonationPopupInstitutoProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  fixedAmount?: number;
}

const DONATION_AMOUNTS = [
  { amount: 30, label: "R$ 30", highlight: false },
  { amount: 40, label: "R$ 40", highlight: false },
  { amount: 50, label: "R$ 50 - JUNTE-SE À MAIORIA", highlight: true, hasHeart: true },
  { amount: 70, label: "R$ 70 - ESCOLHA SOLIDÁRIA", highlight: true, hasHeart: true },
  { amount: 100, label: "R$ 100", highlight: false },
  { amount: 150, label: "R$ 150", highlight: false },
  { amount: 200, label: "R$ 200", highlight: false },
  { amount: 300, label: "R$ 300", highlight: false },
  { amount: 500, label: "R$ 500", highlight: false },
  { amount: 750, label: "R$ 750", highlight: false },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupInstituto = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
  showCloseButton = false,
  fixedAmount,
}: DonationPopupInstitutoProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  
  // Progress bar data (configurable)
  const [raised] = useState(177875.10);
  const [goal] = useState(200000);
  
  const { toast } = useToast();
  const { trackEvent, utmParams } = usePixel();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(null);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Instituto',
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

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
  };

  const progressPercentage = Math.min((raised / goal) * 100, 100);

  const handleGeneratePix = async (amount: number) => {
    if (amount <= 0) {
      toast({
        title: "Selecione um valor",
        description: "Escolha um valor para doar",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: amount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'instituto',
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
        value: amount,
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

  const handleAmountClick = (amount: number) => {
    handleSelectAmount(amount);
    handleGeneratePix(amount);
  };

  const handleBack = () => {
    setStep("select");
    setPixData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
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
      
      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10">
        {step === "select" && (
          <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Arrecadado:</span>
                <span className="text-[#E91E8C] text-2xl sm:text-3xl font-bold">
                  {formatCurrency(raised)}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Meta</span>
                <span className="text-gray-700 font-medium">
                  {formatCurrency(goal)}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #00BCD4, #4CAF50)'
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-gray-800 font-bold text-lg sm:text-xl uppercase tracking-wide">
              Qual valor você deseja doar?
            </h2>

            {/* Amount Grid */}
            <div className="grid grid-cols-2 gap-3">
              {DONATION_AMOUNTS.map((item) => (
                <button
                  key={item.amount}
                  onClick={() => handleAmountClick(item.amount)}
                  className={cn(
                    "py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all relative",
                    item.highlight 
                      ? "bg-gradient-to-r from-[#E91E8C] to-[#9C27B0] text-white shadow-lg"
                      : "bg-[#E91E8C] text-white hover:bg-[#D81B7A]",
                    selectedAmount === item.amount && "ring-2 ring-offset-2 ring-[#E91E8C]"
                  )}
                >
                  {item.hasHeart && (
                    <Heart className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <span className={item.hasHeart ? "ml-4" : ""}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Main CTA Button */}
            <Button 
              onClick={() => handleGeneratePix(1000)}
              className="w-full py-6 text-lg font-bold rounded-xl text-white"
              style={{
                background: 'linear-gradient(90deg, #E91E8C, #9C27B0)'
              }}
            >
              R$ 1000
            </Button>
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
              amount={selectedAmount || 1000} 
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
        amount={selectedAmount || 1000}
      />
    </div>
  );
};
