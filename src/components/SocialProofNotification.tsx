import { useState, useEffect, useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FIRST_NAMES = [
  "Ana", "Beatriz", "Carla", "Daniela", "Eduarda", "Fernanda", "Gabriela",
  "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia",
  "Rafaela", "Sabrina", "Tatiana", "Vanessa", "Amanda", "Bruna", "Camila",
  "Lucas", "Matheus", "Pedro", "João", "Gabriel", "Rafael", "Bruno", "Felipe",
  "Gustavo", "Leonardo", "Rodrigo", "Thiago", "André", "Carlos", "Diego"
];

const TIME_PHRASES = [
  "há 2 minutos",
  "há 5 minutos",
  "há 12 minutos",
  "há 18 minutos",
  "há 25 minutos",
  "há 32 minutos",
  "há 45 minutos",
  "há 1 hora",
  "há 2 horas",
];

interface Notification {
  id: number;
  name: string;
  time: string;
  visible: boolean;
}

interface SocialProofNotificationProps {
  enabled: boolean;
  intervalMs?: number;
}

export const SocialProofNotification = ({ 
  enabled, 
  intervalMs = 15000 
}: SocialProofNotificationProps) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const generateNotification = useCallback(() => {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastInitial = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const time = TIME_PHRASES[Math.floor(Math.random() * TIME_PHRASES.length)];
    
    return {
      id: Date.now(),
      name: `${firstName} ${lastInitial}.`,
      time,
      visible: true,
    };
  }, []);

  const showNotification = useCallback(() => {
    const newNotification = generateNotification();
    setNotification(newNotification);

    // Hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);

    // Remove from DOM after animation
    setTimeout(() => {
      setNotification(null);
    }, 5500);
  }, [generateNotification]);

  useEffect(() => {
    if (!enabled) {
      setNotification(null);
      return;
    }

    // Show first notification after 3 seconds
    const initialTimeout = setTimeout(() => {
      showNotification();
    }, 3000);

    // Then show periodically
    const interval = setInterval(() => {
      showNotification();
    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, intervalMs, showNotification]);

  if (!enabled || !notification) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40 transition-all duration-500 ease-out",
        notification.visible 
          ? "translate-x-0 opacity-100" 
          : "-translate-x-full opacity-0"
      )}
    >
      <div className="flex items-center gap-3 bg-card rounded-xl shadow-lg border border-border px-4 py-3 max-w-xs">
        <div className="flex-shrink-0">
          <CheckCircle className="w-10 h-10 text-primary fill-primary/20" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">
              {notification.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {notification.time}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Doou no pix
          </p>
        </div>
      </div>
    </div>
  );
};
