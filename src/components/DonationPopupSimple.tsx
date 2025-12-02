import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonationAmountButton } from "./DonationAmountButton";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { ExitIntentPopup } from "./ExitIntentPopup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";

interface DonationPopupSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
}

const DONATION_AMOUNTS = [
  { amount: 15, mostChosen: false },
  { amount: 25, mostChosen: true },
  { amount: 50, mostChosen: false },
  { amount: 100, mostChosen: false },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupSimple = ({
  isOpen,
  onClose,
  recipientName = "Davizinho"
}: DonationPopupSimpleProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
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
      setSelectedAmount(25);
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
          {step === "pix" && (
            <button 
              onClick={handleBack} 
              className="absolute left-3 sm:left-4 top-3 sm:top-4 p-1.5 sm:p-2 rounded-full hover:bg-secondary transition-colors" 
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
          )}
          <button 
            onClick={onClose} 
            className="absolute right-3 sm:right-4 top-3 sm:top-4 p-1.5 sm:p-2 rounded-full hover:bg-secondary transition-colors" 
            aria-label="Fechar"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {step === "select" && (
            <>
              {/* Emotional Title */}
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  🚨 Cada dia sem ajuda significa mais sofrimento.💔
                </h2>
                <p className="text-base sm:text-lg font-bold text-foreground mt-1 uppercase">
                  ELES PRECISAM DE VOCÊ: DOE E SALVE ESSES ANJOS DE 4 PATAS!!!
                </p>
                <p className="text-xs text-muted-foreground mt-2">ID: 53823</p>
              </div>

              {/* Amount Selection */}
              <div className="mb-5">
                <p className="text-sm font-medium text-foreground mb-3">Escolha o valor da doação</p>
                <div className="grid grid-cols-2 gap-3">
                  {DONATION_AMOUNTS.map((item) => (
                    <DonationAmountButton
                      key={item.amount}
                      amount={item.amount}
                      isSelected={selectedAmount === item.amount}
                      isMostChosen={item.mostChosen}
                      onClick={() => setSelectedAmount(item.amount)}
                    />
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-5">
                <p className="text-sm font-medium text-foreground mb-2">Forma de pagamento</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8FFF3] text-[#32BCAD] rounded-md text-xs font-semibold">
                  <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                    <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#32BCAD"/>
                    <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#32BCAD"/>
                    <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#32BCAD"/>
                    <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#32BCAD"/>
                  </svg>
                  PIX
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 mb-5 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{formatCurrency(selectedAmount || 0)}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                variant="donationCta" 
                size="xl" 
                className="w-full text-base sm:text-lg uppercase tracking-wide" 
                onClick={handleGeneratePix}
              >
                Contribuir
              </Button>
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

      {/* Exit Intent Popup */}
      <ExitIntentPopup 
        pixCode={pixData?.code || ""} 
        isActive={step === "pix" && !!pixData} 
        amount={selectedAmount || 0}
      />
    </div>
  );
};
