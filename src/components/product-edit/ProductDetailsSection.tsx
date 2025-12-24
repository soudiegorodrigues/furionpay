import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Globe, Copy, Upload, X } from "lucide-react";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

// Formata número para Real brasileiro (ex: 19.90 → "19,90" ou 1990.00 → "1.990,00")
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Parseia string formatada para número (ex: "19,90" → 19.90 ou "1.990,00" → 1990.00)
const parseCurrency = (value: string): number => {
  // Remove pontos (separador de milhar) e depois substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  website_url: string | null;
  is_active: boolean;
  folder_id: string | null;
  product_code: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image_url: string;
  website_url: string;
}

interface ProductDetailsSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  product: Product;
  copyToClipboard: (text: string) => void;
}

export function ProductDetailsSection({ 
  formData, 
  setFormData, 
  product, 
  copyToClipboard 
}: ProductDetailsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(() => 
    formData.price > 0 ? formatCurrency(formData.price) : ''
  );

  // Sincroniza o display quando o preço do formData muda externamente
  useEffect(() => {
    setPriceDisplay(formData.price > 0 ? formatCurrency(formData.price) : '');
  }, [formData.price]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove pontos (separador de milhar) e outros caracteres inválidos, mantém só números e vírgula
    const cleaned = inputValue.replace(/\./g, '').replace(/[^\d,]/g, '');
    
    // Limita a uma vírgula e máximo 2 decimais
    const parts = cleaned.split(',');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += ',' + parts[1].slice(0, 2);
    }
    
    setPriceDisplay(formatted);
    
    // Atualiza o formData com o valor numérico
    const numericValue = parseCurrency(formatted);
    setFormData({ ...formData, price: numericValue });
  };

  const handlePriceBlur = () => {
    // Formata corretamente ao sair do campo (só se tiver valor)
    if (formData.price > 0) {
      setPriceDisplay(formatCurrency(formData.price));
    } else {
      setPriceDisplay('');
    }
  };

  const handlePriceFocus = () => {
    // Mostra valor limpo sem separador de milhar para facilitar edição
    if (formData.price > 0) {
      setPriceDisplay(formData.price.toFixed(2).replace('.', ','));
    } else {
      setPriceDisplay('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.product);
      const fileName = `${product.id}-${Date.now()}.webp`;
      const filePath = `${product.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: `${publicUrl}?t=${Date.now()}` });
      toast.success("Imagem comprimida e enviada com sucesso");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Product Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product Image with Upload */}
              <div className="shrink-0">
                <div 
                  className="relative w-48 h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group border-2 border-dashed border-transparent hover:border-primary/50 transition-colors"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  {formData.image_url ? (
                    <>
                      <img
                        src={formData.image_url}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      {isUploading ? (
                        <div className="animate-pulse text-muted-foreground text-sm">Enviando...</div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                          <p className="text-xs text-muted-foreground">Clique para enviar</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Product ID and Status */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ID do Produto</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{product.product_code || product.id.substring(0, 8)}</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(product.product_code || product.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {formData.website_url && (
                    <div className="p-4 bg-muted/50 rounded-lg md:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Site do produto</p>
                      <a 
                        href={formData.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        {formData.website_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {formData.description && (
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm whitespace-pre-wrap">{formData.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Information Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Informações Gerais</CardTitle>
          </div>
          <CardDescription>Atualize as informações básicas do seu produto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do produto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Descrição do produto</Label>
              <span className="text-xs text-muted-foreground">
                {formData.description.length}/500
              </span>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 500) })}
              placeholder="Descreva seu produto..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                value={priceDisplay}
                onChange={handlePriceChange}
                onFocus={handlePriceFocus}
                onBlur={handlePriceBlur}
                placeholder="0,00"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Site do produto</Label>
            <Input
              id="website_url"
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://seuproduto.com"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
