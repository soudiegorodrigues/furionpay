import { memo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/performanceUtils";

export interface OrderBump {
  id: string;
  title: string;
  description: string | null;
  bump_price: number;
  image_url?: string | null;
  bump_product: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

interface OrderBumpCardProps {
  bump: OrderBump;
  isSelected: boolean;
  onToggle: (bumpId: string) => void;
  formatPrice: (price: number) => string;
  primaryColor?: string;
}

export const OrderBumpCard = memo(function OrderBumpCard({
  bump,
  isSelected,
  onToggle,
  formatPrice,
  primaryColor = "#22C55E",
}: OrderBumpCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Get optimized image URL
  const imageUrl = bump.image_url || bump.bump_product?.image_url;
  const optimizedImageUrl = imageUrl 
    ? getOptimizedImageUrl(imageUrl, { width: 128, quality: 80 }) 
    : null;

  return (
    <div
      onClick={() => onToggle(bump.id)}
      className={cn(
        "relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200",
        isSelected
          ? "border-green-500 bg-green-50/50 shadow-md"
          : "border-dashed border-orange-300 bg-orange-50/30 hover:border-orange-400 hover:bg-orange-50/50"
      )}
    >
      {/* Promotional Badge */}
      <div 
        className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
        style={{ backgroundColor: isSelected ? "#22C55E" : "#F97316" }}
      >
        <Zap className="h-3 w-3" />
        {isSelected ? "ADICIONADO!" : "OFERTA ESPECIAL"}
      </div>

      <div className="flex items-start gap-4 mt-2">
      {/* Checkbox */}
        <div 
          className="pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(bump.id)}
            className={cn(
              "h-5 w-5 rounded border-2",
              isSelected ? "border-green-500 bg-green-500" : "border-orange-400"
            )}
          />
        </div>

        {/* Image - optimized with explicit dimensions */}
        {optimizedImageUrl && (
          <div 
            className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0"
            style={{ aspectRatio: '1 / 1' }}
          >
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            )}
            <img
              src={optimizedImageUrl}
              alt={bump.bump_product?.name || "Order Bump"}
              width={64}
              height={64}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm sm:text-base flex items-center gap-2" style={{ color: '#111827' }}>
            <Gift className="h-4 w-4 text-orange-500 shrink-0" />
            {bump.title}
          </h4>
          
          {bump.description && (
            <p className="text-sm mt-1" style={{ color: '#4B5563' }}>
              {bump.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              + {formatPrice(bump.bump_price)}
            </span>
            <span className="text-xs" style={{ color: '#6B7280' }}>
              ao seu pedido
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA text */}
      {!isSelected && (
        <p className="text-center text-xs text-orange-600 font-medium mt-3 animate-pulse">
          👆 Clique para adicionar esta oferta exclusiva!
        </p>
      )}
    </div>
  );
});
