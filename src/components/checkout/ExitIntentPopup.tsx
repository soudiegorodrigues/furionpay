import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ExitIntentPopupProps {
  isEnabled: boolean;
  title?: string;
  message?: string;
  ctaText?: string;
  primaryColor?: string;
  onCtaClick?: () => void;
}

export function ExitIntentPopup({
  isEnabled,
  title = "Que tal um desconto para comprar agora?",
  message = "Você só tem até a meia noite de hoje para aproveitar essa oferta, não perca tempo!",
  ctaText = "Aproveitar oferta",
  primaryColor = "#16A34A",
  onCtaClick,
}: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const showPopup = useCallback(() => {
    if (!isEnabled || hasShown) return;
    setIsOpen(true);
    setHasShown(true);
  }, [isEnabled, hasShown]);

  // Exit intent detection - mouse leaving viewport (desktop)
  useEffect(() => {
    if (!isEnabled) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the viewport
      if (e.clientY <= 0) {
        showPopup();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isEnabled, showPopup]);

  // Back button detection (mobile and desktop)
  useEffect(() => {
    if (!isEnabled) return;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      showPopup();
      // Push state back to prevent actual navigation
      window.history.pushState(null, "", window.location.href);
    };

    // Push an initial state to detect back button
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isEnabled, showPopup]);

  // Visibility change detection (tab switching on mobile)
  useEffect(() => {
    if (!isEnabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User is leaving the tab - we'll show popup when they return
      } else if (document.visibilityState === "visible" && !hasShown) {
        // Optional: could show popup when returning to tab
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isEnabled, hasShown]);

  // Inactivity detection (30 seconds of no interaction)
  useEffect(() => {
    if (!isEnabled || hasShown) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        showPopup();
      }, 30000); // 30 seconds of inactivity
    };

    // Events that indicate user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isEnabled, hasShown, showPopup]);

  const handleCtaClick = () => {
    setIsOpen(false);
    onCtaClick?.();
  };

  if (!isEnabled) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center space-y-4">
          {/* Alert Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-amber-400 flex items-center justify-center mx-auto">
            <span className="text-amber-400 text-3xl font-bold">!</span>
          </div>
          
          <DialogTitle className="text-xl font-bold text-center">
            {title}
          </DialogTitle>
          
          <DialogDescription className="text-center text-muted-foreground">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Button
            className="w-full font-semibold"
            style={{ backgroundColor: primaryColor }}
            onClick={handleCtaClick}
          >
            {ctaText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
