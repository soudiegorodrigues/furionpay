import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, Menu, Clover, Heart, Globe, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import { PixQRCode } from "./PixQRCode";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import vakinhaLogo from "@/assets/vakinha-logo.png";

interface DonationPopupVakinhaProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  isPreview?: boolean;
}

const DONATION_AMOUNTS = [30, 50, 75, 100, 200, 500, 750, 1000];

const BOOST_OPTIONS = [
  {
    id: 1,
    title: "3 números da sorte",
    description: "Você e quem criou a vaquinha concorrem ao sorteio de R$ 15.000,00 do Vakinha Premiada",
    price: 0,
    priceLabel: "Grátis",
    icon: Clover,
    iconColor: "#22c55e",
  },
  {
    id: 2,
    title: "3 Corações",
    description: "Destacam essa vaquinha na plataforma",
    price: 3.99,
    priceLabel: "R$ 3,99",
    icon: Heart,
    iconColor: "#ec4899",
  },
  {
    id: 3,
    title: "Vakinha além do Câncer",
    description: "Você ajuda crianças no tratamento do câncer infantil a terem acolhimento e experiências mágicas",
    price: 2.00,
    priceLabel: "R$ 2,00",
    icon: Globe,
    iconColor: "#22c55e",
  },
];

const MIN_DONATION = 25;
const MAX_DONATION = 1000;

type Step = "select" | "loading" | "pix";

