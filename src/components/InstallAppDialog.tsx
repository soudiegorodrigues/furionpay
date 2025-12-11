import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share, Smartphone, Zap, Bell, CheckCircle } from "lucide-react";
import pwaLogo from "/pwa-512x512.png";

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIOS: boolean;
  onInstall?: () => Promise<boolean>;
}

export const InstallAppDialog = ({ open, onOpenChange, isIOS, onInstall }: InstallAppDialogProps) => {
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  
  const handleClose = () => {
    onOpenChange(false);
    setShowManualInstructions(false);
  };

  const handleInstall = async () => {
    if (onInstall) {
      const installed = await onInstall();
      if (installed) {
        handleClose();
      } else {
        // No native prompt available, show manual instructions
        setShowManualInstructions(true);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md p-0 overflow-hidden border-0 bg-gradient-to-b from-zinc-900 to-black">
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
                  className="relative h-20 w-20 rounded-2xl shadow-2xl shadow-primary/20"
                />
              </div>
            </div>
            
            <DialogTitle className="text-center text-2xl font-bold text-white">
              Instale o FurionPay
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-400 text-base">
              Acesso rápido direto da sua tela inicial
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {isIOS ? (
            <div className="space-y-5">
              {/* Features */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Acesso Rápido</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Smartphone className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Tela Cheia</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Bell className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Notificações</p>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-sm text-zinc-300 mb-3 font-medium">
                  Para instalar no iPhone/iPad:
                </p>
                <ol className="text-sm text-zinc-400 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    <span>Toque em <Share className="inline h-4 w-4 mx-1 text-primary" /> <strong className="text-zinc-300">Compartilhar</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    <span>Selecione <strong className="text-zinc-300">"Adicionar à Tela de Início"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">3</span>
                    <span>Toque em <strong className="text-zinc-300">"Adicionar"</strong></span>
                  </li>
                </ol>
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-center text-zinc-500">
                  No iOS, siga os passos acima para instalar
                </p>
                <Button 
                  variant="ghost" 
                  onClick={handleClose}
                  className="w-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0"
                >
                  Entendi
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Features */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Acesso Rápido</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Smartphone className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Tela Cheia</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                  <div className="flex items-center justify-center mb-2">
                    <Bell className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-xs text-zinc-400">Notificações</p>
                </div>
              </div>

              {/* Instructions for desktop */}
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-sm text-zinc-300 mb-3 font-medium">
                  Para instalar no computador:
                </p>
                <ol className="text-sm text-zinc-400 space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    <span>Clique em <Download className="inline h-4 w-4 mx-1 text-primary" /> na barra de endereço</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    <span>Ou no menu do navegador <strong className="text-zinc-300">"Instalar FurionPay"</strong></span>
                  </li>
                </ol>
              </div>
              
              {/* Buttons */}
              {showManualInstructions ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Siga os passos acima para instalar</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={handleClose}
                    className="w-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0"
                  >
                    Entendi
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={handleClose}
                    className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0"
                  >
                    Fechar
                  </Button>
                  <Button 
                    onClick={handleInstall}
                    className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Instalar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
