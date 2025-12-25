import { memo, useRef, useCallback, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Eye, Package, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OrderBumpCard } from "@/components/checkout/OrderBumpCard";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface NewBumpData {
  bump_product_id: string;
  title: string;
  description: string;
  bump_price: number;
  image_url: string;
}

interface OrderBumpAddFormProps {
  userId: string;
  availableProducts: Product[] | undefined;
  onSubmit: (data: NewBumpData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export const OrderBumpAddForm = memo(function OrderBumpAddForm({
  userId,
  availableProducts,
  onSubmit,
  onCancel,
  isSubmitting,
}: OrderBumpAddFormProps) {
  const [formData, setFormData] = useState<NewBumpData>({
    bump_product_id: "",
    title: "🔥 Adicione também!",
    description: "",
    bump_price: 0,
    image_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized preview bump
  const previewBump = useMemo(() => {
    if (!formData.bump_product_id || !availableProducts) return null;
    const selectedProduct = availableProducts.find(p => p.id === formData.bump_product_id);
    if (!selectedProduct) return null;
    return {
      id: "preview",
      title: formData.title,
      description: formData.description || null,
      bump_price: formData.bump_price || selectedProduct.price,
      image_url: formData.image_url || null,
      bump_product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        image_url: selectedProduct.image_url,
      },
    };
  }, [formData, availableProducts]);

  const handleProductSelect = useCallback((productId: string) => {
    const product = availableProducts?.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      bump_product_id: productId,
      bump_price: product?.price || 0,
    }));
  }, [availableProducts]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `order-bump-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("order-bumps")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("order-bumps")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  }, [userId]);

  const removeImage = useCallback(() => {
    setFormData(prev => ({ ...prev, image_url: "" }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.bump_product_id) {
      toast.error("Selecione um produto para o Order Bump");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (formData.bump_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    onSubmit(formData);
  }, [formData, onSubmit]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, bump_price: parseFloat(e.target.value) || 0 }));
  }, []);

  return (
    <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Criar novo Order Bump
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto para oferecer *</Label>
              <Select
                value={formData.bump_product_id}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt="" 
                            loading="lazy"
                            className="w-6 h-6 rounded object-cover" 
                          />
                        )}
                        <span>{product.name}</span>
                        <span className="text-muted-foreground">
                          ({formatPrice(product.price)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!availableProducts || availableProducts.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Você precisa ter outros produtos cadastrados para criar um Order Bump
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título chamativo *</Label>
              <Input
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Ex: 🔥 Adicione também!"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="Ex: Complemento perfeito para seu pedido com 30% OFF!"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Preço do Order Bump *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.bump_price}
                onChange={handlePriceChange}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Pode ser diferente do preço original do produto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Imagem do Order Bump (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {formData.image_url ? (
                <div className="relative w-32 h-32">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    loading="lazy"
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full h-24 flex flex-col gap-2 border-dashed transition-colors duration-150"
                >
                  {uploadingImage ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar imagem
                      </span>
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Se não enviar, usará a imagem do produto
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Order Bump"}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Preview no checkout
            </div>
            
            {previewBump ? (
              <OrderBumpCard
                bump={previewBump}
                isSelected={false}
                onToggle={() => {}}
                formatPrice={formatPrice}
              />
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecione um produto para ver o preview</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
