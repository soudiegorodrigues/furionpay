import { memo, useState, useEffect } from 'react';

interface Banner {
  id: string;
  image_url: string;
  display_order: number;
}

interface BannersCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number; // kept for backward compatibility, but unused
}

/**
 * Galeria vertical de banners otimizada para performance
 * - FadeIn suave ao montar para evitar flickering
 * - Primeiro banner carrega com alta prioridade
 * - Demais banners usam lazy loading nativo
 * - Placeholder com aspect-ratio fixo para evitar CLS
 */
export const BannersCarousel = memo(function BannersCarousel({ banners }: BannersCarouselProps) {
  const [isMounted, setIsMounted] = useState(false);
  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  useEffect(() => {
    // Pequeno delay para garantir transição suave após render
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (sortedBanners.length === 0) return null;

  return (
    <div className={`flex flex-col gap-4 transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      {sortedBanners.map((banner, index) => (
        <OptimizedBannerImage
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
 * Imagem de banner otimizada com aspect-ratio fixo e fadeIn suave
 */
const OptimizedBannerImage = memo(function OptimizedBannerImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className="relative w-full rounded-lg overflow-hidden shadow-sm bg-gray-100"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Placeholder skeleton com tamanho reservado */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full rounded-lg object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
});
