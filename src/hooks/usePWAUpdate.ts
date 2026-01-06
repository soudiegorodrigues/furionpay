import { useEffect, useState, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const usePWAUpdate = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log("[PWA] Service Worker registered:", swUrl);
      // Check for updates periodically (every 1 hour)
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log("[PWA] New version available");
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = useCallback(() => {
    console.log("[PWA] User requested update");
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return {
    showUpdatePrompt,
    handleUpdate,
    dismissUpdate,
  };
};
