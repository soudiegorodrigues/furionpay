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

const DONATION_AMOUNTS = [
  { value: 30 },
  { value: 50 },
  { value: 75 },
  { value: 100 },
  { value: 200 },
  { value: 500 },
  { value: 750 },
  { value: 1000 },
];

const BOOST_OPTIONS = [
  {
    id: 1,
    title: "3 números da sorte",
    description: "Você e quem criou a vaquinha concorrem ao sorteio de R$ 15.000,00 do Vakinha Premiada",
    price: 0,
    priceLabel: "Grátis",
    icon: Clover,
  },
  {
    id: 2,
    title: "3 Corações",
    description: "Destacam essa vaquinha na plataforma",
    price: 3.99,
    priceLabel: "R$ 3,99",
    icon: Heart,
  },
  {
    id: 3,
    title: "Vakinha além do Câncer",
    description: "Você ajuda crianças no tratamento do câncer infantil a terem acolhimento e experiências mágicas",
    price: 2.00,
    priceLabel: "R$ 2,00",
    icon: Globe,
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
      style: "currency",
      currency: "BRL",
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
        description: `O valor mínimo é ${formatCurrency(MIN_DONATION)}`,
        variant: "destructive",
      });
      return;
    }

    if (base > MAX_DONATION) {
      toast({
        title: "Valor máximo",
        description: `O valor máximo é ${formatCurrency(MAX_DONATION)}`,
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
          popupModel: "vakinha",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
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
          <div className="p-6">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={vakinhaLogo} alt="Vakinha" className="h-10" />
            </div>

            {/* Contribution Value Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor da contribuição
              </label>
              <div className="flex items-center border-2 border-emerald-500 rounded-lg overflow-hidden bg-emerald-50">
                <span className="px-4 py-3 text-gray-600 font-medium bg-white border-r border-emerald-500">
                  R$
                </span>
                <Input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="0,00"
                  className="flex-1 border-0 text-lg font-semibold bg-emerald-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Preset Amounts Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {DONATION_AMOUNTS.map((amount) => (
                <button
                  key={amount.value}
                  onClick={() => handleSelectAmount(amount.value)}
                  className={`py-3 px-4 rounded-lg border-2 text-center font-medium transition-all ${
                    selectedAmount === amount.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  {formatCurrency(amount.value)}
                </button>
              ))}
            </div>

            {/* Min/Max Info */}
            <div className="mb-4">
              <p className="text-xs text-gray-500">
                Mínimo R$ 25,00 - Máximo R$ 1.000,00
              </p>
              {!isValidAmount() && getBaseAmount() > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Valor deve estar entre R$ 25,00 e R$ 1.000,00
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Forma de pagamento
              </p>
              <span className="inline-block px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg text-sm">
                Pix
              </span>
            </div>

            {/* Boost Section */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-5">
              <div className="bg-emerald-500 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="boost-all"
                    checked={selectedBoosts.length > 0}
                    onCheckedChange={() => {
                      if (selectedBoosts.length > 0) {
                        setSelectedBoosts([]);
                      } else {
                        setSelectedBoosts(BOOST_OPTIONS.map(b => b.id));
                      }
                    }}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-emerald-500"
                  />
                  <label htmlFor="boost-all" className="text-white font-bold text-sm uppercase tracking-wide">
                    Turbine sua doação
                  </label>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  return (
                    <div
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedBoosts.includes(boost.id) ? "bg-emerald-50" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          boost.id === 1 ? "text-emerald-500" : 
                          boost.id === 2 ? "text-pink-500" : "text-emerald-600"
                        }`} />
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
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
            <div className="mb-4 space-y-1">
              <p className="text-sm text-gray-600">
                Contribuição: {formatCurrency(getBaseAmount())}
              </p>
              <p className="text-lg font-bold text-gray-900">
                Total: {formatCurrency(totalAmount)}
              </p>
            </div>

            {/* Newsletter Checkbox */}
            <div className="flex items-start gap-3 mb-5">
              <Checkbox
                id="updates"
                checked={wantsUpdates}
                onCheckedChange={(checked) => setWantsUpdates(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="updates" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                Quero receber atualizações desta vaquinha e de outras iniciativas.
              </label>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleGeneratePix}
              disabled={!isValidAmount() || getBaseAmount() === 0}
              className="w-full py-6 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONTRIBUIR
            </Button>

            {/* Security Badge */}
            <div className="flex items-center gap-3 mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-lg flex-shrink-0">
                <Shield className="h-8 w-8 text-emerald-600" />
                <span className="sr-only">Selo de Segurança</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Garantimos uma experiência segura para todos os nossos doadores.
              </p>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
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
