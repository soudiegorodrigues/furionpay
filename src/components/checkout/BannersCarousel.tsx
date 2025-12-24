interface Banner {
  id: string;
  image_url: string;
  display_order: number;
}

interface BannersCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number; // kept for backward compatibility, but unused
}

export function BannersCarousel({ banners }: BannersCarouselProps) {
  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  if (sortedBanners.length === 0) return null;

  // Vertical gallery - all banners stacked
  return (
    <div className="flex flex-col gap-4">
      {sortedBanners.map((banner, index) => (
        <img
          key={banner.id}
          src={banner.image_url}
          alt={`Banner ${index + 1}`}
          className="w-full rounded-lg object-cover shadow-sm"
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
        />
      ))}
    </div>
  );
}
