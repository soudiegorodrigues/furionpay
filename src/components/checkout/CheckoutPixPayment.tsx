import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { usePixel } from "@/components/MetaPixelProvider";

interface CheckoutPixPaymentProps {
  amount: number;
  pixCode: string;
  qrCodeUrl?: string;
  transactionId?: string;
  primaryColor?: string;
  onPaymentConfirmed?: () => void;
  customerEmail?: string;
  customerName?: string;
  productName?: string;
  pixelId?: string;
  accessToken?: string;
  upsellUrl?: string;
  downsellUrl?: string;
  crosssellUrl?: string;
  thankYouUrl?: string;
}

export const CheckoutPixPayment = ({
  amount,
  pixCode,
  qrCodeUrl,
  transactionId,
  primaryColor = "#16A34A",
  onPaymentConfirmed,
  customerEmail,
  customerName,
  productName,
  pixelId,
  accessToken,
  upsellUrl,
  downsellUrl,
  crosssellUrl,
  thankYouUrl,
}: CheckoutPixPaymentProps) => {
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { trackEvent, setAdvancedMatching, isLoaded } = usePixel();

  // Generate unique event_id for deduplication
  const generateEventId = () => `${transactionId}_${Date.now()}`;

  // Send event via Conversions API (server-side backup)
  const sendCAPIEvent = async (eventId: string) => {
    if (!pixelId || !accessToken) {
      console.log('[CAPI] ⚠️ Pixel ID ou Access Token não disponível, pulando CAPI');
      return;
    }

    try {
      console.log('[CAPI] 📤 Enviando evento Purchase via servidor...');
      
      // Get Meta cookies for better attribution
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
      };

      const response = await supabase.functions.invoke('track-conversion', {
        body: {
          pixelId,
          accessToken,
          eventName: 'Purchase',
          eventId, // Same ID for deduplication
          value: amount,
          currency: 'BRL',
          transactionId,
          customerEmail,
          customerName,
          productName: productName || 'Produto',
          // userAgent removed - blocked by Meta 2026 policies
          sourceUrl: window.location.href,
          fbc: getCookie('_fbc'),
          fbp: getCookie('_fbp'),
        },
      });

      if (response.error) {
        console.error('[CAPI] ❌ Erro ao enviar evento:', response.error);
      } else {
        console.log('[CAPI] ✅ Evento enviado com sucesso:', response.data);
      }
    } catch (error) {
      console.error('[CAPI] ❌ Erro inesperado:', error);
    }
  };

  // Track Purchase event when payment is confirmed (browser + server)
  const trackPurchaseEvent = async () => {
    const eventId = generateEventId();
    console.log('[PIXEL DEBUG] 🎯 Disparando evento Purchase (event_id:', eventId, ')');
    
    // 1. Send via Conversions API (server-side) - GARANTIDO
    sendCAPIEvent(eventId);
    
    // 2. Send via browser pixel (if loaded)
    if (isLoaded) {
      // Set advanced matching data for better attribution
      if (customerEmail || customerName) {
        const [firstName, ...lastNameParts] = (customerName || '').split(' ');
        setAdvancedMatching({
          em: customerEmail,
          fn: firstName || undefined,
          ln: lastNameParts.join(' ') || undefined,
          external_id: transactionId,
        });
      }

      // Fire Purchase event with same event_id for deduplication
      trackEvent('Purchase', {
        value: amount,
        currency: 'BRL',
        content_name: productName || 'Produto',
        content_type: 'product',
        transaction_id: transactionId,
        event_id: eventId, // Corrected: Meta uses event_id (not eventID) for deduplication
      }, {
        external_id: transactionId,
        em: customerEmail,
      });

      console.log('[PIXEL DEBUG] ✅ Evento Purchase disparado via browser');
    } else {
      console.log('[PIXEL DEBUG] ⚠️ Pixel não carregado, evento enviado apenas via CAPI');
    }
  };

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);

  // Handle redirect after payment confirmed
  // Priority: upsell_url → downsell_url → crosssell_url → thank_you_url → success screen
  const handlePaymentSuccess = () => {
    trackPurchaseEvent(); // Fire Meta Pixel Purchase event
    toast.success("Pagamento confirmado!");
    onPaymentConfirmed?.();
    
    // Redirect to configured URL after a short delay
    // The funnel works: main offer → upsell → downsell → crosssell
    setTimeout(() => {
      if (upsellUrl) {
        // Redirect to upsell page (after main offer purchase)
        window.location.href = upsellUrl;
      } else if (downsellUrl) {
        // Redirect to downsell page (if no upsell configured)
        window.location.href = downsellUrl;
      } else if (crosssellUrl) {
        // Redirect to cross-sell page (if no downsell configured)
        window.location.href = crosssellUrl;
      } else if (thankYouUrl) {
        // Redirect to thank you page
        window.location.href = thankYouUrl;
      }
      // If no URL configured, stay on success screen (isPaid = true)
    }, 1500);
  };

  // Poll for payment status
  useEffect(() => {
    if (!transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-pix-status", {
          body: { transactionId },
        });

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          handlePaymentSuccess();
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [transactionId, isPaid, onPaymentConfirmed, upsellUrl, downsellUrl, crosssellUrl, thankYouUrl]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Erro ao copiar. Copie manualmente.");
    }
  };

  const handleCheckPayment = async () => {
    if (!transactionId) return;
    
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-pix-status", {
        body: { transactionId },
      });

      if (!error && data && data.status === "paid") {
        setIsPaid(true);
        handlePaymentSuccess();
      } else {
        toast.info("Pagamento ainda não identificado. Aguarde alguns segundos.");
      }
    } catch (err) {
      toast.error("Erro ao verificar pagamento.");
    } finally {
      setIsChecking(false);
    }
  };

  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600 mb-4">
            Obrigado pela sua compra de {formattedAmount}.
          </p>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
            Compra realizada com sucesso
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-3xl w-full">
        {/* Title */}
        <h1 
          className="text-xl md:text-2xl font-bold text-center mb-6"
          style={{ color: primaryColor }}
        >
          Finalize seu pagamento
        </h1>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left Column - PIX Code and Instructions */}
          <div className="flex-1 space-y-4">
            {/* PIX Code Section */}
            <div>
              <h2 
                className="text-base font-semibold mb-2"
                style={{ color: primaryColor }}
              >
                Código PIX
              </h2>
              <Input
                value={pixCode}
                readOnly
                className="font-mono text-xs bg-white border-gray-300 mb-3"
              />
              <Button
                onClick={handleCopyCode}
                className="w-full text-white font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Código Copiado!" : "Copiar código PIX"}
              </Button>
            </div>

            {/* Instructions */}
            <div>
              <h2 
                className="text-base font-semibold mb-3"
                style={{ color: primaryColor }}
              >
                Instruções
              </h2>
              <ol className="space-y-2">
                {[
                  "Abra o app do seu banco",
                  'Na seção PIX, selecione "Pix Copia e Cola"',
                  "Cole o código copiado",
                  "Confirme o pagamento",
                ].map((instruction, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-gray-700 text-sm">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right Column - QR Code */}
          <div className="flex flex-col items-center justify-start">
            <div className="bg-white p-3 border border-gray-200 rounded-lg">
              {qrCodeUrl && qrCodeUrl.startsWith('http') ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-40 h-40 md:w-48 md:h-48"
                />
              ) : pixCode ? (
                <QRCodeSVG
                  value={pixCode}
                  size={192}
                  level="M"
                  className="w-40 h-40 md:w-48 md:h-48"
                />
              ) : (
                <div className="w-40 h-40 md:w-48 md:h-48 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">QR Code</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2 max-w-[200px]">
              Escaneie o código QR com a câmera do seu celular
            </p>
            <p 
              className="text-sm font-medium mt-2"
              style={{ color: primaryColor }}
            >
              Ou
            </p>
          </div>
        </div>

        {/* Waiting for Payment Box */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-700 font-semibold text-sm">
            Aguardando pagamento
          </p>
          <p className="text-amber-600 text-sm">
            Após o pagamento, aguarde alguns segundos para a confirmação.
          </p>
        </div>

        {/* Check Payment Button */}
        <Button
          onClick={handleCheckPayment}
          disabled={isChecking}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
        >
          {isChecking ? "Verificando..." : "Já fiz o pagamento"}
        </Button>
      </div>
    </div>
  );
};
