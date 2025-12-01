import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  "Conectando ao banco...",
  "Gerando QR Code...",
  "Preparando pagamento...",
  "Quase lá...",
];

export const PixLoadingSkeleton = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 py-1 sm:py-2 animate-fade-in">
      {/* Skeleton Amount */}
      <div className="text-center">
        <div className="h-7 sm:h-8 w-24 bg-muted animate-pulse rounded-lg mx-auto" />
      </div>

      {/* Skeleton Timer */}
      <div className="h-6 sm:h-7 w-20 bg-muted animate-pulse rounded-full" />

      {/* Skeleton QR Code */}
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-100/50 to-amber-200/30 border-2 border-amber-200/50">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg sm:rounded-xl bg-muted animate-pulse flex items-center justify-center">
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 sm:w-3 sm:h-3 bg-muted-foreground/20 rounded-sm animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Skeleton Divider */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <div className="flex-1 h-px bg-border" />
        <div className="h-3 w-28 bg-muted animate-pulse rounded" />
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Skeleton Button */}
      <div className="w-full h-12 sm:h-14 bg-muted animate-pulse rounded-xl" />

      {/* Skeleton Footer */}
      <div className="h-3 w-48 bg-muted animate-pulse rounded mx-auto" />
    </div>
  );
};
