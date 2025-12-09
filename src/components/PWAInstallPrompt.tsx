import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import pwaLogo from "/pwa-512x512.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canShowManualPrompt, setCanShowManualPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as standalone on iOS
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show manual install instructions
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 2000);
      return;
    }

    // For Android/Desktop, use beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: if beforeinstallprompt doesn't fire within 3s, show manual prompt for desktop
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt) {
        setCanShowManualPrompt(true);
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallbackTimer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Don't show if installed or if no way to show prompt
  if (isInstalled || (!isIOS && !deferredPrompt && !canShowManualPrompt)) return null;

  const showManualDesktopInstructions = canShowManualPrompt && !deferredPrompt && !isIOS;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isIOS ? <Share className="h-5 w-5 text-primary" /> : <Download className="h-5 w-5 text-primary" />}
            Instale o app
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-4">
            <img 
              src={pwaLogo} 
              alt="FurionPay" 
              className="h-10 w-10 rounded-lg"
            />
            <div className="text-left">
              <p className="text-lg font-semibold text-foreground">FurionPay</p>
              <p className="text-base text-muted-foreground">furionpay.com</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        {isIOS ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Para instalar no iPhone/iPad:
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Toque no botão <Share className="inline h-4 w-4 mx-1" /> Compartilhar</li>
              <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>Toque em <strong>"Adicionar"</strong></li>
            </ol>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          </div>
        ) : showManualDesktopInstructions ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Para instalar no seu computador:
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Clique no ícone <Download className="inline h-4 w-4 mx-1" /> na barra de endereço</li>
              <li>Ou clique nos 3 pontos do menu e selecione <strong>"Instalar FurionPay"</strong></li>
            </ol>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleDismiss}>
              Cancelar
            </Button>
            <Button onClick={handleInstall}>
              Instalar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
