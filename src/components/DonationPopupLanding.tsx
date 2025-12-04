import { useState, useEffect } from "react";
import { Heart, Sparkles, ShoppingBasket } from "lucide-react";
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

interface DonationPopupLandingProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  campaignTitle?: string;
  campaignId?: string;
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
  { id: "hearts", label: "10 corações", price: 10.99, icon: Heart },
  { id: "impact", label: "Multiplicador de impacto", price: 25, icon: Sparkles },
  { id: "basket", label: "Doar cesta básica", price: 85, icon: ShoppingBasket },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupLanding = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
  campaignTitle = "Mãe com 2 crianças",
  campaignId = "5819338"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-auto">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {step === "select" && (
          <div className="bg-card rounded-xl shadow-lg p-4 sm:p-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00A651] rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </div>
                <span className="text-2xl font-bold text-[#00A651]">doarcomamor</span>
              </div>
            </div>

            {/* Campaign Title */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{campaignTitle}</h1>
              <p className="text-muted-foreground text-sm">ID: {campaignId}</p>
            </div>

            {/* Contribution Value Section */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-3">Valor da contribuição</h2>
              
              {/* Custom Amount Input */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden mb-4">
                <span className="px-4 py-3 bg-muted text-muted-foreground font-medium border-r border-border">
                  R$
                </span>
                <Input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="border-0 text-lg font-medium h-12 focus-visible:ring-0"
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
                      "py-3 px-4 rounded-lg border transition-all font-medium text-sm sm:text-base",
                      selectedAmount === item.amount
                        ? "border-[#00A651] bg-[#00A651]/10 text-[#00A651]"
                        : "border-border bg-card text-foreground hover:border-[#00A651]/50"
                    )}
                  >
                    {formatCurrency(item.amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-3">Forma de pagamento</h2>
              <div className="inline-flex items-center gap-2 bg-[#00A651] text-white px-4 py-2 rounded-lg">
                <img src={pixLogo} alt="PIX" className="w-5 h-5 brightness-0 invert" />
                <span className="font-medium">Pix</span>
              </div>
            </div>

            {/* Boost Section */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-1">Turbine sua doação</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Ajude MUITO MAIS turbinando sua doação 💚
              </p>
              
              <div className="grid grid-cols-3 gap-3 p-4 border border-dashed border-border rounded-lg">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  const isSelected = selectedBoosts.includes(boost.id);
                  return (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg transition-all",
                        isSelected 
                          ? "bg-[#00A651]/10 ring-2 ring-[#00A651]" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                        isSelected ? "bg-[#00A651]/20" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          isSelected ? "text-[#00A651]" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-center text-foreground">
                        {boost.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(boost.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 mb-6 text-sm sm:text-base">
              <div className="flex justify-between text-foreground">
                <span>Contribuição:</span>
                <span>{formatCurrency(getContributionAmount())}</span>
              </div>
              <div className="flex justify-between text-foreground font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleGeneratePix}
              className="w-full bg-[#00A651] hover:bg-[#008a44] text-white font-bold text-lg py-6 rounded-lg"
            >
              CONTRIBUIR
            </Button>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Ao clicar no botão acima você declara que é maior de 18 anos, leu e está de acordo com os{" "}
              <span className="font-medium text-foreground">Termos, Taxas e Prazos</span>.
            </p>

            {/* Security Badge */}
            <div className="mt-4 bg-muted rounded-lg p-3 flex items-center gap-3">
              <div className="bg-[#00A651] text-white text-xs font-bold px-2 py-1 rounded flex flex-col items-center">
                <span>🔒 SELO DE</span>
                <span>SEGURANÇA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Garantimos uma <span className="font-semibold text-foreground">experiência segura</span> para todos os nossos doadores.
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="bg-card rounded-xl shadow-lg p-4 sm:p-8">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="bg-card rounded-xl shadow-lg p-4 sm:p-8">
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
