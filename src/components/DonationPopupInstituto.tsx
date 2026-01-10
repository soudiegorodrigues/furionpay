import { useState, useEffect, useRef } from "react";
import { Heart, X, ArrowLeft, Clock, Copy, Lock } from "lucide-react";
import institutoBanner from "@/assets/cantinho-banner.webp";
import { Button } from "@/components/ui/button";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { UTMParams, getSavedUTMParams } from "@/lib/utm";
import { trackInitiateCheckoutToUtmify } from "@/lib/trackInitiateCheckout";

interface DonationPopupInstitutoProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  fixedAmount?: number;
  isPreview?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

const DONATION_AMOUNTS = [
  { amount: 30, label: "R$ 30", highlight: false },
  { amount: 40, label: "R$ 40", highlight: false },
  { amount: 50, label: "R$ 50 - JUNTE-SE À MAIORIA", highlight: true, hasHeart: true },
  { amount: 70, label: "R$ 70 - ESCOLHA SOLIDÁRIA", highlight: true, hasHeart: true },
  { amount: 100, label: "R$ 100", highlight: false },
  { amount: 150, label: "R$ 150", highlight: false },
  { amount: 200, label: "R$ 200", highlight: false },
  { amount: 300, label: "R$ 300", highlight: false },
  { amount: 500, label: "R$ 500", highlight: false },
  { amount: 750, label: "R$ 750", highlight: false },
];

type Step = "select" | "loading" | "pix";

