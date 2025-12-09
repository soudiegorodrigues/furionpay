import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;

export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

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
    if (!deferredPromptGlobal) return false;

    await deferredPromptGlobal.prompt();
    const { outcome } = await deferredPromptGlobal.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    
    deferredPromptGlobal = null;
    return outcome === "accepted";
  }, []);

  return { canInstall, isInstalled, promptInstall };
};
