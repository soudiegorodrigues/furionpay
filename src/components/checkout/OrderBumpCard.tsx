import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(bump.id)}
            className={cn(
              "h-5 w-5 rounded border-2",
              isSelected ? "border-green-500 bg-green-500" : "border-orange-400"
            )}
          />
        </div>

        {/* Image - prioritize custom image_url over product image */}
        {(bump.image_url || bump.bump_product?.image_url) && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            <img
              src={bump.image_url || bump.bump_product?.image_url || ""}
              alt={bump.bump_product?.name || "Order Bump"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-orange-500 shrink-0" />
            {bump.title}
          </h4>
          
          {bump.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {bump.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              + {formatPrice(bump.bump_price)}
            </span>
            <span className="text-xs text-gray-500">
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
