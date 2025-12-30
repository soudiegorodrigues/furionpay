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
 * Imagem de banner com loading state
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

  return (
    <div 
      className="relative w-full rounded-lg overflow-hidden shadow-sm bg-gray-100"
      style={{ aspectRatio: '16 / 6' }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`w-full h-full rounded-lg object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
});
