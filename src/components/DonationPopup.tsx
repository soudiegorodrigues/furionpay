import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";
import { trackInitiateCheckoutToUtmify } from "@/lib/trackInitiateCheckout";

interface DonationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  autoShowDelay?: number;
  userId?: string;
  showCloseButton?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

const BOOST_OPTIONS = [
  { id: 1, label: "Reforma Ong", price: 50.00, icon: "🏠" },
  { id: 2, label: "Ração 5kg", price: 34.90, icon: "🍖" },
  { id: 3, label: "Vacina", price: 32.70, icon: "💉" },
];

const MIN_DONATION = 10;
const MAX_DONATION = 1000;

type Step = "select" | "loading" | "pix";

export const DonationPopup = ({
  isOpen,
  onClose,
  recipientName = "Davizinho",
  userId,
  showCloseButton = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupProps) => {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedBoosts, setSelectedBoosts] = useState<number[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const { toast } = useToast();
  const { trackEvent, utmParams: contextUtmParams } = usePixel();
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) return propUtmParams;
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) return contextUtmParams;
    return getSavedUTMParams();
  };
  const utmParams = getEffectiveUtmParams();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setCustomAmount("");
      setSelectedBoosts([]);
    } else {
      // Track InitiateCheckout when popup opens
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup',
        currency: 'BRL',
      });
      // Also track to UTMify server-side
      trackInitiateCheckoutToUtmify({
        userId,
        offerId,
        productName: 'Donation Boost',
        value: totalAmount || 0,
        utmParams,
        popupModel: 'boost',
      });
    }
  }, [isOpen, trackEvent, userId, offerId, utmParams]);

  const baseAmount = parseFloat(customAmount) || 0;
  const boostsTotal = selectedBoosts.reduce((sum, id) => {
    const boost = BOOST_OPTIONS.find(b => b.id === id);
    return sum + (boost?.price || 0);
  }, 0);
  const totalAmount = baseAmount + boostsTotal;

  const toggleBoost = (id: number) => {
    setSelectedBoosts(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleGeneratePix = async () => {
    if (totalAmount < MIN_DONATION) {
      toast({
        title: "Valor mínimo",
        description: `O valor mínimo para doação é de ${formatCurrency(MIN_DONATION)}`,
        variant: "destructive",
      });
      return;
    }

    if (totalAmount > MAX_DONATION) {
      toast({
        title: "Valor máximo",
        description: `O valor máximo para doação é de ${formatCurrency(MAX_DONATION)}`,
        variant: "destructive",
      });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: totalAmount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'boost',
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
      <div className="absolute inset-0 bg-overlay/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

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

              {/* Custom Amount Input */}
              <div className="mb-4">
                <div className="flex border border-input rounded-lg overflow-hidden">
                  <div className="flex items-center justify-center px-4 bg-secondary text-foreground font-medium border-r border-input">
                    R$
                  </div>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="border-0 text-lg font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                    min={0}
                    step={0.01}
                  />
                </div>
                {baseAmount > 0 && baseAmount < MIN_DONATION && (
                  <p className="text-xs text-destructive mt-1">
                    Valor mínimo da doação é de R$ {MIN_DONATION},00
                  </p>
                )}
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

              {/* Boost Options */}
              <div className="mb-5">
                <p className="text-sm font-medium text-foreground mb-3">Turbine sua doação</p>
                <div className="grid grid-cols-3 gap-2">
                  {BOOST_OPTIONS.map((boost) => (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedBoosts.includes(boost.id)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{boost.icon}</div>
                      <p className="text-xs font-medium text-foreground">{boost.label}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(boost.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 mb-5 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contribuição:</span>
                  <span className="font-medium text-foreground">{formatCurrency(baseAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                variant="donationCta" 
                size="xl" 
                className="w-full text-base sm:text-lg uppercase tracking-wide" 
                onClick={handleGeneratePix}
                disabled={totalAmount < MIN_DONATION}
              >
                Contribuir
              </Button>

              {/* Social Proof - Supporters */}
              <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-border">
                <div className="flex -space-x-2">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face" 
                    alt="Apoiador" 
                    className="w-8 h-8 rounded-full border-2 border-card object-cover"
                  />
                </div>
                <span className="text-sm text-muted-foreground font-medium">+1.542 apoiadores</span>
              </div>
            </>
          )}

          {step === "loading" && <PixLoadingSkeleton />}

          {step === "pix" && pixData && (
            <PixQRCode 
              amount={totalAmount} 
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
