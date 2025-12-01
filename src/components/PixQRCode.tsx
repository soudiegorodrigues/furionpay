import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PixQRCodeProps {
  amount: number;
  pixCode: string;
  qrCodeUrl?: string;
}

export const PixQRCode = ({ amount, pixCode, qrCodeUrl }: PixQRCodeProps) => {
  const [copied, setCopied] = useState(false);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);

  const handleCopyCode = async () => {
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
    <div className="flex flex-col items-center gap-6 py-4 animate-fade-in">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Valor da doação</p>
        <p className="text-3xl font-bold text-foreground">{formattedAmount}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-lg border-4 border-border shadow-lg"
          />
        ) : (
          <div className="w-48 h-48 rounded-lg border-4 border-border bg-secondary flex items-center justify-center">
            <QrCode className="w-24 h-24 text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center">
          Escaneie o QR Code com o app do seu banco
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
              className="flex-1 h-10 rounded-lg border-2 border-border bg-secondary px-3 text-sm text-foreground font-mono truncate"
            />
            <Button
              variant={copied ? "default" : "outline"}
              size="icon"
              onClick={handleCopyCode}
              className="shrink-0 h-10 w-10"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Após o pagamento, a confirmação será automática em alguns segundos.
      </p>
    </div>
  );
};
