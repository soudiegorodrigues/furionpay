import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { FileText, Globe, Copy, Upload, X, Package, Link, FileArchive, Loader2, ChevronDown } from "lucide-react";
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
  delivery_link: string | null;
  delivery_file_url: string | null;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image_url: string;
  website_url: string;
  delivery_link: string;
  delivery_file_url: string;
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
  const deliveryFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDelivery, setIsUploadingDelivery] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isGeneralInfoOpen, setIsGeneralInfoOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(() => 
    formData.price > 0 ? formatCurrency(formData.price) : ''
  );

  // Sincroniza o display quando o preço do formData muda externamente (só quando NÃO está focado)
  useEffect(() => {
    if (!isPriceFocused) {
      setPriceDisplay(formData.price > 0 ? formatCurrency(formData.price) : '');
    }
  }, [formData.price, isPriceFocused]);

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
    setIsPriceFocused(false);
    // Formata corretamente ao sair do campo
    if (formData.price > 0) {
      setPriceDisplay(formatCurrency(formData.price));
    } else {
      setPriceDisplay('');
    }
  };

  const handlePriceFocus = () => {
    setIsPriceFocused(true);
    // Mostra valor limpo para edição (ex: "2,99" em vez de "2,99")
    if (formData.price > 0) {
      // Remove zeros desnecessários (2.00 → "2", 2.50 → "2,5", 2.99 → "2,99")
      const formatted = formData.price.toString().replace('.', ',');
      setPriceDisplay(formatted);
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

  const handleDeliveryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 50MB");
      return;
    }

    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/mp3',
      'application/epub+zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    // Also check by extension for edge cases
    const allowedExtensions = ['.pdf', '.zip', '.rar', '.mp4', '.webm', '.mp3', '.epub', '.docx', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Tipo de arquivo não suportado. Use: PDF, ZIP, RAR, MP4, MP3, EPUB");
      return;
    }

    setIsUploadingDelivery(true);
    try {
      const fileName = `${product.id}-${Date.now()}-${file.name}`;
      const filePath = `${product.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-deliverables")
        .upload(filePath, file, { 
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-deliverables")
        .getPublicUrl(filePath);

      setFormData({ ...formData, delivery_file_url: publicUrl });
      toast.success("Arquivo enviado com sucesso");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploadingDelivery(false);
      if (deliveryFileInputRef.current) {
        deliveryFileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveDeliveryFile = () => {
    setFormData({ ...formData, delivery_file_url: "" });
  };

  // Get file name from URL
  const getFileName = (url: string) => {
    if (!url) return "";
    const parts = url.split('/');
    const fileName = parts[parts.length - 1].split('?')[0];
    // Remove the prefix (product-id-timestamp-)
    const cleanName = fileName.replace(/^[a-f0-9-]+-\d+-/, '');
    return cleanName || fileName;
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
      <Collapsible open={isGeneralInfoOpen} onOpenChange={setIsGeneralInfoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Informações Gerais</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isGeneralInfoOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>Atualize as informações básicas do seu produto</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Digital Delivery Section */}
      <Collapsible open={isDeliveryOpen} onOpenChange={setIsDeliveryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>Entrega Digital</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isDeliveryOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>
                Configure o conteúdo que será enviado automaticamente por email após a compra ser aprovada
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* External Link (Drive, Dropbox, etc.) */}
              <div className="space-y-2">
                <Label htmlFor="delivery_link" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Link do Drive / URL Externa
                </Label>
                <Input
                  id="delivery_link"
                  type="url"
                  value={formData.delivery_link}
                  onChange={(e) => setFormData({ ...formData, delivery_link: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                />
                <p className="text-xs text-muted-foreground">
                  Link do Google Drive, Dropbox, OneDrive ou qualquer URL de download
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  Arquivo para Download
                </Label>
                
                <input
                  ref={deliveryFileInputRef}
                  type="file"
                  accept=".pdf,.zip,.rar,.mp4,.webm,.mp3,.epub,.docx,.xlsx"
                  onChange={handleDeliveryFileUpload}
                  className="hidden"
                />
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    formData.delivery_file_url 
                      ? "border-primary/30 bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
                  }`}
                  onClick={() => !formData.delivery_file_url && !isUploadingDelivery && deliveryFileInputRef.current?.click()}
                >
                  {isUploadingDelivery ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                    </div>
                  ) : formData.delivery_file_url ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileArchive className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {getFileName(formData.delivery_file_url)}
                          </p>
                          <p className="text-xs text-muted-foreground">Arquivo anexado</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deliveryFileInputRef.current?.click();
                          }}
                        >
                          Trocar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDeliveryFile();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Clique para enviar</p>
                        <p className="text-xs text-muted-foreground">PDF, ZIP, RAR, MP4, MP3 até 50MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info box */}
              {(formData.delivery_link || formData.delivery_file_url) && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Entrega automática configurada
                      </p>
                      <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
                        Quando uma venda for aprovada, o cliente receberá automaticamente um email com o link de acesso ao produto.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
