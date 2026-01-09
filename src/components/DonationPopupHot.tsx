import { useState, useEffect } from "react";
import { User, QrCode, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";
import { trackInitiateCheckoutToUtmify } from "@/lib/trackInitiateCheckout";

interface DonationPopupHotProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  fixedAmount?: number;
  showCloseButton?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

type Step = "email" | "loading" | "pix";

export const DonationPopupHot = ({
  isOpen,
  onClose,
  userId,
  fixedAmount = 19.90,
  showCloseButton = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupHotProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const { toast } = useToast();
  const { trackEventWithCAPI, utmParams: contextUtmParams } = usePixel();
  const { getFingerprint } = useDeviceFingerprint();
  
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) {
      return propUtmParams;
    }
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) {
      return contextUtmParams;
    }
    const savedParams = getSavedUTMParams();
    console.log('[UTM DEBUG] DonationPopupHot - Usando UTMs do storage:', savedParams);
    return savedParams;
  };
  
  const utmParams = getEffectiveUtmParams();

  useEffect(() => {
    if (!isOpen) {
      setStep("email");
      setPixData(null);
      setName("");
      setEmail("");
      setIsPaid(false);
      setTimeLeft(15 * 60);
    } else {
      // Track InitiateCheckout via CAPI for reliability
      trackEventWithCAPI('InitiateCheckout', {
        content_name: 'Donation Popup Hot',
        currency: 'BRL',
      });
      // Also track to UTMify server-side
      trackInitiateCheckoutToUtmify({
        userId,
        offerId,
        productName: 'Donation Hot',
        value: fixedAmount,
        utmParams,
        popupModel: 'hot',
      });
    }
  }, [isOpen, trackEventWithCAPI, userId, offerId, utmParams, fixedAmount]);

  useEffect(() => {
    if (step !== "pix" || isPaid || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, isPaid, timeLeft]);

  useEffect(() => {
    if (step !== "pix" || !pixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId: pixData.transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          // Track Purchase via CAPI for reliability
          trackEventWithCAPI("Purchase", {
            value: fixedAmount,
            currency: "BRL",
            content_name: "Donation Hot",
          });
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [step, pixData?.transactionId, isPaid, fixedAmount, trackEventWithCAPI]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira seu nome.",
        variant: "destructive",
      });
      return;
    }

    if (!email || !email.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setStep("loading");

    try {
      const fingerprint = await getFingerprint();
      
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: fixedAmount,
          utmParams: utmParams,
          userId: userId,
          customerName: name,
          customerEmail: email,
          popupModel: 'hot',
          fingerprint,
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
        setStep("email");
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
        content_name: 'Donation Hot',
      }, {
        fn: name.split(' ')[0]?.toLowerCase(),
        ln: name.split(' ').slice(1).join(' ')?.toLowerCase(),
        em: email?.toLowerCase(),
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
      setStep("email");
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
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-400 to-orange-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {step === "email" ? (
              <>
                <User className="w-5 h-5" />
                <span className="font-medium">Seus Dados</span>
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                <span className="font-medium">Pagamento PIX</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {step === "email" && (
            <div className="space-y-4 sm:space-y-5">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f4a574] rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Quase lá!</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Preencha seus dados para gerar o QR Code de pagamento.
                </p>
              </div>

              {/* Plan/Value Card */}
              <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs sm:text-sm">Plano</span>
                  <span className="font-semibold text-slate-800 text-sm sm:text-base">Assinatura</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs sm:text-sm">Valor</span>
                  <span className="font-semibold text-orange-500 text-sm sm:text-base">{formatCurrency(fixedAmount)}</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Nome ou Apelido</label>
                  <Input
                    type="text"
                    placeholder="Como posso te chamar bb?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="py-4 sm:py-5 text-sm sm:text-base border-gray-200 focus:border-orange-400 focus:ring-orange-400 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="py-4 sm:py-5 text-sm sm:text-base border-gray-200 focus:border-orange-400 focus:ring-orange-400 rounded-2xl"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleContinue}
                className="w-full py-5 sm:py-6 text-sm sm:text-base font-semibold bg-gradient-to-r from-rose-400 to-orange-300 hover:from-rose-500 hover:to-orange-400 rounded-2xl border-0"
              >
                Finalizar assinatura
              </Button>
            </div>
          )}

          {step === "loading" && (
            <div className="py-6 sm:py-8 space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 text-center">
                Finalize o pagamento para acessar tudo.
              </h2>
              
              <div className="flex justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              </div>
              
              <p className="text-slate-500 text-center text-sm sm:text-base">Gerando código PIX...</p>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="space-y-3 sm:space-y-4">
              {isPaid ? (
                <div className="py-6 sm:py-8 text-center space-y-3 sm:space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Pagamento confirmado!</h2>
                  <p className="text-slate-500 text-sm sm:text-base">Obrigado! Você receberá o acesso por email.</p>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 text-center">
                    Finalize o pagamento para acessar tudo.
                  </h2>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-2 sm:p-3 bg-white border-2 border-slate-100 rounded-xl">
                      {pixData.qrCodeUrl && pixData.qrCodeUrl.startsWith('http') ? (
                        <img
                          src={pixData.qrCodeUrl}
                          alt="QR Code PIX"
                          className="w-32 h-32 sm:w-40 sm:h-40"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixData.code)}`}
                          alt="QR Code PIX"
                          className="w-32 h-32 sm:w-40 sm:h-40"
                        />
                      )}
                    </div>
                  </div>

                  {/* Timer */}
                  <p className="text-center text-xs sm:text-sm text-slate-500">
                    Expira em: <span className="text-rose-500 font-medium">{formatTime(timeLeft)}</span>
                  </p>

                  {/* PIX Code */}
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-2">Código PIX Copia e Cola:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pixData.code}
                        readOnly
                        className="font-mono text-[10px] sm:text-xs bg-slate-50 border-slate-200 flex-1"
                      />
                      <button
                        onClick={handleCopy}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <Button
                    onClick={handleCopy}
                    className="w-full py-4 sm:py-5 text-sm sm:text-base font-semibold bg-gradient-to-r from-rose-400 to-orange-300 hover:from-rose-500 hover:to-orange-400 rounded-xl border-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Copiar Código PIX
                      </>
                    )}
                  </Button>

                  {/* Instructions */}
                  <div className="bg-orange-50 rounded-xl p-3 sm:p-4 space-y-2">
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">Como pagar:</p>
                    <ol className="text-xs sm:text-sm text-slate-600 space-y-1">
                      <li>1. Abra o app do seu banco</li>
                      <li>2. Escolha pagar via PIX</li>
                      <li>3. Escaneie o QR Code ou cole o código</li>
                      <li>4. Confirme o pagamento</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationPopupHot;
