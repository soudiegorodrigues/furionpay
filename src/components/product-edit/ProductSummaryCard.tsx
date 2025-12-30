import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Package } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  product_code: string | null;
}

interface ProductSummaryCardProps {
  product: Product;
}

export function ProductSummaryCard({ product }: ProductSummaryCardProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Product Image */}
          <div className="shrink-0">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-lg truncate">{product.name}</h2>
              <Badge variant={product.is_active ? "default" : "secondary"} className="shrink-0">
                {product.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{formatPrice(product.price)}</span>
              <div className="flex items-center gap-1">
                <span>ID: {product.product_code || product.id.substring(0, 8)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(product.product_code || product.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