export const DonationPopupVakinha = ({
  isOpen,
  onClose,
  recipientName = "Contribuição",
  userId,
  showCloseButton = true,
  isPreview = false,
}: DonationPopupVakinhaProps) => {
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<number[]>([]);
  const [boostSectionEnabled, setBoostSectionEnabled] = useState(false);
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<any>(null);
  const { toast } = useToast();
  const { trackEvent } = useMetaPixel();

  useEffect(() => {
    if (!isOpen) {
      setCustomAmount("");
      setSelectedAmount(null);
      setSelectedBoosts([]);
      setBoostSectionEnabled(false);
      setWantsUpdates(false);
      setStep("select");
      setPixData(null);
    } else {
      trackEvent('InitiateCheckout', { content_name: recipientName });
    }
  }, [isOpen, recipientName, trackEvent]);

  const toggleBoostSection = () => {
    if (boostSectionEnabled) {
      setBoostSectionEnabled(false);
      setSelectedBoosts([]);
    } else {
      setBoostSectionEnabled(true);
      setSelectedBoosts(BOOST_OPTIONS.map(b => b.id));
    }
  };

  const getBaseAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    const parsed = parseFloat(customAmount.replace(/[^\d,]/g, "").replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  };

  const boostTotal = boostSectionEnabled 
    ? selectedBoosts.reduce((sum, id) => {
        const boost = BOOST_OPTIONS.find((b) => b.id === id);
        return sum + (boost?.price || 0);
      }, 0)
    : 0;

  const totalAmount = getBaseAmount() + boostTotal;

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSelectAmount = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d,]/g, "");
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const isValidAmount = () => {
    const base = getBaseAmount();
    return base >= MIN_DONATION && base <= MAX_DONATION;
  };

  const handleGeneratePix = async () => {
    if (isPreview) {
      toast({
        title: "Modo Preview",
        description: "Geração de PIX desabilitada no preview.",
      });
      return;
    }

    const base = getBaseAmount();
    if (base < MIN_DONATION) {
      toast({
        title: "Valor mínimo",
        description: `O valor mínimo é R$ ${formatCurrency(MIN_DONATION)}`,
        variant: "destructive",
      });
      return;
    }

    if (base > MAX_DONATION) {
      toast({
        title: "Valor máximo",
        description: `O valor máximo é R$ ${formatCurrency(MAX_DONATION)}`,
        variant: "destructive",
      });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("generate-pix", {
        body: {
          amount: totalAmount,
          donorName: recipientName,
          userId: userId,
          popupModel: "vakinha2",
        },
      });

      if (error) throw error;

      setPixData(data);
      setStep("pix");
      trackEvent('AddPaymentInfo', { 
        content_name: recipientName,
        value: totalAmount,
        currency: 'BRL'
      });
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PIX. Tente novamente.",
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

  const containerClass = isPreview 
    ? "relative w-full bg-white" 
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4";

  const innerClass = isPreview
    ? "w-full"
    : "relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {/* Close Button (only when not in preview) */}
        {showCloseButton && !isPreview && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        )}

        {step === "select" && (
          <div>
            {/* Green Header with Logo and Menu */}
            <div className="bg-[#00C853] px-4 py-3 flex items-center justify-between">
              <img src={vakinhaLogo} alt="Vakinha" className="h-7" />
              <div className="flex items-center gap-4">
                <Search className="h-6 w-6 text-white cursor-pointer" />
                <Menu className="h-6 w-6 text-white cursor-pointer" />
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Contribution Value Input */}
              <div>
                <p className="text-sm text-gray-700 mb-2">Valor da contribuição</p>
                <div className="flex border border-[#4ade80] rounded overflow-hidden">
                  <span className="px-4 py-3 bg-white text-gray-600 text-sm border-r border-[#4ade80] flex items-center">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={customAmount || (selectedAmount ? formatCurrency(selectedAmount) : "")}
                    onChange={handleCustomAmountChange}
                    placeholder="0,00"
                    className="flex-1 border-0 py-3 bg-[#e8f5e9] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-base"
                  />
                </div>
              </div>

              {/* Preset Amounts Grid */}
              <div className="grid grid-cols-2 gap-2">
                {DONATION_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleSelectAmount(amount)}
                    className={`py-3 px-4 rounded border text-center text-sm transition-all ${
                      selectedAmount === amount
                        ? "border-[#00C853] bg-[#e8f5e9] text-gray-800 border-2"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#4ade80]"
                    }`}
                  >
                    R$ {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              {/* Min/Max Info */}
              <div>
                <p className="text-xs text-gray-400">
                  Mínimo R$ 25,00 - Máximo R$ 1.000,00
                </p>
                {!isValidAmount() && getBaseAmount() > 0 && (
                  <p className="text-xs text-[#ef5350] mt-1">
                    Valor deve estar entre R$ 25,00 e R$ 1.000,00
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-sm text-gray-700 mb-2">Forma de pagamento</p>
                <span className="inline-block px-4 py-2 bg-[#00C853] text-white font-medium rounded text-sm">
                  Pix
                </span>
              </div>

              {/* Boost Section */}
              <div className="border border-gray-200 rounded overflow-hidden">
                {/* Header */}
                <div className="bg-[#00C853] px-3 py-2 flex items-center gap-2">
                  <Checkbox
                    id="boost-section"
                    checked={boostSectionEnabled}
                    onCheckedChange={toggleBoostSection}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#00C853] h-4 w-4"
                  />
                  <label htmlFor="boost-section" className="text-white font-bold text-xs uppercase tracking-wider cursor-pointer">
                    Turbine sua doação
                  </label>
                </div>

                {/* Boost Options */}
                <div className="divide-y divide-gray-100">
                  {BOOST_OPTIONS.map((boost) => {
                    const Icon = boost.icon;
                    return (
                      <div
                        key={boost.id}
                        className="p-3 bg-white"
                      >
                        <div className="flex items-start gap-2">
                          <Icon 
                            className="h-4 w-4 mt-0.5 flex-shrink-0" 
                            style={{ color: boost.iconColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                  {boost.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                                  {boost.description}
                                </p>
                              </div>
                              <span className={`font-bold text-sm whitespace-nowrap ${
                                boost.price === 0 ? "text-[#00C853]" : "text-[#00C853]"
                              }`}>
                                {boost.priceLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Contribuição: R$ {formatCurrency(getBaseAmount())}
                </p>
                <p className="text-base font-bold text-gray-900">
                  Total: R$ {formatCurrency(totalAmount)}
                </p>
              </div>

              {/* Newsletter Checkbox */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="updates"
                  checked={wantsUpdates}
                  onCheckedChange={(checked) => setWantsUpdates(checked as boolean)}
                  className="mt-0.5 h-4 w-4 border-gray-400"
                />
                <label htmlFor="updates" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  Quero receber atualizações desta vaquinha e de outras iniciativas.
                </label>
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleGeneratePix}
                disabled={!isValidAmount() || getBaseAmount() === 0}
                className="w-full py-6 text-base font-bold bg-[#00C853] hover:bg-[#00b548] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CONTRIBUIR
              </Button>

              {/* Security Badge */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex flex-col items-center justify-center w-24 h-16 bg-gray-100 rounded-lg flex-shrink-0 relative">
                  <ShieldCheck className="h-8 w-8 text-[#00C853]" />
                  <span className="text-[7px] font-bold text-gray-500 uppercase mt-0.5 tracking-tight">
                    Selo de Segurança
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Garantimos uma experiência segura para todos os nossos doadores.
                </p>
              </div>

              {/* Terms */}
              <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
                Ao clicar no botão acima você declara que é maior de 18 anos e concorda com os Termos.
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="p-6">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="p-6">
            <PixQRCode
              pixCode={pixData.pixCode}
              qrCodeUrl={pixData.qrCodeBase64}
              amount={totalAmount}
              transactionId={pixData.transactionId}
              onRegenerate={handleBack}
            />
          </div>
        )}
      </div>
    </div>
  );
};
