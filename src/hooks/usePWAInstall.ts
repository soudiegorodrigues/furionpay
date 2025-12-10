import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;

export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if we already have a deferred prompt
    if (deferredPromptGlobal) {
      setCanInstall(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptGlobal = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPromptGlobal) {
      // Show custom dialog for platforms without native prompt
      setShowInstallDialog(true);
      return false;
    }

    await deferredPromptGlobal.prompt();
    const { outcome } = await deferredPromptGlobal.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    
    deferredPromptGlobal = null;
    return outcome === "accepted";
  }, []);

  const openInstallDialog = useCallback(() => {
    setShowInstallDialog(true);
  }, []);

  const closeInstallDialog = useCallback(() => {
    setShowInstallDialog(false);
  }, []);

  return { 
    canInstall, 
    isInstalled, 
    promptInstall, 
    showInstallDialog, 
    openInstallDialog, 
    closeInstallDialog,
    isIOS 
  };
};
