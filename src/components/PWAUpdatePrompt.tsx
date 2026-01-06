import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PWAUpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdatePrompt = ({ onUpdate, onDismiss }: PWAUpdatePromptProps) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">
              Nova versão disponível
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Uma atualização está pronta. Clique para recarregar.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="flex-1"
          >
            Depois
          </Button>
          <Button
            size="sm"
            onClick={onUpdate}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
};
