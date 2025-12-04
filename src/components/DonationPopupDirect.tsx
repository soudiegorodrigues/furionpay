import { useState, useEffect, useRef } from "react";
import { Heart, Copy, Check, ArrowLeft, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";

interface DonationPopupDirectProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  fixedAmount?: number;
}

type Step = "loading" | "pix" | "success";

export const DonationPopupDirect = ({
  isOpen,
  onClose,
  userId,
  fixedAmount = 100
}: DonationPopupDirectProps) => {
  const [step, setStep] = useState<Step>("loading");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const { toast } = useToast();
  const { trackEvent, utmParams } = usePixel();
  const hasGenerated = useRef(false);

  // Generate PIX automatically on open
  useEffect(() => {
    if (isOpen && !hasGenerated.current) {
      hasGenerated.current = true;
      generatePix();
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Direct',
        currency: 'BRL',
        value: fixedAmount,
      });
    }
    
    if (!isOpen) {
      hasGenerated.current = false;
      setStep("loading");
      setPixData(null);
      setIsPaid(false);
      setTimeLeft(600);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (step !== "pix" || isPaid) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, isPaid]);

  // Poll for payment status
  useEffect(() => {
    if (step !== "pix" || !pixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("pix_transactions")
          .select("status")
          .eq("id", pixData.transactionId)
          .single();

        if (!error && data?.status === "paid") {
          setIsPaid(true);
          setStep("success");
          trackEvent("Purchase", {
            value: fixedAmount,
            currency: "BRL",
            content_name: "Donation Direct",
          });
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [step, pixData?.transactionId, isPaid, fixedAmount, trackEvent]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generatePix = async () => {
    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: fixedAmount,
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
    }
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
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 text-center space-y-3">
              <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                Pague {formatCurrency(fixedAmount)} via PIX
              </h2>
              
              {/* Timer */}
              <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                QR Code expira em: <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="px-6 pb-4">
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-xl">
                  {pixData.qrCodeUrl ? (
                    <img
                      src={pixData.qrCodeUrl}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(pixData.code)}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  )}
                </div>
              </div>
              
              <p className="text-center text-sm text-slate-500 mt-4 flex items-center justify-center gap-2">
                📱 Escaneie o QR Code no app do seu banco
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center px-6 py-2">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-4 text-sm text-slate-400">ou copie o código PIX</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {/* Copy Button */}
            <div className="px-6 pb-4">
              <Button
                onClick={handleCopy}
                className="w-full py-5 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 rounded-xl"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Copiar Código PIX
                  </>
                )}
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-slate-50 px-6 py-4 space-y-2">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                📋 Como pagar:
              </h3>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>Toque em Copiar Código PIX</li>
                <li>Abra seu app do banco</li>
                <li>Vá em PIX → Copia e Cola</li>
                <li>Cole o código e confirme ✅</li>
              </ol>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                🔒 Pagamento 100% seguro via PIX
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Pagamento confirmado! ✅
            </h2>
            <p className="text-slate-600 mb-4">
              Seu pagamento de {formatCurrency(fixedAmount)} foi processado com sucesso.
            </p>
            <p className="text-slate-500">
              Obrigado pela sua compra!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationPopupDirect;
