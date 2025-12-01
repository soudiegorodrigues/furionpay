import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, QrCode, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PixQRCodeProps {
  amount: number;
  pixCode: string;
  qrCodeUrl?: string;
  expirationMinutes?: number;
}

export const PixQRCode = ({ amount, pixCode, qrCodeUrl, expirationMinutes = 7 }: PixQRCodeProps) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expirationMinutes * 60); // in seconds

  useEffect(() => {
    if (timeLeft <= 0) return;

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
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = timeLeft <= 0;
  const isLowTime = timeLeft <= 60; // last minute

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);

  const handleCopyCode = async () => {
    if (isExpired) {
      toast({
        title: "PIX expirado",
        description: "Gere um novo código PIX para continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no app do seu banco para completar a doação.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Por favor, copie o código manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 animate-fade-in">
      {/* Countdown Timer */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        isExpired 
          ? "bg-destructive/10 text-destructive" 
          : isLowTime 
            ? "bg-orange-500/10 text-orange-500" 
            : "bg-primary/10 text-primary"
      }`}>
        <Clock className="w-4 h-4" />
        <span className="font-mono font-bold text-lg">
          {isExpired ? "Expirado" : formatTime(timeLeft)}
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Valor da doação</p>
        <p className="text-3xl font-bold text-foreground">{formattedAmount}</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code PIX"
            className={`w-44 h-44 rounded-lg border-4 border-border shadow-lg ${isExpired ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="w-44 h-44 rounded-lg border-4 border-border bg-secondary flex items-center justify-center">
            <QrCode className="w-20 h-20 text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center">
          {isExpired ? "Código expirado - gere um novo" : "Escaneie o QR Code com o app do seu banco"}
        </p>
      </div>

      <div className="w-full space-y-3">
        <div className="relative">
          <p className="text-xs text-muted-foreground mb-1.5">Código PIX Copia e Cola:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pixCode}
              readOnly
              className={`flex-1 h-10 rounded-lg border-2 border-border bg-secondary px-3 text-sm text-foreground font-mono truncate ${isExpired ? "opacity-50" : ""}`}
            />
            <Button
              variant={copied ? "default" : "outline"}
              size="icon"
              onClick={handleCopyCode}
              className="shrink-0 h-10 w-10"
              disabled={isExpired}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        {isExpired 
          ? "O tempo expirou. Volte e gere um novo código PIX." 
          : "Após o pagamento, a confirmação será automática em alguns segundos."}
      </p>
    </div>
  );
};
