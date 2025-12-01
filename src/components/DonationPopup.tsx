import { useState, useEffect } from "react";
import { X, Heart, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonationAmountButton } from "./DonationAmountButton";
import { PixQRCode } from "./PixQRCode";
import { cn } from "@/lib/utils";

interface DonationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  autoShowDelay?: number;
}

const DONATION_AMOUNTS = [
  20, 25, 30, 50, 60, 75, 100, 150, 200, 300, 400, 500, 750, 1000,
];

const MOST_CHOSEN_AMOUNT = 100;

type Step = "select" | "loading" | "pix";

export const DonationPopup = ({
  isOpen,
  onClose,
  recipientName = "Davizinho",
}: DonationPopupProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(MOST_CHOSEN_AMOUNT);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{ code: string; qrCodeUrl?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(MOST_CHOSEN_AMOUNT);
    }
  }, [isOpen]);

  const handleGeneratePix = async () => {
    setStep("loading");
    
    // Simulating API call to /payments/pix
    // In production, replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock PIX data - in production this would come from the API
    const mockPixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865404${selectedAmount.toFixed(2)}5802BR5913${recipientName}6008Brasilia62070503***6304`;
    
    setPixData({
      code: mockPixCode,
      // In production, qrCodeUrl would be returned from the API
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockPixCode)}`,
    });
    
    setStep("pix");
  };

  const handleBack = () => {
    setStep("select");
    setPixData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-overlay/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {step === "pix" && (
            <button
              onClick={handleBack}
              className="absolute left-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <h2 className="text-xl font-bold text-foreground text-center uppercase tracking-wide pt-2">
            {step === "select" ? (
              <>
                Escolha o valor que{" "}
                <br />
                deseja doar{" "}
                <Heart className="inline w-5 h-5 text-primary fill-primary" />
              </>
            ) : step === "loading" ? (
              "Gerando PIX..."
            ) : (
              "Pague via PIX"
            )}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {step === "select" && (
            <>
              {/* Amount Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {DONATION_AMOUNTS.map((amount) => (
                  <DonationAmountButton
                    key={amount}
                    amount={amount}
                    isSelected={selectedAmount === amount}
                    isMostChosen={amount === MOST_CHOSEN_AMOUNT}
                    onClick={() => setSelectedAmount(amount)}
                  />
                ))}
              </div>

              {/* CTA Button */}
              <Button
                variant="donationCta"
                size="xl"
                className="w-full"
                onClick={handleGeneratePix}
              >
                Doar Agora
              </Button>

              {/* Footer text */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                Cada doação transforma vidas — obrigado por fazer parte dessa corrente do bem.
              </p>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Gerando código PIX...</p>
            </div>
          )}

          {step === "pix" && pixData && (
            <PixQRCode
              amount={selectedAmount}
              pixCode={pixData.code}
              qrCodeUrl={pixData.qrCodeUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
};
