import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Heart, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExitIntentPopupProps {
  pixCode: string;
  isActive: boolean;
  amount: number;
}

export const ExitIntentPopup = ({ pixCode, isActive, amount }: ExitIntentPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(amount);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 0 && !hasShown && isActive && pixCode) {
      setIsVisible(true);
      setHasShown(true);
    }
  }, [hasShown, isActive, pixCode]);

  useEffect(() => {
    if (!isActive || hasShown) return;

    document.addEventListener("mouseout", handleMouseLeave);
    return () => document.removeEventListener("mouseout", handleMouseLeave);
  }, [isActive, hasShown, handleMouseLeave]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no app do seu banco para completar a doação."
      });
      setTimeout(() => {
        setCopied(false);
        setIsVisible(false);
      }, 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Por favor, copie o código manualmente.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Emoji heart animation */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
        </div>

        {/* Emotional message */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-foreground mb-2">
            Espere! 💔
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sua doação de <span className="text-primary font-semibold">{formattedAmount}</span> pode
            transformar a vida de alguém hoje.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Não deixe essa oportunidade passar! 🙏
          </p>
        </div>

        {/* Copy button */}
        <Button
          variant="donationCta"
          size="xl"
          onClick={handleCopyCode}
          className="w-full text-base py-4"
        >
          <Copy className="w-5 h-5 mr-2" />
          {copied ? "Código Copiado! ✓" : "Copiar Código PIX"}
        </Button>

        {/* Secondary action */}
        <button
          onClick={handleClose}
          className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Continuar navegando
        </button>
      </div>
    </div>
  );
};
