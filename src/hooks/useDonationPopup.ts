import { useState, useEffect, useCallback } from "react";

interface UseDonationPopupOptions {
  autoShowDelay?: number; // milliseconds, 0 to disable
  showOncePerSession?: boolean;
}

const SESSION_STORAGE_KEY = "donation_popup_shown";

export const useDonationPopup = (options: UseDonationPopupOptions = {}) => {
  const { autoShowDelay = 0, showOncePerSession = true } = options;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (autoShowDelay <= 0) return;

    const hasShown = showOncePerSession
      ? sessionStorage.getItem(SESSION_STORAGE_KEY)
      : false;

    if (hasShown) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      if (showOncePerSession) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      }
    }, autoShowDelay);

    return () => clearTimeout(timer);
  }, [autoShowDelay, showOncePerSession]);

  const openPopup = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    openPopup,
    closePopup,
  };
};
