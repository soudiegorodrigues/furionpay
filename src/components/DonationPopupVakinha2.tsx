import { useState, useEffect } from "react";
import { Heart, Sparkles, Gift, X, Check, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { PixQRCode } from "@/components/PixQRCode";
import { PixLoadingSkeleton } from "@/components/PixLoadingSkeleton";
import { usePixel } from "@/components/MetaPixelProvider";
import { UTMParams } from "@/lib/utm";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { toast } from "sonner";
import vakinhaLogo from "@/assets/vakinha-logo.png";

interface DonationPopupVakinha2Props {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  isPreview?: boolean;
  utmParams?: UTMParams;
}

interface PixData {
  qrCode: string;
  pixCode: string;
  transactionId: string;
  expirationMinutes: number;
}

interface BoostOption {
  id: string;
  label: string;
  price: number;
  icon: typeof Heart;
  description: string;
  color: string;
}

const DONATION_AMOUNTS = [
  { amount: 25, badge: "Popular" },
  { amount: 50 },
  { amount: 75 },
  { amount: 100, badge: "Recomendado" },
  { amount: 150 },
  { amount: 200 },
  { amount: 300 },
  { amount: 500 },
];

const BOOST_OPTIONS: BoostOption[] = [
  { 
    id: "sparkles", 
    label: "Brilho extra", 
    price: 9.99, 
    icon: Sparkles,
    description: "Destaque sua contribuição",
    color: "from-amber-400 to-orange-500"
  },
  { 
    id: "gift", 
    label: "Presente surpresa", 
    price: 19.99, 
    icon: Gift,
    description: "Envie um mimo especial",
    color: "from-pink-400 to-rose-500"
  },
  { 
    id: "zap", 
    label: "Super apoio", 
    price: 29.99, 
    icon: Zap,
    description: "Máximo impacto",
    color: "from-violet-400 to-purple-500"
  },
];

export const DonationPopupVakinha2 = ({
  isOpen,
  onClose,
  recipientName = "Vakinha",
  userId,
  showCloseButton = true,
  isPreview = false,
  utmParams: propUtmParams,
}: DonationPopupVakinha2Props) => {
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "upsell" | "loading" | "pix">("select");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const { trackEvent, utmParams: contextUtmParams } = usePixel();
  const { getFingerprint } = useDeviceFingerprint();

  // Prioridade: props > context > localStorage
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) {
      return propUtmParams;
    }
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) {
      return contextUtmParams;
    }
    try {
      const stored = localStorage.getItem('utm_params');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading UTM params from localStorage:', e);
    }
    return {};
  };

  useEffect(() => {
    if (isOpen && step === "select") {
      trackEvent("InitiateCheckout", {
        content_name: recipientName,
        content_category: "donation_vakinha2",
      });
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const parseCustomAmount = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    if (value) {
      const numValue = parseInt(value, 10) / 100;
      value = numValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const toggleBoost = (boostId: string) => {
    setSelectedBoosts(prev =>
      prev.includes(boostId)
        ? prev.filter(id => id !== boostId)
        : [...prev, boostId]
    );
  };

  const getBoostsTotal = () => {
    return selectedBoosts.reduce((total, boostId) => {
      const boost = BOOST_OPTIONS.find(b => b.id === boostId);
      return total + (boost?.price || 0);
    }, 0);
  };

  const getFinalAmount = () => {
    const baseAmount = selectedAmount || parseCustomAmount(customAmount);
    return baseAmount + getBoostsTotal();
  };

  const handleContinue = () => {
    const amount = getFinalAmount();
    if (amount < 1) {
      toast.error("Selecione um valor mínimo de R$ 1,00");
      return;
    }

    // Se não selecionou nenhum boost, mostrar upsell
    if (selectedBoosts.length === 0) {
      setStep("upsell");
    } else {
      generatePix();
    }
  };

  const handleSkipUpsell = () => {
    generatePix();
  };

  const handleAcceptUpsell = (boostId: string) => {
    setSelectedBoosts([boostId]);
    generatePix();
  };

  const generatePix = async () => {
    if (isPreview) {
      setStep("pix");
      setPixData({
        qrCode: "preview-qr-code",
        pixCode: "00020126580014br.gov.bcb.pix0136preview-pix-code",
        transactionId: "preview-transaction",
        expirationMinutes: 15,
      });
      return;
    }

    setStep("loading");

    try {
      const amount = getFinalAmount();
      const effectiveUtmParams = getEffectiveUtmParams();
      const fingerprint = await getFingerprint();

      const { data, error } = await supabase.functions.invoke("generate-pix", {
        body: {
          amount,
          userId,
          productName: recipientName,
          popupModel: "vakinha2",
          utmData: effectiveUtmParams,
          fingerprint,
        },
      });

      if (error) throw error;

      if (data.blocked) {
        toast.error(data.message || "Geração de PIX bloqueada temporariamente");
        setStep("select");
        return;
      }

      setPixData({
        qrCode: data.qrCode,
        pixCode: data.pixCode,
        transactionId: data.transactionId,
        expirationMinutes: data.expirationMinutes || 15,
      });
      setStep("pix");
    } catch (error) {
      console.error("Error generating PIX:", error);
      toast.error("Erro ao gerar PIX. Tente novamente.");
      setStep("select");
    }
  };

  const handlePaymentConfirmed = () => {
    toast.success("Pagamento confirmado! Obrigado pelo apoio! 🎉");
    onClose();
  };

  const handlePaymentExpired = () => {
    setStep("select");
    setPixData(null);
  };

  const baseAmount = selectedAmount || parseCustomAmount(customAmount);
  const isValidAmount = baseAmount >= 1;

  // Step: Select
  if (step === "select") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          )}

          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/30">
                <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={vakinhaLogo}
                    alt="Vakinha"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Apoie {recipientName}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Escolha o valor da sua contribuição
                </p>
              </div>
            </div>

            {/* Amount Grid */}
            <div className="grid grid-cols-4 gap-2">
              {DONATION_AMOUNTS.map(({ amount, badge }) => (
                <button
                  key={amount}
                  onClick={() => handleSelectAmount(amount)}
                  className={`relative py-3 px-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    selectedAmount === amount
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50"
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-[10px] font-bold text-white rounded-full whitespace-nowrap">
                      {badge}
                    </span>
                  )}
                  R$ {amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R$
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Outro valor"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="pl-12 h-12 bg-slate-800/80 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl text-center text-lg font-semibold focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="px-3 py-1.5 bg-emerald-500/20 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">
                  Pagamento via PIX
                </span>
              </div>
            </div>

            {/* Boost Options */}
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium text-center">
                ✨ Turbine sua contribuição
              </p>
              <div className="space-y-2">
                {BOOST_OPTIONS.map((boost) => {
                  const Icon = boost.icon;
                  const isSelected = selectedBoosts.includes(boost.id);
                  return (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                        isSelected
                          ? "bg-gradient-to-r " + boost.color + " shadow-lg scale-[1.02]"
                          : "bg-slate-800/60 border border-slate-700/50 hover:border-slate-600"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-white/20" : "bg-gradient-to-br " + boost.color
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{boost.label}</p>
                        <p className="text-slate-300 text-xs">{boost.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">
                          +{formatCurrency(boost.price)}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {isValidAmount && (
              <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-700/50">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Contribuição</span>
                  <span>{formatCurrency(baseAmount)}</span>
                </div>
                {getBoostsTotal() > 0 && (
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>Turbos selecionados</span>
                    <span>+{formatCurrency(getBoostsTotal())}</span>
                  </div>
                )}
                <div className="border-t border-slate-700/50 pt-2 flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-emerald-400 font-bold text-lg">
                    {formatCurrency(getFinalAmount())}
                  </span>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <Button
              onClick={handleContinue}
              disabled={!isValidAmount}
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Contribuir agora
            </Button>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-900 flex items-center justify-center"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-sm">
                <span className="text-emerald-400 font-semibold">847</span> pessoas já apoiaram
              </p>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <Shield className="w-4 h-4" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Upsell
  if (step === "upsell") {
    const featuredBoost = BOOST_OPTIONS[1]; // Gift option
    const Icon = featuredBoost.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-500/20 to-rose-500/20 blur-3xl" />
          
          <div className="relative p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${featuredBoost.color} p-4 shadow-lg`}>
                <Icon className="w-full h-full text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Que tal turbinar?
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  Adicione um toque especial à sua contribuição
                </p>
              </div>
            </div>

            {/* Featured Boost */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${featuredBoost.color} shadow-lg`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{featuredBoost.label}</p>
                  <p className="text-white/80 text-sm">{featuredBoost.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs line-through">R$ 39,99</p>
                  <p className="text-white font-bold text-xl">
                    {formatCurrency(featuredBoost.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* New Total */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Novo total</span>
                <span className="text-emerald-400 font-bold text-xl">
                  {formatCurrency(getFinalAmount() + featuredBoost.price)}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleAcceptUpsell(featuredBoost.id)}
                className={`w-full h-14 bg-gradient-to-r ${featuredBoost.color} hover:opacity-90 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-200`}
              >
                Sim, quero turbinar! 🎁
              </Button>
              <button
                onClick={handleSkipUpsell}
                className="w-full py-3 text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                Não, continuar sem turbo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Loading
  if (step === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <PixLoadingSkeleton />
        </div>
      </div>
    );
  }

  // Step: PIX
  if (step === "pix" && pixData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          )}

          <div className="p-6">
            <PixQRCode
              amount={getFinalAmount()}
              pixCode={pixData.pixCode}
              qrCodeUrl={pixData.qrCode}
              transactionId={pixData.transactionId}
              expirationMinutes={pixData.expirationMinutes}
              onRegenerate={() => {
                setStep("select");
                setPixData(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DonationPopupVakinha2;
