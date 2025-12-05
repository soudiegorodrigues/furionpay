import { useState, useEffect } from "react";
import { Heart, Copy, Check, Smartphone, CheckCircle, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { cn } from "@/lib/utils";

interface DonationPopupCleanProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
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

type Step = "select" | "loading" | "pix";

export const DonationPopupClean = ({
  isOpen,
  onClose,
  recipientName = "Davizinho",
  userId,
  showCloseButton = false
}: DonationPopupCleanProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(30);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const { toast } = useToast();
  const { trackEvent, utmParams } = usePixel();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(30);
      setIsPaid(false);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Clean',
        currency: 'BRL',
      });
    }
  }, [isOpen, trackEvent]);

  // Poll for payment status using secure RPC function
  useEffect(() => {
    if (step !== "pix" || !pixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .rpc("get_transaction_status_by_id", { p_id: pixData.transactionId });

        if (!error && data && data.length > 0 && data[0].status === "paid") {
          setIsPaid(true);
          trackEvent("Purchase", {
            value: selectedAmount,
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
  }, [step, pixData?.transactionId, isPaid, selectedAmount, trackEvent]);

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
          amount: selectedAmount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'clean',
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
      
      // Fire PixGenerated event
      trackEvent('PixGenerated', {
        value: selectedAmount,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md">
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
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6 animate-fade-in">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="w-7 h-7 text-emerald-600" fill="currentColor" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Faça sua doação ❤️
                </h2>
                <p className="text-sm text-slate-500">
                  Escolha um valor e ajude a transformar vidas
                </p>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {DONATION_AMOUNTS.map(({ amount, highlight }) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={cn(
                      "py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-center font-semibold transition-all text-sm sm:text-base whitespace-nowrap",
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

              {/* Selected Amount */}
              <div className="text-center py-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Valor selecionado</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(selectedAmount)}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleGeneratePix}
                className="w-full py-6 text-lg font-semibold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
              >
                Doar Agora
              </Button>
            </div>
          )}

          {step === "loading" && (
            <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
              <PixLoadingSkeleton />
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="p-6 text-center space-y-2">
                
                <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-emerald-600" fill="currentColor" />
                </div>
                
                {isPaid ? (
                  <>
                    <h2 className="text-xl font-bold text-slate-800">
                      Obrigado pela sua doação! 🎉
                    </h2>
                    <p className="text-sm text-slate-500">
                      Seu pagamento foi confirmado com sucesso.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-slate-800">
                      Você está salvando uma vida ❤️
                    </h2>
                    <p className="text-sm text-slate-500">
                      Finalize o pagamento abaixo para confirmar sua doação.
                    </p>
                  </>
                )}
                
                <p className="text-lg">
                  Valor total: <span className="font-bold text-emerald-600">{formatCurrency(selectedAmount)}</span>
                </p>
              </div>

              {isPaid ? (
                <div className="p-6 text-center">
                  <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="text-slate-600">
                    Sua contribuição faz toda a diferença!
                  </p>
                </div>
              ) : (
                <>
                  {/* QR Code Section */}
                  <div className="px-6 pb-4">
                    <p className="text-sm text-slate-500 text-center mb-4">
                      Escaneie o QR Code ou copie o código Pix abaixo para finalizar o pagamento.
                    </p>
                    
                    <div className="flex justify-center">
                      <div className="p-4 bg-white border-2 border-slate-100 rounded-xl">
                        {pixData.qrCodeUrl ? (
                          <img
                            src={pixData.qrCodeUrl}
                            alt="QR Code PIX"
                            className="w-44 h-44"
                          />
                        ) : (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(pixData.code)}`}
                            alt="QR Code PIX"
                            className="w-44 h-44"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center px-6 py-2">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="px-4 text-sm text-slate-400">ou</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>

                  {/* PIX Code */}
                  <div className="px-6 pb-4">
                    <Input
                      value={pixData.code}
                      readOnly
                      className="font-mono text-xs text-center bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Copy Button */}
                  <div className="px-6 pb-6">
                    <Button
                      onClick={handleCopy}
                      className="w-full py-5 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
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
                  <div className="bg-slate-50 p-6 space-y-4">
                    <h3 className="font-semibold text-center text-slate-800">Como pagar?</h3>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Smartphone className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600">
                        Escaneie o QR Code ou copie e cole o código Pix em seu app bancário ou carteira digital.
                      </p>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600">
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