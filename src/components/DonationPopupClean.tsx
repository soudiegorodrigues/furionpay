import { useState, useEffect } from "react";
import { Heart, Copy, Check, Smartphone, CheckCircle, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { cn } from "@/lib/utils";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";

interface DonationPopupCleanProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

const DONATION_AMOUNTS = [
  { amount: 20 },
  { amount: 30, highlight: true },
  { amount: 50 },
  { amount: 100 },
  { amount: 200 },
  { amount: 500 },
  { amount: 750 },
  { amount: 850 },
  { amount: 1000 },
];

const BOOST_OPTIONS = [
  { id: 1, label: "Reforma Ong", price: 50.00, icon: "🏠" },
  { id: 2, label: "Ração 5kg", price: 34.90, icon: "🍖" },
  { id: 3, label: "Vacina", price: 32.70, icon: "💉" },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupClean = ({
  isOpen,
  onClose,
  recipientName = "Davizinho",
  userId,
  showCloseButton = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupCleanProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(30);
  const [selectedBoosts, setSelectedBoosts] = useState<number[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const { toast } = useToast();
  const { trackEventWithCAPI, utmParams: contextUtmParams } = usePixel();
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) return propUtmParams;
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) return contextUtmParams;
    return getSavedUTMParams();
  };
  const utmParams = getEffectiveUtmParams();

  const toggleBoost = (id: number) => {
    setSelectedBoosts(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const boostTotal = selectedBoosts.reduce((sum, id) => {
    const boost = BOOST_OPTIONS.find(b => b.id === id);
    return sum + (boost?.price || 0);
  }, 0);

  const totalAmount = selectedAmount + boostTotal;

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(30);
      setSelectedBoosts([]);
      setIsPaid(false);
    }
  }, [isOpen]);

  // Poll for payment status
  useEffect(() => {
    if (step !== "pix" || !pixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        // Use check-pix-status edge function to query acquirer directly
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId: pixData.transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          // Track Purchase via CAPI for reliability
          trackEventWithCAPI("Purchase", {
            value: totalAmount,
            currency: "BRL",
            content_name: "Donation Clean",
          });
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [step, pixData?.transactionId, isPaid, totalAmount, trackEventWithCAPI]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleGeneratePix = async () => {
    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: totalAmount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'clean',
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
      
      // Track InitiateCheckout when PIX is generated
      trackEventWithCAPI('InitiateCheckout', {
        value: totalAmount,
        currency: 'BRL',
        content_name: 'Donation Clean',
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
    setIsPaid(false);
  };

  const handleCopy = async () => {
    if (!pixData?.code) return;
    try {
      await navigator.clipboard.writeText(pixData.code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamentos",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto my-auto">
        {/* Close Button */}
        {showCloseButton && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {step === "select" && (
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" fill="currentColor" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  Faça sua doação ❤️
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Escolha um valor e ajude a transformar vidas
                </p>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {DONATION_AMOUNTS.map(({ amount, highlight }) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={cn(
                      "py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg sm:rounded-xl text-center font-semibold transition-all text-xs sm:text-base whitespace-nowrap",
                      selectedAmount === amount
                        ? "bg-emerald-500 text-white shadow-lg scale-105"
                        : highlight
                        ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    R$ {amount}
                  </button>
                ))}
              </div>

              {/* Boost Options */}
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm font-medium text-slate-700">Turbine sua doação</p>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {BOOST_OPTIONS.map((boost) => (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      className={cn(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all text-center",
                        selectedBoosts.includes(boost.id)
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{boost.icon}</div>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-700 leading-tight">{boost.label}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">{formatCurrency(boost.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5 sm:space-y-2 bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Contribuição:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(selectedAmount)}</span>
                </div>
                {selectedBoosts.length > 0 && (
                  <>
                    {selectedBoosts.map(id => {
                      const boost = BOOST_OPTIONS.find(b => b.id === id);
                      if (!boost) return null;
                      return (
                        <div key={id} className="flex justify-between text-xs sm:text-sm">
                          <span className="text-slate-500">{boost.label}:</span>
                          <span className="font-medium text-slate-700">{formatCurrency(boost.price)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm sm:text-base font-semibold">
                        <span className="text-slate-700">Total:</span>
                        <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </>
                )}
                {selectedBoosts.length === 0 && (
                  <div className="flex justify-between text-sm sm:text-base font-semibold">
                    <span className="text-slate-700">Total:</span>
                    <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleGeneratePix}
                className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
              >
                Doar Agora
              </Button>

              {/* Social Proof - Supporters */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                <div className="flex -space-x-2">
                  {[
                    "https://randomuser.me/api/portraits/women/1.jpg",
                    "https://randomuser.me/api/portraits/men/2.jpg",
                    "https://randomuser.me/api/portraits/women/3.jpg",
                    "https://randomuser.me/api/portraits/men/4.jpg",
                  ].map((src, i) => (
                    <img 
                      key={i} 
                      src={src} 
                      alt="" 
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white object-cover" 
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">+1.542</span> apoiadores
                </span>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 animate-fade-in">
              <PixLoadingSkeleton />
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-4 sm:p-6 text-center space-y-1.5 sm:space-y-2">
                
                <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-emerald-600" fill="currentColor" />
                </div>
                
                {isPaid ? (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                      Obrigado pela sua doação! 🎉
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Seu pagamento foi confirmado com sucesso.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                      Você está salvando uma vida ❤️
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Finalize o pagamento abaixo para confirmar sua doação.
                    </p>
                  </>
                )}
                
                <p className="text-base sm:text-lg">
                  Valor total: <span className="font-bold text-emerald-600">{formatCurrency(totalAmount)}</span>
                </p>
              </div>

              {isPaid ? (
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                  </div>
                  <p className="text-sm sm:text-base text-slate-600">
                    Sua contribuição faz toda a diferença!
                  </p>
                </div>
              ) : (
                <>
                  {/* QR Code Section */}
                  <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                    <p className="text-xs sm:text-sm text-slate-500 text-center mb-3 sm:mb-4">
                      Escaneie o QR Code ou copie o código Pix abaixo para finalizar o pagamento.
                    </p>
                    
                    <div className="flex justify-center">
                      <div className="p-3 sm:p-4 bg-white border-2 border-slate-100 rounded-xl">
                        {pixData.qrCodeUrl && pixData.qrCodeUrl.startsWith('http') ? (
                          <img
                            src={pixData.qrCodeUrl}
                            alt="QR Code PIX"
                            className="w-36 h-36 sm:w-44 sm:h-44"
                          />
                        ) : (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(pixData.code)}`}
                            alt="QR Code PIX"
                            className="w-36 h-36 sm:w-44 sm:h-44"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center px-4 sm:px-6 py-2">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="px-3 sm:px-4 text-xs sm:text-sm text-slate-400">ou</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>

                  {/* PIX Code */}
                  <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                    <Input
                      value={pixData.code}
                      readOnly
                      className="font-mono text-[10px] sm:text-xs text-center bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Copy Button */}
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <Button
                      onClick={handleCopy}
                      className="w-full py-4 sm:py-5 text-sm sm:text-base font-semibold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          COPIADO!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5 mr-2" />
                          COPIAR
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="bg-slate-50 p-4 sm:p-6 space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-center text-sm sm:text-base text-slate-800">Como pagar?</h3>
                    
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Escaneie o QR Code ou copie e cole o código Pix em seu app bancário ou carteira digital.
                      </p>
                    </div>
                    
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Seu pagamento será aprovado em alguns instantes.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default DonationPopupClean;