import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Clock, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePixel } from "./MetaPixelProvider";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface PixQRCodeProps {
  amount: number;
  pixCode: string;
  qrCodeUrl?: string;
  expirationMinutes?: number;
  transactionId?: string;
  onRegenerate?: () => void;
}
export const PixQRCode = ({
  amount,
  pixCode,
  qrCodeUrl,
  expirationMinutes = 7,
  transactionId,
  onRegenerate
}: PixQRCodeProps) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expirationMinutes * 60);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const { trackEvent, trackEventWithCAPI } = usePixel();

  // Track PixGenerated when component mounts (via CAPI for reliability)
  useEffect(() => {
    trackEventWithCAPI('PixGenerated', {
      value: amount,
      currency: 'BRL',
    }, {
      external_id: transactionId,
      country: 'br',
    });
  }, [amount, transactionId, trackEventWithCAPI]);

  // Poll for payment status
  useEffect(() => {
    if (!transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        // Use the check-pix-status edge function to query acquirer directly
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId }
        });

        console.log('PIX status check response:', data);

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          // Track Purchase via CAPI for reliability
          trackEventWithCAPI('Purchase', {
            value: amount,
            currency: 'BRL',
            content_name: 'Doação PIX',
            content_type: 'donation',
            transaction_id: transactionId,
          }, {
            external_id: transactionId,
            country: 'br',
          });
          toast({
            title: "🎉 Pagamento confirmado!",
            description: "Obrigado pela sua doação! Você transformou uma vida.",
          });
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [transactionId, amount, isPaid, trackEventWithCAPI]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setShowExpiredDialog(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowExpiredDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);
  
  const isExpired = timeLeft <= 0;
  const isLowTime = timeLeft <= 60;
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(amount);
  
  const handleCopyCode = useCallback(async () => {
    if (isExpired) {
      toast({
        title: "PIX expirado",
        description: "Gere um novo código PIX para continuar.",
        variant: "destructive"
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no app do seu banco para completar a doação."
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Por favor, copie o código manualmente.",
        variant: "destructive"
      });
    }
  }, [isExpired, pixCode]);
  return <div className="flex flex-col items-center gap-3 sm:gap-4 py-1 sm:py-2 animate-fade-in">
      {/* Payment Confirmed State */}
      {isPaid ? (
        <div className="flex flex-col items-center gap-4 py-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-center">
            🎉 Pagamento Confirmado!
          </h2>
          <p className="text-muted-foreground text-center max-w-xs">
            Obrigado pela sua doação de {formattedAmount}. Você acabou de transformar uma vida! ❤️
          </p>
          <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-full text-sm font-medium">
            Doação recebida com sucesso
          </div>
        </div>
      ) : (
        <>
          {/* Title */}
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">💚 Doe {formattedAmount} e ajude a transformar vidas</p>
          </div>

          {/* Countdown Timer */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${isExpired ? "bg-destructive/10 text-destructive" : isLowTime ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="font-medium">
              {isExpired ? "Expirado" : <>QR Code expira em: <span className="font-mono">{formatTime(timeLeft)}</span></>}
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border-2 border-border shadow-lg ${isExpired ? "opacity-50 grayscale" : ""}`}>
              <div className="w-36 h-36 sm:w-44 sm:h-44">
                {qrCodeUrl && qrCodeUrl.startsWith('http') ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl" 
                    loading="eager"
                    width={176}
                    height={176}
                  />
                ) : pixCode ? (
                  <QRCodeSVG 
                    value={pixCode} 
                    size={176} 
                    level="M"
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">QR Code</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center flex items-center gap-1 sm:gap-1.5">
              📱 {isExpired ? "Código expirado" : "Escaneie o QR Code no app do seu banco"}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 sm:gap-3 w-full">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">ou copie o código PIX</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* PIX Code Input */}
          <div className="w-full">
            <Input
              value={pixCode}
              readOnly
              className="font-mono text-xs text-center bg-muted/50 border-border"
            />
          </div>

          {/* Copy Button */}
          <Button variant="donationCta" size="xl" onClick={handleCopyCode} disabled={isExpired} className="w-full text-sm sm:text-base py-3 sm:py-4">
            <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {copied ? "Código Copiado!" : "Copiar Código PIX"}
          </Button>

          {/* How to donate instructions */}
          {!isExpired && <>
              <div className="w-full bg-muted/50 rounded-xl p-3 sm:p-4 mt-1">
                <p className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  🎁 Como doar:
                </p>
                <ol className="text-[10px] sm:text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Toque em Copiar Código PIX</li>
                  <li>Abra seu app do banco</li>
                  <li>Vá em PIX → Copia e Cola</li>
                  <li>Cole o código e confirme 💚</li>
                  <li>Você acabou de transformar uma vida! ❤️</li>
                </ol>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                🔒 Pagamento 100% seguro via PIX
              </p>
            </>}
          
          {isExpired && <p className="text-[10px] sm:text-xs text-destructive text-center max-w-xs">
              O tempo expirou. Volte e gere um novo código PIX.
            </p>}
        </>
      )}

      {/* Expired Dialog */}
      <Dialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              ⏰ Tempo Expirado
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              O código PIX expirou. Gere um novo código para continuar sua doação e ajudar a transformar vidas!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              variant="donationCta" 
              size="lg" 
              onClick={() => {
                setShowExpiredDialog(false);
                onRegenerate?.();
              }}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Gerar Novo Código PIX
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};