import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Clover, Heart, Globe, Shield } from "lucide-react";
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
    color: "text-emerald-500",
  },
  {
    id: 2,
    title: "3 Corações",
    description: "Destacam essa vaquinha na plataforma",
    price: 3.99,
    priceLabel: "R$ 3,99",
    icon: Heart,
    color: "text-pink-500",
  },
  {
    id: 3,
    title: "Vakinha além do Câncer",
    description: "Você ajuda crianças no tratamento do câncer infantil a terem acolhimento e experiências mágicas",
    price: 2.00,
    priceLabel: "R$ 2,00",
    icon: Globe,
    color: "text-emerald-600",
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
      setWantsUpdates(false);
      setStep("select");
      setPixData(null);
    } else {
      trackEvent('InitiateCheckout', { content_name: recipientName });
    }
  }, [isOpen, recipientName, trackEvent]);

  const toggleBoost = (id: number) => {
    setSelectedBoosts((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const getBaseAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    const parsed = parseFloat(customAmount.replace(/[^\d,]/g, "").replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  };

  const boostTotal = selectedBoosts.reduce((sum, id) => {
    const boost = BOOST_OPTIONS.find((b) => b.id === id);
    return sum + (boost?.price || 0);
  }, 0);

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
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {step === "select" && (
          <div className="p-5 space-y-4">
            {/* Header with Logo */}
            <div className="flex items-center justify-center border-b border-gray-100 pb-4">
              <img src={vakinhaLogo} alt="Vakinha" className="h-8" />
            </div>

            {/* Contribution Value Input */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Valor da contribuição</p>
              <div className="flex border-2 border-emerald-400 rounded-lg overflow-hidden">
                <span className="px-4 py-3 bg-white text-gray-600 font-medium border-r border-emerald-400 flex items-center">
                  R$
                </span>
                <Input
                  type="text"
                  value={customAmount || (selectedAmount ? formatCurrency(selectedAmount) : "")}
                  onChange={handleCustomAmountChange}
                  placeholder="0,00"
                  className="flex-1 border-0 text-lg font-medium bg-emerald-50 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                />
              </div>
            </div>

            {/* Preset Amounts Grid */}
            <div className="grid grid-cols-2 gap-2">
              {DONATION_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSelectAmount(amount)}
                  className={`py-3 px-4 rounded-lg border text-center font-medium transition-all ${
                    selectedAmount === amount
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 border-2"
                      : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
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
                <p className="text-xs text-red-500 mt-1">
                  Valor deve estar entre R$ 25,00 e R$ 1.000,00
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Forma de pagamento</p>
              <span className="inline-block px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg text-sm">
                Pix
              </span>
            </div>

            {/* Boost Section */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-emerald-500 px-4 py-2.5 flex items-center gap-3">
                <Checkbox
                  id="boost-all"
                  checked={selectedBoosts.length === BOOST_OPTIONS.length}
                  onCheckedChange={() => {
                    if (selectedBoosts.length === BOOST_OPTIONS.length) {
                      setSelectedBoosts([]);
                    } else {
                      setSelectedBoosts(BOOST_OPTIONS.map(b => b.id));
                    }
                  }}
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-emerald-500 h-5 w-5"
                />
                <label htmlFor="boost-all" className="text-white font-bold text-sm uppercase tracking-wide cursor-pointer">
                  Turbine sua doação
                </label>
              </div>

              {/* Boost Options */}
              <div className="divide-y divide-gray-100">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  const isSelected = selectedBoosts.includes(boost.id);
                  return (
                    <div
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-50/50" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${boost.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {boost.title}
                            </h4>
                            <span className={`font-bold text-sm whitespace-nowrap ${
                              boost.price === 0 ? "text-emerald-500" : "text-emerald-600"
                            }`}>
                              {boost.priceLabel}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {boost.description}
                          </p>
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
            <div className="flex items-start gap-3">
              <Checkbox
                id="updates"
                checked={wantsUpdates}
                onCheckedChange={(checked) => setWantsUpdates(checked as boolean)}
                className="mt-0.5 h-4 w-4"
              />
              <label htmlFor="updates" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                Quero receber atualizações desta vaquinha e de outras iniciativas.
              </label>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleGeneratePix}
              disabled={!isValidAmount() || getBaseAmount() === 0}
              className="w-full py-6 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONTRIBUIR
            </Button>

            {/* Security Badge */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex items-center justify-center w-20 h-14 bg-gray-100 rounded-lg flex-shrink-0 relative">
                <Shield className="h-8 w-8 text-emerald-600" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-200 text-[8px] font-bold text-gray-600 px-2 py-0.5 rounded uppercase whitespace-nowrap">
                  Selo de Segurança
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Garantimos uma experiência segura para todos os nossos doadores.
              </p>
            </div>

            {/* Terms */}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Ao clicar no botão acima você declara que é maior de 18 anos e concorda com os Termos.
            </p>
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
