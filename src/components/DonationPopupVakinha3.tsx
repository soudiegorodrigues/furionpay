import { useState, useEffect, useRef } from "react";
import { Heart, Sprout, ShoppingBasket, Lock, X, Copy, Check, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixLoadingSkeleton } from "./PixLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "./MetaPixelProvider";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import pixLogo from "@/assets/pix-logo.png";
import vakinhaLogo from "@/assets/vakinha-logo.png";
import vakinhaBanner from "@/assets/vakinha-banner.jpg";
import { UTMParams, getSavedUTMParams } from "@/lib/utm";

interface DonationPopupVakinha3Props {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  userId?: string;
  showCloseButton?: boolean;
  isPreview?: boolean;
  utmParams?: UTMParams;
  offerId?: string;
}

const DONATION_AMOUNTS: {
  amount: number;
  badge?: string;
}[] = [{
  amount: 30
}, {
  amount: 50
}, {
  amount: 75
}, {
  amount: 100,
  badge: "Doe com Amor 💚"
}, {
  amount: 300
}, {
  amount: 500
}, {
  amount: 750
}, {
  amount: 1000
}];

const BOOST_OPTIONS = [{
  id: "hearts",
  label: "10 corações",
  price: 10.99,
  icon: Heart,
  color: "text-emerald-500",
  bgColor: "bg-emerald-100"
}, {
  id: "impact",
  label: "Ajudar Uma Vida a Florescer",
  price: 25,
  icon: Sprout,
  color: "text-amber-600",
  bgColor: "bg-amber-100"
}, {
  id: "basket",
  label: "Doar cesta básica",
  price: 65,
  icon: ShoppingBasket,
  color: "text-orange-500",
  bgColor: "bg-orange-100"
}];

type Step = "select" | "upsell" | "loading" | "pix";

