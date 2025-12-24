import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  image_url: string;
  display_order: number;
}

interface BannersCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number;
}

export function BannersCarousel({ banners, autoPlayInterval = 4000 }: BannersCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sortedBanners.length);
  }, [sortedBanners.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sortedBanners.length) % sortedBanners.length);
  }, [sortedBanners.length]);

  // Auto-play
  useEffect(() => {
    if (sortedBanners.length <= 1) return;

    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [sortedBanners.length, autoPlayInterval, goToNext]);

  if (sortedBanners.length === 0) return null;

  // Single banner - no carousel
  if (sortedBanners.length === 1) {
    return (
      <img
        src={sortedBanners[0].image_url}
        alt="Banner"
        className="w-full rounded-lg object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    );
  }

  // Multiple banners - carousel
  return (
    <div className="relative group">
      {/* Images container */}
      <div className="relative overflow-hidden rounded-lg">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {sortedBanners.map((banner) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt="Banner"
              className="w-full flex-shrink-0 object-cover"
              loading="eager"
              decoding="async"
            />
          ))}
        </div>
      </div>

      {/* Navigation arrows - always visible */}
      <button
        onClick={goToPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all shadow-lg"
        aria-label="Banner anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all shadow-lg"
        aria-label="Próximo banner"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Counter indicator */}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full shadow-lg">
        {currentIndex + 1} / {sortedBanners.length}
      </div>

      {/* Dots indicator - more visible */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 px-3 py-1.5 rounded-full">
        {sortedBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "rounded-full transition-all",
              index === currentIndex
                ? "bg-white w-6 h-2"
                : "bg-white/60 hover:bg-white/80 w-2 h-2"
            )}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
