import { useState, useEffect } from "react";
import { Mail, QrCode, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { cn } from "@/lib/utils";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";

interface DonationPopupHotProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  fixedAmount?: number;
  showCloseButton?: boolean;
  utmParams?: UTMParams;
}

type Step = "email" | "loading" | "pix";

export const DonationPopupHot = ({
  isOpen,
  onClose,
  userId,
  fixedAmount = 19.90,
  showCloseButton = false,
  utmParams: propUtmParams
}: DonationPopupHotProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const { toast } = useToast();
  const { trackEvent, utmParams: contextUtmParams, setAdvancedMatching } = usePixel();
  const { getFingerprint } = useDeviceFingerprint();
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) {
      return propUtmParams;
    }
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) {
      return contextUtmParams;
    }
    // Fallback: recupera diretamente do storage
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
      setPhone("");
      setIsPaid(false);
      setTimeLeft(15 * 60);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Hot',
        currency: 'BRL',
      });
    }
  }, [isOpen, trackEvent]);

  // Timer countdown
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

  // Poll for payment status using active SpedPay polling
  useEffect(() => {
    if (step !== "pix" || !pixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        // Use the new check-pix-status edge function that queries SpedPay directly
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId: pixData.transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          trackEvent("Purchase", {
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
  }, [step, pixData?.transactionId, isPaid, fixedAmount, trackEvent]);

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

    if (!phone || phone.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido.",
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
          customerPhone: phone,
          popupModel: 'hot',
          fingerprint,
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
      
      // Fire PixGenerated event with advanced matching
      trackEvent('PixGenerated', {
        value: fixedAmount,
        currency: 'BRL',
        content_name: 'Donation Hot',
      }, {
        fn: name.split(' ')[0]?.toLowerCase(),
        ln: name.split(' ').slice(1).join(' ')?.toLowerCase(),
        em: email?.toLowerCase(),
        ph: phone?.replace(/\D/g, ''),
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
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-400 to-orange-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {step === "email" ? (
              <>
                <Mail className="w-5 h-5" />
                <span className="font-medium">Informações de Acesso</span>
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                <span className="font-medium">Pagamento PIX</span>
              </>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "email" && (
            <div className="space-y-5">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-orange-300 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Preencha seus dados</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Insira suas informações para receber acesso aos conteúdos exclusivos.
                </p>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="py-5 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-5 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                />
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="py-5 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleContinue}
                className="w-full py-6 text-base font-semibold bg-gradient-to-r from-rose-400 to-orange-300 hover:from-rose-500 hover:to-orange-400 rounded-xl border-0"
              >
                Continuar para Pagamento
              </Button>
            </div>
          )}

          {step === "loading" && (
            <div className="py-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 text-center">
                Finalize o pagamento para acessar tudo.
              </h2>
              
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              </div>
              
              <p className="text-slate-500 text-center">Gerando código PIX...</p>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="space-y-4">
              {isPaid ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Pagamento confirmado!</h2>
                  <p className="text-slate-500">Obrigado! Você receberá o acesso por email.</p>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <h2 className="text-lg font-bold text-slate-800 text-center">
                    Finalize o pagamento para acessar tudo.
                  </h2>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-3 bg-white border-2 border-slate-100 rounded-xl">
                      {pixData.qrCodeUrl && pixData.qrCodeUrl.startsWith('http') ? (
                        <img
                          src={pixData.qrCodeUrl}
                          alt="QR Code PIX"
                          className="w-40 h-40"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixData.code)}`}
                          alt="QR Code PIX"
                          className="w-40 h-40"
                        />
                      )}
                    </div>
                  </div>

                  {/* Timer */}
                  <p className="text-center text-sm text-slate-500">
                    Expira em: <span className="text-rose-500 font-medium">{formatTime(timeLeft)}</span>
                  </p>

                  {/* PIX Code */}
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Código PIX Copia e Cola:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pixData.code}
                        readOnly
                        className="font-mono text-xs bg-slate-50 border-slate-200 flex-1"
                      />
                      <button
                        onClick={handleCopy}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <Button
                    onClick={handleCopy}
                    className="w-full py-5 text-base font-semibold bg-gradient-to-r from-rose-400 to-orange-300 hover:from-rose-500 hover:to-orange-400 rounded-xl border-0"
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

                  {/* Instructions */}
                  <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-slate-800">Como pagar:</p>
                    <ol className="text-sm text-slate-600 space-y-1">
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
