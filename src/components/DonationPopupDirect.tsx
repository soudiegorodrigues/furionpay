import { useState, useEffect, useRef } from "react";
import { Heart, Copy, Check, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";
import { trackInitiateCheckoutToUtmify } from "@/lib/trackInitiateCheckout";


interface DonationPopupDirectProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  fixedAmount?: number;
  showCloseButton?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

type Step = "loading" | "pix" | "success";

export const DonationPopupDirect = ({
  isOpen,
  onClose,
  userId,
  fixedAmount = 100,
  showCloseButton = false,
  utmParams: propUtmParams,
  offerId,
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
  const { trackEventWithCAPI, utmParams: contextUtmParams } = usePixel();
  const hasGenerated = useRef(false);
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) return propUtmParams;
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) return contextUtmParams;
    return getSavedUTMParams();
  };
  const utmParams = getEffectiveUtmParams();

  // Generate PIX automatically on open
  useEffect(() => {
    if (isOpen && !hasGenerated.current) {
      hasGenerated.current = true;
      generatePix();
      // Track InitiateCheckout via CAPI for reliability
      trackEventWithCAPI('InitiateCheckout', {
        content_name: 'Donation Popup Direct',
        currency: 'BRL',
        value: fixedAmount,
      });
      // Also track to UTMify server-side
      trackInitiateCheckoutToUtmify({
        userId,
        offerId,
        productName: 'Donation Direct',
        value: fixedAmount,
        utmParams,
        popupModel: 'direct',
      });
    }
    
    if (!isOpen) {
      hasGenerated.current = false;
      setStep("loading");
      setPixData(null);
      setIsPaid(false);
      setTimeLeft(600);
    }
  }, [isOpen, userId, offerId, utmParams, fixedAmount]);

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
        // Use check-pix-status edge function to query acquirer directly
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId: pixData.transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          setStep("success");
          // Track Purchase via CAPI for reliability
          trackEventWithCAPI("Purchase", {
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
  }, [step, pixData?.transactionId, isPaid, fixedAmount, trackEventWithCAPI]);

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
          popupModel: 'direct',
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
        return;
      }

      setPixData({
        code: data.pixCode,
        qrCodeUrl: data.qrCodeUrl,
        transactionId: data.transactionId,
      });
      
      // Fire PixGenerated event via CAPI for reliability
      trackEventWithCAPI('PixGenerated', {
        value: fixedAmount,
        currency: 'BRL',
        content_name: 'Donation Direct',
      }, {
        external_id: data.transactionId,
        country: 'br',
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
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

        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                Pague via PIX
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 48 48">
                  <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
                  <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
                  <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
                </svg>
              </h2>
              
              {/* Timer */}
              <p className="text-slate-500 flex items-center justify-center gap-1">
                ⏳ Expira em <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </p>
            </div>

            {/* QR Code Section */}
            <div className="px-6 pb-4">
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-xl">
                  {pixData.qrCodeUrl && pixData.qrCodeUrl.startsWith('http') ? (
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

            {/* PIX Code */}
            <div className="px-6 pb-4">
              <Input
                value={pixData.code}
                readOnly
                className="font-mono text-xs text-center bg-slate-50 border-slate-200"
              />
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