export const DonationPopupInstituto = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
  showCloseButton = false,
  fixedAmount,
  isPreview = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupInstitutoProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  
  // Progress bar data (configurable)
  const [raised] = useState(177875.10);
  const [goal] = useState(200000);
  
  // PIX timer state
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes
  const [isPaid, setIsPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  
  const { toast } = useToast();
  const { trackEventWithCAPI, utmParams: contextUtmParams } = usePixel();
  const { getFingerprint } = useDeviceFingerprint();
  
  // Prioriza UTMs passados via prop, depois contexto, depois recupera do storage como fallback
  const getEffectiveUtmParams = (): UTMParams => {
    if (propUtmParams && Object.keys(propUtmParams).length > 0) return propUtmParams;
    if (contextUtmParams && Object.keys(contextUtmParams).length > 0) return contextUtmParams;
    return getSavedUTMParams();
  };
  const utmParams = getEffectiveUtmParams();

  // Reset timer when PIX is generated
  useEffect(() => {
    if (step === "pix") {
      setTimeLeft(10 * 60);
      setIsPaid(false);
      setCopied(false);
    }
  }, [step]);

  // Timer countdown
  useEffect(() => {
    if (step !== "pix" || isPaid || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowExpiredDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, isPaid, timeLeft]);

  // Send CAPI event for Purchase (using trackEventWithCAPI)
  const sendCAPIEvent = async (transactionId: string, value: number) => {
    try {
      // Track Purchase via CAPI for reliability
      await trackEventWithCAPI('Purchase', {
        value,
        currency: 'BRL',
        content_name: 'Donation Instituto',
        content_type: 'product',
        transaction_id: transactionId,
      }, {
        external_id: transactionId,
        country: 'br',
      });

      console.log('[CAPI Instituto] ✅ Evento Purchase enviado com sucesso');
    } catch (err) {
      console.error('[CAPI Instituto] ❌ Erro ao enviar CAPI:', err);
    }
  };

  // Poll for payment status using active SpedPay polling
  useEffect(() => {
    if (!pixData?.transactionId || step !== "pix" || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        // Use the new check-pix-status edge function that queries SpedPay directly
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId: pixData.transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          
          // Send complete Purchase event via CAPI + browser pixel
          await sendCAPIEvent(pixData.transactionId!, selectedAmount || 1000);
          
          toast({
            title: "Pagamento confirmado!",
            description: "Obrigado pela sua doação!",
          });
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pixData?.transactionId, step, selectedAmount, toast, trackEventWithCAPI, isPaid, userId, offerId]);

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(null);
      setTimeLeft(10 * 60);
      setIsPaid(false);
    } else {
      // Track InitiateCheckout via CAPI for reliability
      trackEventWithCAPI('InitiateCheckout', {
        content_name: 'Donation Popup Instituto',
        currency: 'BRL',
      });
      // Also track to UTMify server-side
      trackInitiateCheckoutToUtmify({
        userId,
        offerId,
        productName: 'Donation Instituto',
        value: selectedAmount || 50,
        utmParams,
        popupModel: 'instituto',
      });
    }
  }, [isOpen, trackEventWithCAPI, userId, offerId, utmParams, selectedAmount]);

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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
  };

  const progressPercentage = Math.min((raised / goal) * 100, 100);

  const handleGeneratePix = async (amount: number) => {
    if (amount <= 0) {
      toast({
        title: "Selecione um valor",
        description: "Escolha um valor para doar",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setStep("loading");

    try {
      const fingerprint = await getFingerprint();
      
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: amount,
          utmParams: utmParams,
          userId: userId,
          popupModel: 'instituto',
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
        setStep("select");
        return;
      }

      // Track PixGenerated via CAPI for reliability
      trackEventWithCAPI('PixGenerated', {
        value: amount,
        currency: 'BRL',
        content_name: 'Donation Instituto',
      }, {
        external_id: data.transactionId,
        country: 'br',
      });

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
      setStep("select");
    }
  };

  const handleAmountClick = (amount: number) => {
    handleSelectAmount(amount);
    handleGeneratePix(amount);
  };

  const handleBack = () => {
    setStep("select");
    setPixData(null);
    setTimeLeft(10 * 60);
  };

  const handleCopyCode = async () => {
    if (timeLeft <= 0) {
      setShowExpiredDialog(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(pixData?.code || "");
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={isPreview ? "bg-white overflow-auto" : "fixed inset-0 z-50 bg-white overflow-auto"}>
      {/* Close Button */}
      {showCloseButton && (
        <button
          onClick={onClose}
          className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10">
        {step === "select" && (
          <div className="space-y-6">
            {/* Player VTurb Style */}
            <div className="relative flex justify-center rounded-lg overflow-hidden shadow-lg">
              <video 
                ref={videoRef}
                src="/videos/vsl.mp4"
                autoPlay
                muted={isMuted}
                playsInline
                loop
                className="w-full h-auto"
                onContextMenu={(e) => e.preventDefault()}
              />
              
              {/* Overlay - Clique para ouvir */}
              {isMuted && (
                <div 
                  onClick={() => {
                    setIsMuted(false);
                    if (videoRef.current) {
                      videoRef.current.muted = false;
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                >
                  <div className="bg-[#1e3a5f]/90 rounded-lg px-6 py-4 text-center text-white">
                    <p className="text-lg font-semibold mb-3">Seu vídeo já começou</p>
                    
                    {/* Ícone de som mutado */}
                    <div className="flex justify-center mb-3">
                      <svg 
                        className="w-12 h-12" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    
                    <p className="text-base font-medium">Clique para ouvir</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Arrecadado:</span>
                <span className="text-[#E91E8C] text-2xl sm:text-3xl font-bold">
                  {formatCurrency(raised)}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Meta</span>
                <span className="text-gray-700 font-medium">
                  {formatCurrency(goal)}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #00BCD4, #4CAF50)'
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-gray-800 font-bold text-lg sm:text-xl uppercase tracking-wide">
              Qual valor você deseja doar?
            </h2>

            {/* Amount Grid */}
            <div className="grid grid-cols-2 gap-3">
              {DONATION_AMOUNTS.map((item) => (
                <button
                  key={item.amount}
                  onClick={() => handleAmountClick(item.amount)}
                  className={cn(
                    "py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all relative",
                    item.highlight 
                      ? "bg-gradient-to-r from-[#E91E8C] to-[#9C27B0] text-white shadow-lg"
                      : "bg-[#E91E8C] text-white hover:bg-[#D81B7A]",
                    selectedAmount === item.amount && "ring-2 ring-offset-2 ring-[#E91E8C]"
                  )}
                >
                  {item.hasHeart && (
                    <Heart className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <span className={item.hasHeart ? "ml-4" : ""}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Main CTA Button */}
            <Button 
              onClick={() => handleGeneratePix(1000)}
              className="w-full py-6 text-lg font-bold rounded-xl text-white"
              style={{
                background: 'linear-gradient(90deg, #E91E8C, #9C27B0)'
              }}
            >
              R$ 1000
            </Button>

            {/* Social Proof - Apoiadores */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {[
                  "https://randomuser.me/api/portraits/women/1.jpg",
                  "https://randomuser.me/api/portraits/men/2.jpg",
                  "https://randomuser.me/api/portraits/women/3.jpg",
                  "https://randomuser.me/api/portraits/men/4.jpg",
                  "https://randomuser.me/api/portraits/women/5.jpg",
                  "https://randomuser.me/api/portraits/men/6.jpg"
                ].map((src, i) => (
                  <img 
                    key={i} 
                    src={src} 
                    alt="" 
                    className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" 
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-[#E91E8C]">+1.542</span> apoiadores
              </span>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 mt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                © 2025 - Todos os direitos reservados.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                <a href="#" className="hover:text-[#E91E8C] transition-colors">Políticas de Privacidade</a>
                {" | "}
                <a href="#" className="hover:text-[#E91E8C] transition-colors">Termos de Serviço</a>
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="bg-white rounded-xl p-4 sm:p-8">
            <PixLoadingSkeleton />
          </div>
        )}

        {step === "pix" && pixData && (
          <div className="space-y-6">

            {isPaid ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 mx-auto bg-[#E91E8C]/10 rounded-full flex items-center justify-center">
                  <Heart className="w-10 h-10 text-[#E91E8C] fill-[#E91E8C]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Pagamento confirmado!</h3>
                <p className="text-gray-600">Obrigado pela sua doação de {formatCurrency(selectedAmount || 1000)}!</p>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    <Heart className="inline-block w-7 h-7 text-[#E91E8C] fill-[#E91E8C] mr-1 -mt-1" />
                    Doe {formatCurrency(selectedAmount || 1000)} e ajude a transformar vidas
                  </h2>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">QR Code expira em: <span className="font-mono font-semibold">{formatTime(timeLeft)}</span></span>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                    {pixData.qrCodeUrl && pixData.qrCodeUrl.startsWith('http') ? (
                      <img 
                        src={pixData.qrCodeUrl} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 sm:w-56 sm:h-56"
                      />
                    ) : (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.code)}`} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 sm:w-56 sm:h-56"
                      />
                    )}
                  </div>
                </div>

                <p className="text-center text-gray-500 text-sm">
                  📱 Escaneie o QR Code no app do seu banco
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 text-sm">ou copie o código PIX</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* PIX Code Input */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <input 
                    type="text"
                    readOnly
                    value={pixData.code}
                    className="w-full bg-transparent text-gray-700 text-sm font-mono truncate outline-none"
                  />
                </div>

                {/* Copy Button */}
                <Button
                  onClick={handleCopyCode}
                  className="w-full py-6 text-lg font-bold rounded-xl text-white"
                  style={{
                    background: 'linear-gradient(135deg, #E91E8C 0%, #9C27B0 100%)'
                  }}
                >
                  <Copy className="w-5 h-5 mr-2" />
                  {copied ? "Código copiado!" : "Copiar Código PIX"}
                </Button>

                {/* Instructions */}
                <div className="bg-[#E91E8C]/5 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    🎁 Como doar:
                  </p>
                  <ol className="text-sm text-gray-600 space-y-1.5">
                    <li>1. Toque em Copiar Código PIX</li>
                    <li>2. Abra seu app do banco</li>
                    <li>3. Vá em PIX → Copia e Cola</li>
                    <li>4. Cole o código e confirme 💚</li>
                    <li>5. Você acabou de transformar uma vida! 💖</li>
                  </ol>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Pagamento 100% seguro via PIX</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Expired Dialog */}
      <Dialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code expirado</DialogTitle>
            <DialogDescription>
              O tempo para pagamento expirou. Gere um novo código PIX para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowExpiredDialog(false);
                handleBack();
              }}
              style={{
                background: 'linear-gradient(135deg, #E91E8C 0%, #9C27B0 100%)'
              }}
              className="text-white"
            >
              Gerar novo código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