export const DonationPopupVakinha3 = ({
  isOpen,
  onClose,
  recipientName = "Campanha Solidária",
  userId,
  showCloseButton = false,
  isPreview = false,
  utmParams: propUtmParams,
  offerId,
}: DonationPopupVakinha3Props) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [pixData, setPixData] = useState<{
    code: string;
    qrCodeUrl?: string;
    transactionId?: string;
  } | null>(null);
  const {
    toast
  } = useToast();
  const {
    trackEvent,
    utmParams: contextUtmParams
  } = usePixel();
  const {
    getFingerprint
  } = useDeviceFingerprint();

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
    console.log('[UTM DEBUG] DonationPopupVakinha3 - Usando UTMs do storage:', savedParams);
    return savedParams;
  };
  const utmParams = getEffectiveUtmParams();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setPixData(null);
      setSelectedAmount(null);
      setSelectedBoosts([]);
    } else {
      trackEvent('InitiateCheckout', {
        content_name: 'Donation Popup Vakinha3',
        currency: 'BRL'
      });
    }
  }, [isOpen, trackEvent, userId, offerId, utmParams, selectedAmount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
  };

  const toggleBoost = (boostId: string) => {
    setSelectedBoosts(prev => prev.includes(boostId) ? prev.filter(id => id !== boostId) : [...prev, boostId]);
  };

  const calculateTotal = () => {
    const baseAmount = selectedAmount || 0;
    const boostTotal = selectedBoosts.reduce((sum, boostId) => {
      const boost = BOOST_OPTIONS.find(b => b.id === boostId);
      return sum + (boost?.price || 0);
    }, 0);
    return baseAmount + boostTotal;
  };

  const getContributionAmount = () => {
    return selectedAmount || 0;
  };

  const handleContributeClick = () => {
    if (!selectedAmount) {
      toast({
        title: "Selecione um valor",
        description: "Por favor, selecione um valor para contribuir",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    // Vai direto pro PIX (sem upsell)
    handleGeneratePix();
  };

  const handleGeneratePix = async () => {
    const total = calculateTotal();
    setStep("loading");
    
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PIX] Tentativa ${attempt + 1} de ${maxRetries + 1} para gerar PIX`);
        
        // Get device fingerprint for anti-abuse
        const fingerprint = await getFingerprint();
        const { data, error } = await supabase.functions.invoke('generate-pix', {
          body: {
            amount: total,
            utmParams: utmParams,
            userId: userId,
            popupModel: 'vakinha3',
            fingerprint,
            offerId: offerId,
          }
        });
        
        if (error) {
          console.error(`[PIX] Erro na tentativa ${attempt + 1}:`, error);
          lastError = error;
          
          // Se não é a última tentativa, aguarda e tenta novamente
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          toast({
            title: "Erro ao gerar PIX",
            description: "Tente novamente em alguns instantes.",
            variant: "destructive"
          });
          setStep("select");
          return;
        }

        // Check for rate limit error (não faz retry para rate limit)
        if (data?.error === 'RATE_LIMIT') {
          toast({
            title: "Limite atingido",
            description: data.message || "Você atingiu o limite de PIX. Tente novamente mais tarde.",
            variant: "destructive",
            duration: 6000
          });
          setStep("select");
          return;
        }
        
        // Verifica se os dados do PIX são válidos
        if (!data?.pixCode) {
          console.error(`[PIX] Resposta inválida na tentativa ${attempt + 1}:`, data);
          lastError = new Error('Resposta inválida do servidor');
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          toast({
            title: "Erro ao gerar PIX",
            description: "Resposta inválida do servidor. Tente novamente.",
            variant: "destructive"
          });
          setStep("select");
          return;
        }
        
        console.log(`[PIX] PIX gerado com sucesso na tentativa ${attempt + 1}`);
        
        trackEvent('PixGenerated', {
          value: total,
          currency: 'BRL',
          content_name: 'Donation Vakinha3'
        }, {
          external_id: data.transactionId,
          country: 'br'
        });
        
        setPixData({
          code: data.pixCode,
          qrCodeUrl: data.qrCodeUrl,
          transactionId: data.transactionId
        });
        setStep("pix");
        return; // Sucesso, sai da função
        
      } catch (err) {
        console.error(`[PIX] Exceção na tentativa ${attempt + 1}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Se não é a última tentativa, aguarda e tenta novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.error('[PIX] Todas as tentativas falharam:', lastError);
    toast({
      title: "Erro ao gerar PIX",
      description: "Não foi possível gerar o PIX após várias tentativas. Verifique sua conexão.",
      variant: "destructive"
    });
    setStep("select");
  };

  const handleUpsellAccept = (boostId: string) => {
    setSelectedBoosts([boostId]);
    handleGeneratePix();
  };

  const handleUpsellDecline = () => {
    handleGeneratePix();
  };

  if (!isOpen) return null;

  return <div className={isPreview ? "bg-white overflow-auto" : "fixed inset-0 z-50 bg-white overflow-auto"}>
      {/* Close Button */}
      {showCloseButton && <button onClick={onClose} className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Fechar">
          <X className="w-5 h-5 text-gray-600" />
        </button>}
      
      <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-10">
        {step === "select" && <div className="space-y-5 sm:space-y-6">
            {/* Banner */}
            <div className="w-full flex justify-center mb-4">
              <img src={vakinhaBanner} alt="Salvando Vidas - Vakinha" className="w-full max-w-md h-auto object-cover rounded-lg" />
            </div>

            {/* Contribution Value Section */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Valor da contribuição</h2>
              
              {/* Amount Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {DONATION_AMOUNTS.map(item => <button key={item.amount} onClick={() => handleSelectAmount(item.amount)} className={cn("relative py-3 px-3 sm:py-3.5 sm:px-4 rounded-lg border-2 transition-all font-medium text-sm sm:text-base", selectedAmount === item.amount ? "border-[#00A651] bg-[#00A651]/5 text-[#00A651]" : "border-gray-300 bg-white text-gray-700 hover:border-[#00A651]/50")}>
                    {item.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00A651] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {item.badge}
                      </span>}
                    {formatCurrency(item.amount)}
                  </button>)}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Forma de pagamento</h2>
              <div className="inline-flex items-center gap-1.5 bg-[#E8F5F0] text-[#00A651] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                <img src={pixLogo} alt="PIX" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold text-xs sm:text-sm">PIX</span>
              </div>
            </div>

            {/* Boost Section */}
            <div className="relative">
              
              
              
            </div>

            {/* Summary */}
            <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <div className="flex justify-between text-gray-700">
                
                
              </div>
              
            </div>

            {/* CTA Button */}
            <Button onClick={handleContributeClick} className="w-full bg-[#00A651] hover:bg-[#008a44] text-white font-bold text-base sm:text-lg py-6 sm:py-7 rounded-lg">
              CONTRIBUIR
            </Button>

            {/* Social Proof - Supporters */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {["https://randomuser.me/api/portraits/women/1.jpg", "https://randomuser.me/api/portraits/men/2.jpg", "https://randomuser.me/api/portraits/women/3.jpg", "https://randomuser.me/api/portraits/men/4.jpg", "https://randomuser.me/api/portraits/women/5.jpg", "https://randomuser.me/api/portraits/men/6.jpg"].map((src, i) => <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />)}
              </div>
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">+1.542</span> apoiadores
              </span>
            </div>

            {/* Footer */}
              <p className="text-[10px] sm:text-xs text-gray-600">
              Ao clicar no botão acima você declara que é maior de 18 anos, leu e está de acordo com os{" "}
              <span className="font-bold text-gray-900">Termos, Taxas e Prazos</span>.
            </p>

            {/* Security Badge */}
            <div className="bg-[#E8F5E9] rounded-2xl p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
              {/* Badge pill */}
              <div className="inline-flex items-center bg-[#1a3a2a] rounded-full pl-0.5 pr-2 py-0.5 sm:pl-1 sm:pr-3 sm:py-1 gap-1.5 sm:gap-2 shrink-0">
                {/* Green circle with lock icon */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-400 border-2 border-[#00A651] flex items-center justify-center">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-[#00A651]" />
                </div>
                {/* Badge text */}
                <div className="text-white text-[8px] sm:text-[10px] font-bold leading-tight">
                  <div>SELO DE</div>
                  <div>SEGURANÇA</div>
                </div>
              </div>
              {/* Description text */}
              <p className="text-[10px] sm:text-sm text-gray-700">
                Garantimos uma <span className="font-bold text-gray-900">experiência segura</span> para todos os nossos doadores.
              </p>
            </div>

            {/* Additional Info */}
            <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
              Informamos que o preenchimento do seu cadastro completo estará disponível em seu painel pessoal na plataforma após a conclusão desta doação.
            </p>
          </div>}


        {step === "loading" && <PixLoadingSkeleton />}

        {step === "pix" && pixData && <PixScreenVakinha3 
          pixCode={pixData.code} 
          transactionId={pixData.transactionId} 
          amount={calculateTotal()} 
          selectedAmount={selectedAmount}
          trackEvent={trackEvent}
          isPreview={isPreview}
        />}
      </div>
    </div>;
};

// Componente customizado da tela de PIX para Vakinha3
interface PixScreenVakinha3Props {
  pixCode: string;
  transactionId?: string;
  amount: number;
  selectedAmount: number | null;
  trackEvent: (event: string, params?: Record<string, unknown>, userData?: Record<string, unknown>) => void;
  isPreview?: boolean;
}

const PixScreenVakinha3 = ({ pixCode, transactionId, amount, selectedAmount, trackEvent, isPreview }: PixScreenVakinha3Props) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const { toast } = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento",
        duration: 2000
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente",
        variant: "destructive"
      });
    }
  };

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!transactionId || paymentConfirmed) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId }
        });

        if (!error && data?.status === 'paid') {
          setPaymentConfirmed(true);
          trackEvent('Purchase', {
            value: amount,
            currency: 'BRL',
            content_name: 'Donation Vakinha3'
          });
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    pollingRef.current = setInterval(checkStatus, 5000);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [transactionId, paymentConfirmed, amount, trackEvent]);

  // Timer de expiração
  useEffect(() => {
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
  }, []);

  // Tela de pagamento confirmado
  if (paymentConfirmed) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-20 h-20 bg-[#00A651] rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[#00A651]">Pagamento Confirmado!</h2>
        <p className="text-gray-600">Obrigado por sua doação de {formatCurrency(amount)}</p>
        <p className="text-gray-500 text-sm">Sua contribuição faz a diferença! 💚</p>
      </div>
    );
  }

  // Encontra o badge do valor selecionado
  const selectedDonation = DONATION_AMOUNTS.find(d => d.amount === selectedAmount);

  return (
    <div className="space-y-0">
      {/* Barra verde no topo */}
      <div className="bg-[#00A651] text-white text-center py-3 px-4 rounded-t-lg -mx-3 sm:-mx-4 -mt-4 sm:-mt-10">
        <p className="text-sm sm:text-base font-medium">
          Parabéns por esse lindo gesto de solidariedade!
        </p>
      </div>

      {/* Banner */}
      <div className="pt-4 pb-3">
        <img 
          src={vakinhaBanner} 
          alt="Salvando Vidas - Vakinha" 
          className="w-full h-auto object-cover rounded-lg shadow-md" 
        />
      </div>

      {/* Logo centralizado */}
      <div className="flex justify-center -mt-6 mb-2 relative z-10">
        <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-[#00A651]">
          <span className="text-[#00A651] font-bold text-xl">V</span>
        </div>
      </div>

      {/* Informações da doação */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-gray-500 text-sm">Opção Selecionada</p>
        {selectedDonation?.badge ? (
          <p className="text-[#00A651] font-semibold">{selectedDonation.badge}</p>
        ) : (
          <p className="text-[#00A651] font-semibold">Doação</p>
        )}
        <p className="text-lg">
          Valor total: <span className="text-[#00A651] font-bold text-xl">{formatCurrency(amount)}</span>
        </p>
      </div>

      {/* Área do QR Code */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <p className="text-center text-gray-600 text-sm">
          Escaneie o QR Code ou copie e cole o código Pix abaixo para finalizar o pagamento.
        </p>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <QRCodeSVG value={pixCode} size={180} level="M" />
          </div>
        </div>

        {/* Timer */}
        <div className="text-center">
          <span className="text-gray-500 text-sm">Expira em </span>
          <span className={cn(
            "font-mono font-bold",
            timeLeft < 60 ? "text-red-500" : "text-gray-700"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Separador "ou" */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-400 text-sm">ou</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Campo do código PIX */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-xs mx-auto">
          <p className="text-xs text-gray-400 mb-1">Código Pix</p>
          <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">
            {pixCode.slice(0, 60)}...
          </p>
        </div>

        {/* Botão Copiar */}
        <Button 
          onClick={handleCopyCode}
          className={cn(
            "w-full py-6 text-lg font-bold rounded-lg transition-all",
            copied 
              ? "bg-[#00A651] hover:bg-[#008a44]" 
              : "bg-[#00A651] hover:bg-[#008a44]"
          )}
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

      {/* Seção "Como pagar?" */}
      <div className="bg-[#F5F5F5] rounded-xl p-4 mt-4 space-y-3">
        <h3 className="font-bold text-gray-800 text-center">Como pagar?</h3>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#00A651]/10 rounded-full flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-[#00A651]" />
          </div>
          <p className="text-sm text-gray-600">
            Escaneie o QR Code ou copie e cole o código Pix em seu app bancário ou carteira digital.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#00A651]/10 rounded-full flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[#00A651]" />
          </div>
          <p className="text-sm text-gray-600">
            Seu pagamento será aprovado em alguns instantes.
          </p>
        </div>
      </div>

      {/* Selo de segurança */}
      <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-xs">
        <Lock className="w-4 h-4" />
        <span>Pagamento 100% seguro</span>
      </div>
    </div>
  );
};
