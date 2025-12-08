import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Pencil, Trash2, Loader2, Save, ImagePlus, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: "", image_url: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
    }
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        image_url: product.image_url || ""
      });
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "", image_url: "" });
      setImagePreview(null);
    }
    setDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Imagem muito grande. Máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
      
      toast({ title: "Sucesso", description: "Imagem enviada!" });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price) || 0;
    if (price < 0) {
      toast({
        title: "Erro",
        description: "Preço não pode ser negativo",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            price,
            image_url: formData.image_url || null
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Produto atualizado!" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            price,
            image_url: formData.image_url || null,
            user_id: user?.id
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Produto criado!" });
      }

      setDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar produto",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
    } catch (error: any) {
      console.error('Error toggling product:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Sucesso", description: "Produto excluído!" });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          {/* Netflix-style Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Package className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Meus Produtos
                </h1>
                <p className="text-muted-foreground mt-1">Gerencie seu catálogo de produtos</p>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              size="lg" 
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Novo Produto
            </Button>
          </div>

          {/* Netflix-style Products Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="absolute inset-0 animate-ping">
                  <Loader2 className="w-12 h-12 text-primary/30" />
                </div>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center shadow-2xl">
                <Package className="w-16 h-16 text-muted-foreground/40" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Nenhum produto ainda</h2>
              <p className="text-muted-foreground text-lg mb-8">Comece criando seu primeiro produto</p>
              <Button 
                onClick={() => handleOpenDialog()} 
                size="lg" 
                className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Criar Produto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product, index) => (
                <div 
                  key={product.id}
                  className="group relative"
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animation: 'fade-in 0.5s ease-out forwards'
                  }}
                >
                  <div 
                    className={`
                      relative rounded-lg overflow-hidden bg-card border border-border/30
                      transition-all duration-500 ease-out cursor-pointer
                      ${hoveredProduct === product.id 
                        ? 'scale-105 z-30 shadow-2xl shadow-black/50 border-primary/50' 
                        : 'scale-100 z-10 shadow-lg shadow-black/20'
                      }
                    `}
                  >
                    {/* Product Image - Netflix aspect ratio */}
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className={`
                            w-full h-full object-cover transition-all duration-700
                            ${hoveredProduct === product.id ? 'scale-110 brightness-75' : 'scale-100 brightness-100'}
                          `}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center">
                          <Package className={`
                            transition-all duration-500
                            ${hoveredProduct === product.id ? 'w-20 h-20 text-primary/50' : 'w-16 h-16 text-muted-foreground/30'}
                          `} />
                        </div>
                      )}
                      
                      {/* Gradient overlay */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent
                        transition-opacity duration-500
                        ${hoveredProduct === product.id ? 'opacity-100' : 'opacity-60'}
                      `} />
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <Badge 
                          className={`
                            font-semibold shadow-lg transition-all duration-300
                            ${product.is_active 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                            }
                            ${hoveredProduct === product.id ? 'scale-110' : 'scale-100'}
                          `}
                        >
                          {product.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      {/* Price Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge 
                          className={`
                            bg-background/90 backdrop-blur-md font-bold text-primary border-0 shadow-lg
                            transition-all duration-300
                            ${hoveredProduct === product.id ? 'scale-110' : 'scale-100'}
                          `}
                        >
                          {formatCurrency(product.price)}
                        </Badge>
                      </div>

                      {/* Product Info - Always visible at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                        <h3 className={`
                          font-bold text-white transition-all duration-300 line-clamp-1
                          ${hoveredProduct === product.id ? 'text-xl' : 'text-lg'}
                        `}>
                          {product.name}
                        </h3>
                        
                        {product.description && (
                          <p className={`
                            text-white/70 text-sm line-clamp-2 mt-1 transition-all duration-500
                            ${hoveredProduct === product.id ? 'opacity-100 max-h-12' : 'opacity-0 max-h-0'}
                          `}>
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons - Netflix style */}
                      <div className={`
                        absolute bottom-4 right-4 flex items-center gap-2 z-20
                        transition-all duration-500
                        ${hoveredProduct === product.id 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-4 pointer-events-none'
                        }
                      `}>
                        <Button 
                          size="icon" 
                          className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90 shadow-xl transition-transform duration-200 hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(product);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="destructive"
                              className="h-10 w-10 rounded-full shadow-xl transition-transform duration-200 hover:scale-110"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O produto "{product.name}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Bottom bar with toggle */}
                    <div className={`
                      flex items-center justify-between p-3 bg-card/95 backdrop-blur-sm border-t border-border/30
                      transition-all duration-500
                      ${hoveredProduct === product.id ? 'bg-card' : 'bg-transparent'}
                    `}>
                      <span className="text-sm font-medium text-foreground truncate pr-2">
                        {product.name}
                      </span>
                      <Switch 
                        checked={product.is_active} 
                        onCheckedChange={() => handleToggleActive(product)}
                        className="shrink-0 data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg bg-card border-border/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct 
                    ? "Atualize as informações do produto" 
                    : "Preencha os dados do novo produto"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-4">
                {/* Image Upload */}
                <div className="space-y-3">
                  <Label>Imagem do Produto</Label>
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-muted group">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button 
                          type="button"
                          variant="secondary" 
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Trocar
                        </Button>
                        <Button 
                          type="button"
                          variant="destructive" 
                          size="sm"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-muted/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus className="w-12 h-12 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">Clique para adicionar imagem</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG até 5MB</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do produto"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0,00"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto (opcional)"
                    rows={3}
                    className="bg-background resize-none"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || isUploading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
