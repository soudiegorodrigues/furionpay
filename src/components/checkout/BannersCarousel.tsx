import { memo, useState } from 'react';

interface Banner {
  id: string;
  image_url: string;
  display_order: number;
}

interface BannersCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number;
}

/**
 * Galeria vertical de banners
 * - Primeiro banner carrega com alta prioridade
 * - Demais banners usam lazy loading nativo
 * - Aspect ratio fixo para evitar CLS
 */
export const BannersCarousel = memo(function BannersCarousel({ banners }: BannersCarouselProps) {
  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  if (sortedBanners.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sortedBanners.map((banner, index) => (
        <BannerImage
          key={banner.id}
          src={banner.image_url}
          alt={`Banner ${index + 1}`}
          priority={index === 0}
        />
      ))}
    </div>
  );
});

/**
 * Imagem de banner sem flash/piscar
 * - Usa opacity 0 no placeholder para transição suave
 * - Mantém aspect ratio aproximado para evitar layout shift
 */
const BannerImage = memo(function BannerImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pré-carregar imagem para evitar flash
  useState(() => {
    if (priority && src) {
      const img = new Image();
      img.src = src;
    }
  });

  if (hasError) return null;

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-sm bg-muted/30">
      {/* Placeholder com fade out suave */}
      <div 
        className={`absolute inset-0 bg-muted/50 transition-opacity duration-500 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ minHeight: '100px' }}
      />
      <img
        src={src}
        alt={alt}
        className={`w-full rounded-lg transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
});
