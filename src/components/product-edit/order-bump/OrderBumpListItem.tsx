import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

interface OrderBumpData {
  id: string;
  title: string;
  description: string | null;
  bump_price: number;
  is_active: boolean;
  image_url: string | null;
  bump_product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

interface OrderBumpListItemProps {
  bump: OrderBumpData;
  onEdit: (bump: OrderBumpData) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  formatPrice: (price: number) => string;
  isToggling?: boolean;
  isDeleting?: boolean;
}

export const OrderBumpListItem = memo(function OrderBumpListItem({
  bump,
  onEdit,
  onDelete,
  onToggleActive,
  formatPrice,
  isToggling,
  isDeleting,
}: OrderBumpListItemProps) {
  const handleEdit = useCallback(() => {
    onEdit(bump);
  }, [onEdit, bump]);

  const handleDelete = useCallback(() => {
    onDelete(bump.id);
  }, [onDelete, bump.id]);

  const handleToggle = useCallback((checked: boolean) => {
    onToggleActive(bump.id, checked);
  }, [onToggleActive, bump.id]);

  const imageUrl = bump.image_url || bump.bump_product?.image_url;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card transition-all duration-200 hover:shadow-sm hover:border-border/80">
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
      
      {imageUrl && (
        <img
          src={imageUrl}
          alt={bump.bump_product?.name || "Order Bump"}
          loading="lazy"
          decoding="async"
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{bump.title}</h4>
          <Badge 
            variant={bump.is_active ? "default" : "secondary"}
            className="flex-shrink-0 transition-colors duration-200"
          >
            {bump.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {bump.bump_product?.name} • {formatPrice(bump.bump_price)}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${bump.id}`} className="text-sm sr-only md:not-sr-only">
            Ativo
          </Label>
          <Switch
            id={`active-${bump.id}`}
            checked={bump.is_active}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            className="transition-opacity duration-150"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleEdit}
          className="transition-colors duration-150"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive transition-colors duration-150"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.bump.id === nextProps.bump.id &&
    prevProps.bump.title === nextProps.bump.title &&
    prevProps.bump.is_active === nextProps.bump.is_active &&
    prevProps.bump.bump_price === nextProps.bump.bump_price &&
    prevProps.bump.image_url === nextProps.bump.image_url &&
    prevProps.isToggling === nextProps.isToggling &&
    prevProps.isDeleting === nextProps.isDeleting
  );
});
