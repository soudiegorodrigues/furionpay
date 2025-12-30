import { memo, useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/performanceUtils';

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
 * - Primeiro banner carrega com alta prioridade
 * - Demais banners usam lazy loading nativo
 * - Placeholder blur enquanto carrega
 * - Imagens otimizadas via Supabase Transform (WebP + resize)
 */
export const BannersCarousel = memo(function BannersCarousel({ banners }: BannersCarouselProps) {
  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  if (sortedBanners.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sortedBanners.map((banner, index) => (
        <OptimizedBannerImage
          key={banner.id}
          src={getOptimizedImageUrl(banner.image_url, { width: 800, quality: 80 })}
          alt={`Banner ${index + 1}`}
          priority={index === 0}
        />
      ))}
    </div>
  );
});

/**
 * Imagem de banner otimizada com placeholder e fadeIn
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
    <div className="relative w-full rounded-lg overflow-hidden shadow-sm bg-gray-100">
      {/* Placeholder skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`w-full rounded-lg object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        // Dimensões mínimas para evitar CLS
        style={{ minHeight: '100px' }}
      />
    </div>
  );
});
