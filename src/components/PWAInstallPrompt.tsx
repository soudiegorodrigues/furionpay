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
import { supabase } from "@/integrations/supabase/client";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // Don't show if installed, authenticated, or if no way to show prompt
  if (isInstalled || isAuthenticated || (!isIOS && !deferredPrompt && !canShowManualPrompt)) return null;

  const showManualDesktopInstructions = canShowManualPrompt && !deferredPrompt && !isIOS;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-[90vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-gradient-to-b from-zinc-900 to-black">
        {/* Header with gradient */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/20 via-transparent to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                <img 
                  src={pwaLogo} 
                  alt="FurionPay" 
                  className="relative h-16 w-16 rounded-2xl shadow-2xl shadow-primary/20"
                />
              </div>
            </div>
            
            <DialogTitle className="text-center text-xl font-bold text-white">
              Instale o FurionPay
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-400 text-sm">
              Acesso rápido direto da sua tela inicial
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-sm text-zinc-300 mb-3 font-medium">
                  Para instalar no iPhone/iPad:
                </p>
                <ol className="text-sm text-zinc-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    <span>Toque em <Share className="inline h-4 w-4 mx-1 text-primary" /> Compartilhar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    <span>Selecione <strong className="text-zinc-300">"Adicionar à Tela de Início"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">3</span>
                    <span>Toque em <strong className="text-zinc-300">"Adicionar"</strong></span>
                  </li>
                </ol>
              </div>
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Entendi
              </Button>
            </div>
          ) : showManualDesktopInstructions ? (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-sm text-zinc-300 mb-3 font-medium">
                  Para instalar no computador:
                </p>
                <ol className="text-sm text-zinc-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    <span>Clique em <Download className="inline h-4 w-4 mx-1 text-primary" /> na barra de endereço</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    <span>Ou no menu <strong className="text-zinc-300">"Instalar FurionPay"</strong></span>
                  </li>
                </ol>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Agora não
                </Button>
                <Button 
                  onClick={() => {
                    handleDismiss();
                    alert('Clique no ícone de instalação na barra de endereço do navegador');
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Features */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                  <div className="text-lg mb-1">⚡</div>
                  <p className="text-[10px] text-zinc-400">Acesso Rápido</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                  <div className="text-lg mb-1">📱</div>
                  <p className="text-[10px] text-zinc-400">Tela Cheia</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                  <div className="text-lg mb-1">🔔</div>
                  <p className="text-[10px] text-zinc-400">Notificações</p>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0"
                >
                  Agora não
                </Button>
                <Button 
                  onClick={handleInstall}
                  className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
