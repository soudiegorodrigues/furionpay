import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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
import { Package, Plus, Pencil, Trash2, Loader2, Save, ImagePlus, X, FolderPlus, Folder, FolderOpen, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  image_url: string | null;
  folder_id: string | null;
  created_at: string;
}

interface ProductFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const FOLDER_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16"
];

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [folders, setFolders] = useState<ProductFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingFolder, setEditingFolder] = useState<ProductFolder | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: "", image_url: "" });
  const [folderFormData, setFolderFormData] = useState({ name: "", color: FOLDER_COLORS[0] });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadData = async () => {
    try {
      const [productsRes, foldersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('product_folders').select('*').order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (foldersRes.error) throw foldersRes.error;

      setProducts(productsRes.data || []);
      setFolders(foldersRes.data || []);
      
      // Expand all folders by default
      setExpandedFolders(new Set((foldersRes.data || []).map((f: ProductFolder) => f.id)));
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({ title: "Erro", description: "Erro ao carregar dados", variant: "destructive" });
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

  const handleOpenFolderDialog = (folder?: ProductFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderFormData({ name: folder.name, color: folder.color });
    } else {
      setEditingFolder(null);
      setFolderFormData({ name: "", color: FOLDER_COLORS[0] });
    }
    setFolderDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "Imagem muito grande. Máximo 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast({ title: "Sucesso", description: "Imagem enviada!" });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({ title: "Erro", description: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "Nome do produto é obrigatório", variant: "destructive" });
      return;
    }

    const price = parseFloat(formData.price) || 0;
    if (price < 0) {
      toast({ title: "Erro", description: "Preço não pode ser negativo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price,
          image_url: formData.image_url || null
        }).eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Produto atualizado!" });
      } else {
        const { error } = await supabase.from('products').insert({
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
      loadData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ title: "Erro", description: "Erro ao salvar produto", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFolder = async () => {
    if (!folderFormData.name.trim()) {
      toast({ title: "Erro", description: "Nome da pasta é obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingFolder) {
        const { error } = await supabase.from('product_folders').update({
          name: folderFormData.name.trim(),
          color: folderFormData.color
        }).eq('id', editingFolder.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Pasta atualizada!" });
      } else {
        const { error } = await supabase.from('product_folders').insert({
          name: folderFormData.name.trim(),
          color: folderFormData.color,
          user_id: user?.id
        });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Pasta criada!" });
      }

      setFolderDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving folder:', error);
      toast({ title: "Erro", description: "Erro ao salvar pasta", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const { error } = await supabase.from('product_folders').delete().eq('id', id);
      if (error) throw error;
      setFolders(folders.filter(f => f.id !== id));
      toast({ title: "Sucesso", description: "Pasta excluída!" });
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      toast({ title: "Erro", description: "Erro ao excluir pasta", variant: "destructive" });
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    } catch (error: any) {
      console.error('Error toggling product:', error);
      toast({ title: "Erro", description: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Sucesso", description: "Produto excluído!" });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({ title: "Erro", description: "Erro ao excluir produto", variant: "destructive" });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const productId = result.draggableId;
    const destinationFolderId = result.destination.droppableId === "no-folder" ? null : result.destination.droppableId;

    try {
      const { error } = await supabase.from('products').update({ folder_id: destinationFolderId }).eq('id', productId);
      if (error) throw error;

      setProducts(products.map(p => 
        p.id === productId ? { ...p, folder_id: destinationFolderId } : p
      ));
    } catch (error: any) {
      console.error('Error moving product:', error);
      toast({ title: "Erro", description: "Erro ao mover produto", variant: "destructive" });
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProductsInFolder = (folderId: string | null) => {
    return products.filter(p => p.folder_id === folderId);
  };

  const renderProductCard = (product: Product, index: number) => (
    <Draggable key={product.id} draggableId={product.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative ${snapshot.isDragging ? 'z-50' : ''}`}
          onMouseEnter={() => setHoveredProduct(product.id)}
          onMouseLeave={() => setHoveredProduct(null)}
        >
          <div className={`
            relative rounded-xl overflow-hidden bg-card border border-border/30
            transition-all duration-300 ease-out cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? 'shadow-2xl shadow-primary/30 rotate-2 scale-105' : 'shadow-lg shadow-black/20'}
            ${hoveredProduct === product.id ? 'border-primary/50' : ''}
          `}>
            <div className="aspect-[2/3] relative overflow-hidden">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className={`
                absolute top-2 right-2 flex gap-1 transition-opacity duration-300
                ${hoveredProduct === product.id ? 'opacity-100' : 'opacity-0'}
              `}>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => handleOpenDialog(product)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O produto "{product.name}" será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(product.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm truncate pr-2">{product.name}</h3>
                <span className="font-bold text-primary text-sm shrink-0">{formatCurrency(product.price)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                  {product.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Switch 
                  checked={product.is_active} 
                  onCheckedChange={() => handleToggleActive(product)}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

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
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Meus Produtos</h1>
                <p className="text-muted-foreground text-sm">Arraste produtos para organizar em pastas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenFolderDialog()} className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Nova Pasta
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Folders */}
                {folders.map(folder => (
                  <div key={folder.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${folder.color}20` }}
                        >
                          {expandedFolders.has(folder.id) ? (
                            <FolderOpen className="w-5 h-5" style={{ color: folder.color }} />
                          ) : (
                            <Folder className="w-5 h-5" style={{ color: folder.color }} />
                          )}
                        </div>
                        <div>
                          <h2 className="font-semibold">{folder.name}</h2>
                          <p className="text-xs text-muted-foreground">
                            {getProductsInFolder(folder.id).length} produto(s)
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenFolderDialog(folder)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => handleDeleteFolder(folder.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {expandedFolders.has(folder.id) && (
                      <Droppable droppableId={folder.id} direction="horizontal">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`
                              p-4 pt-0 min-h-[200px] transition-colors
                              ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}
                            `}
                          >
                            {getProductsInFolder(folder.id).length === 0 ? (
                              <div className="flex items-center justify-center h-[180px] border-2 border-dashed border-border/50 rounded-lg text-muted-foreground text-sm">
                                Arraste produtos para esta pasta
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                {getProductsInFolder(folder.id).map((product, index) => 
                                  renderProductCard(product, index)
                                )}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                ))}

                {/* Products without folder */}
                <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Sem Pasta</h2>
                      <p className="text-xs text-muted-foreground">
                        {getProductsInFolder(null).length} produto(s)
                      </p>
                    </div>
                  </div>
                  
                  <Droppable droppableId="no-folder" direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          p-4 pt-0 min-h-[200px] transition-colors
                          ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}
                        `}
                      >
                        {getProductsInFolder(null).length === 0 && products.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                            <Package className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">Nenhum produto ainda</p>
                            <Button 
                              variant="link" 
                              className="mt-2"
                              onClick={() => handleOpenDialog()}
                            >
                              Criar primeiro produto
                            </Button>
                          </div>
                        ) : getProductsInFolder(null).length === 0 ? (
                          <div className="flex items-center justify-center h-[180px] border-2 border-dashed border-border/50 rounded-lg text-muted-foreground text-sm">
                            Arraste produtos para remover de pastas
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                            {getProductsInFolder(null).map((product, index) => 
                              renderProductCard(product, index)
                            )}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            )}
          </DragDropContext>

          {/* Product Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Atualize as informações do produto" : "Preencha os dados do novo produto"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <ImagePlus className="w-4 h-4 mr-1" /> Trocar
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={handleRemoveImage}>
                          <X className="w-4 h-4 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus className="w-10 h-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Clique para adicionar</p>
                        </>
                      )}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do produto"
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
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isSaving || isUploading}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Folder Dialog */}
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingFolder ? "Editar Pasta" : "Nova Pasta"}</DialogTitle>
                <DialogDescription>
                  {editingFolder ? "Atualize as informações da pasta" : "Crie uma nova pasta para organizar seus produtos"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folderName">Nome da Pasta *</Label>
                  <Input
                    id="folderName"
                    value={folderFormData.name}
                    onChange={(e) => setFolderFormData({ ...folderFormData, name: e.target.value })}
                    placeholder="Ex: E-books, Cursos, etc"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {FOLDER_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full transition-all ${
                          folderFormData.color === color 
                            ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' 
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFolderFormData({ ...folderFormData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveFolder} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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
