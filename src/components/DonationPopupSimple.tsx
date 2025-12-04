import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { cn } from "@/lib/utils";

interface DonationPopupSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
}

const DONATION_AMOUNTS = [
  { amount: 20, mostChosen: false },
  { amount: 25, mostChosen: false },
  { amount: 30, mostChosen: false },
  { amount: 50, mostChosen: false },
  { amount: 60, mostChosen: false },
  { amount: 75, mostChosen: false },
  { amount: 100, mostChosen: true },
  { amount: 150, mostChosen: false },
  { amount: 200, mostChosen: false },
  { amount: 300, mostChosen: false },
  { amount: 400, mostChosen: false },
  { amount: 500, mostChosen: false },
  { amount: 750, mostChosen: false },
  { amount: 1000, mostChosen: false },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupSimple = ({
  isOpen,
  onClose,
  recipientName = "Davizinho",
  userId,
  showCloseButton = false
}: DonationPopupSimpleProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
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
      setSelectedAmount(100);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Simple',
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

  const handleGeneratePix = async () => {
    if (!selectedAmount) {
      toast({
        title: "Selecione um valor",
        description: "Escolha um valor para doar",
        variant: "destructive",
      });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: selectedAmount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'simple',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-overlay/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          {showCloseButton && (
            <button 
              onClick={onClose} 
              className="absolute right-3 sm:right-4 top-3 sm:top-4 p-1.5 sm:p-2 rounded-full hover:bg-secondary transition-colors" 
              aria-label="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {step === "select" && (
            <>
              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight uppercase">
                  ESCOLHA O VALOR QUE DESEJA DOAR 💚
                </h2>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
                {DONATION_AMOUNTS.map((item) => (
                  <button
                    key={item.amount}
                    onClick={() => setSelectedAmount(item.amount)}
                    className={cn(
                      "relative py-3 px-4 rounded-lg border-2 transition-all font-medium text-sm sm:text-base",
                      selectedAmount === item.amount
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    )}
                  >
                    {item.mostChosen && (
                      <span className="absolute -top-2 left-2 text-[10px] sm:text-xs font-semibold text-primary bg-card px-1">
                        Mais escolhido
                      </span>
                    )}
                    {formatCurrency(item.amount)}
                  </button>
                ))}
              </div>

              {/* CTA Button */}
              <Button 
                variant="donationCta" 
                size="xl" 
                className="w-full text-base sm:text-lg" 
                onClick={handleGeneratePix}
              >
                Doar Agora
              </Button>

              {/* Footer Text */}
              <p className="text-center text-xs text-muted-foreground mt-4">
                Cada doação transforma vidas obrigado por fazer parte dessa corrente do bem.
              </p>
            </>
          )}

          {step === "loading" && <PixLoadingSkeleton />}

          {step === "pix" && pixData && (
            <PixQRCode 
              amount={selectedAmount || 0} 
              pixCode={pixData.code} 
              qrCodeUrl={pixData.qrCodeUrl}
              transactionId={pixData.transactionId}
              onRegenerate={handleBack}
            />
          )}
        </div>
      </div>

    </div>
  );
};
