import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Clock, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
interface PixQRCodeProps {
  amount: number;
  pixCode: string;
  qrCodeUrl?: string;
  expirationMinutes?: number;
}
export const PixQRCode = ({
  amount,
  pixCode,
  qrCodeUrl,
  expirationMinutes = 7
}: PixQRCodeProps) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expirationMinutes * 60);
  useEffect(() => {
    if (timeLeft <= 0) return;
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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const isExpired = timeLeft <= 0;
  const isLowTime = timeLeft <= 60;
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(amount);
  const handleCopyCode = async () => {
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
  };
  return <div className="flex flex-col items-center gap-3 sm:gap-4 py-1 sm:py-2 animate-fade-in">
      {/* Title */}
      <div className="text-center">
        <p className="text-xl sm:text-2xl font-bold text-primary mt-1">{formattedAmount}</p>
      </div>

      {/* Countdown Timer */}
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${isExpired ? "bg-destructive/10 text-destructive" : isLowTime ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="font-mono font-medium">
          {isExpired ? "Expirado" : formatTime(timeLeft)}
        </span>
      </div>
      {!isExpired}

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-100/50 to-amber-200/30 border-2 border-amber-200/50 shadow-lg ${isExpired ? "opacity-50 grayscale" : ""}`}>
          {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code PIX" className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl" loading="eager" /> : <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground text-sm">QR Code</span>
            </div>}
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
              <li>Abra o app do seu banco</li>
              <li>Escaneie o QR Code acima</li>
              <li>Doe o valor que seu coração mandar</li>
              <li>Confirme e salve uma vida! ❤️</li>
            </ol>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            🔒 Pagamento 100% seguro via PIX
          </p>
        </>}
      
      {isExpired && <p className="text-[10px] sm:text-xs text-destructive text-center max-w-xs">
          O tempo expirou. Volte e gere um novo código PIX.
        </p>}
    </div>;
};