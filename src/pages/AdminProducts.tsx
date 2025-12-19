import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/AdminSidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Plus, FolderPlus, Search, Settings, Image, Construction, Folder, X, FolderInput, ArrowLeft, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  folder_id: string | null;
  created_at: string;
}

interface ProductFolder {
  id: string;
  name: string;
  color: string | null;
}

// Lista de palavras bloqueadas para nomes de produtos
const BLOCKED_PRODUCT_KEYWORDS = [
  // Conteúdo Adulto
  'adult', 'porn', 'xxx', 'sex', 'sexy', 'erotic',
  // Armas/Drogas
  'arma', 'weapon', 'gun', 'droga', 'drug', 'cocaina', 'maconha', 'cannabis', 
  'weed', 'narcotic', 'trafico', 'traficante', 'fuzil', 'pistola', 'rifle', 
  'munição', 'ammunition',
  // Doações
  'donate', 'donation', 'doação', 'doacao', 'doações', 'doacoes', 'vakinha', 
  'vaquinha', 'crowdfunding', 'arrecadação', 'arrecadacao', 'ajuda financeira', 
  'contribuição', 'contribuicao', 'caridade', 'charity', 'fundraising', 
  'campanha solidária', 'campanha solidaria', 'pix solidário', 'pix solidario', 
  'rifinha', 'rifa', 'sorteio beneficente',
  // Financeiro/Cripto
  'cripto', 'crypto', 'bitcoin', 'forex', 'trade', 'trading', 'investimento', 
  'investir', 'renda fixa', 'day trade', 'mmn', 'marketing multinivel', 
  'multinível', 'pirâmide', 'esquema', 'empréstimo', 'financiamento', 'crédito'
];

// Função para normalizar texto (remover acentos e converter para minúsculo)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Verifica se o texto contém alguma palavra bloqueada
const containsBlockedKeyword = (text: string): string | null => {
  const normalizedText = normalizeText(text);
  
  for (const keyword of BLOCKED_PRODUCT_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      return keyword;
    }
  }
  
  return null;
};

// Skeleton Card Component
const ProductSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="aspect-[3/4] bg-muted animate-pulse" />
    <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 sm:h-5 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
        <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-14 sm:w-16" />
      </div>
      <div className="space-y-1 mt-2 sm:mt-3">
        <div className="h-3 bg-muted animate-pulse rounded w-16 sm:w-20" />
        <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-20 sm:w-24" />
        <div className="h-3 bg-muted animate-pulse rounded w-24 sm:w-32" />
      </div>
    </CardContent>
  </Card>
);

export default function AdminProducts() {
  const navigate = useNavigate();
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    folder_id: ""
  });
  const [newFolder, setNewFolder] = useState({
    name: "",
    color: "#dc2626"
  });

  // Combined query: check admin and fetch products together
  const {
    data: productsData,
    refetch: refetchProducts,
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ["products-with-admin-check"],
    queryFn: async () => {
      // Check admin status first
      const { data: isAdmin } = await supabase.rpc('is_admin_authenticated');
      
      if (!isAdmin) {
        return { isAdmin: false, products: [] };
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdmin: true, products: [] };
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return { isAdmin: true, products: data as Product[] };
    },
  });

  const isAdmin = productsData?.isAdmin ?? null;
  const products = productsData?.products ?? [];

  const {
    data: folders = [],
    refetch: refetchFolders
  } = useQuery({
    queryKey: ["product_folders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("product_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductFolder[];
    },
    enabled: isAdmin === true
  });

  const countProductsInFolder = (folderId: string) => {
    return products.filter(p => p.folder_id === folderId).length;
  };

  // When inside a folder, show only products from that folder
  // When at root (selectedFolder === null), show only products without folder
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || 
      (activeTab === "active" && product.is_active) || 
      (activeTab === "inactive" && !product.is_active);
    const matchesFolder = selectedFolder 
      ? product.folder_id === selectedFolder 
      : !product.folder_id;
    return matchesSearch && matchesTab && matchesFolder;
  });

  // Get the selected folder info
  const selectedFolderInfo = selectedFolder ? folders.find(f => f.id === selectedFolder) : null;

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    // Validação de palavras bloqueadas
    const blockedWord = containsBlockedKeyword(newProduct.name);
    if (blockedWord) {
      toast.error(`Nome do produto contém termos não permitidos ("${blockedWord}")`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      description: newProduct.description || null,
      price: newProduct.price,
      image_url: newProduct.image_url || null,
      folder_id: newProduct.folder_id && newProduct.folder_id !== "none" ? newProduct.folder_id : null,
      user_id: user.id
    });
    if (error) {
      toast.error("Erro ao criar produto");
      return;
    }
    toast.success("Produto criado com sucesso");
    setIsCreateDialogOpen(false);
    setNewProduct({ name: "", description: "", price: 0, image_url: "", folder_id: "" });
    refetchProducts();
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name.trim()) {
      toast.error("Nome da pasta é obrigatório");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("product_folders").insert({
      name: newFolder.name,
      color: newFolder.color,
      user_id: user.id
    });
    if (error) {
      toast.error("Erro ao criar pasta");
      return;
    }
    toast.success("Pasta criada com sucesso");
    setIsFolderDialogOpen(false);
    setNewFolder({ name: "", color: "#dc2626" });
    refetchFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    // Remove folder association from products first
    await supabase.from("products").update({ folder_id: null }).eq("folder_id", folderId);
    // Then delete the folder
    const { error } = await supabase.from("product_folders").delete().eq("id", folderId);
    if (error) {
      toast.error("Erro ao excluir pasta");
      return;
    }
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
    toast.success("Pasta excluída com sucesso");
    refetchFolders();
    refetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast.error("Erro ao excluir produto");
      return;
    }
    toast.success("Produto excluído com sucesso");
    refetchProducts();
  };

  const handleMoveToFolder = async (productId: string, folderId: string | null) => {
    const { error } = await supabase
      .from("products")
      .update({ folder_id: folderId })
      .eq("id", productId);
    if (error) {
      toast.error("Erro ao mover produto");
      return;
    }
    toast.success(folderId ? "Produto movido para pasta" : "Produto removido da pasta");
    refetchProducts();
  };

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_products')) {
    return <AccessDenied message="Você não tem permissão para gerenciar Produtos." />;
  }

  // Non-admin users see the "Página em Produção" notice (after loading completes)
  if (isAdmin === false) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Produtos" icon={Package} />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
                <Construction className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Página em Produção</h2>
              <p className="text-muted-foreground mb-4">
                Estamos trabalhando para trazer a melhor experiência de gerenciamento de produtos para você.
              </p>
              <Badge variant="secondary" className="text-sm">Em breve</Badge>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Admin users see the full products page (renders immediately with skeletons)
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">Visualize e gerencie todos seus produtos.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar novo produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar novo produto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nome do produto</Label>
                    <Input 
                      value={newProduct.name} 
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} 
                      placeholder="Ex: Ebook de Marketing" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea 
                      value={newProduct.description} 
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} 
                      placeholder="Descreva seu produto..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input 
                      type="number" 
                      value={newProduct.price} 
                      onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} 
                      placeholder="0.00" 
                    />
                  </div>
                  {folders.length > 0 && (
                    <div className="space-y-2">
                      <Label>Pasta (opcional)</Label>
                      <Select 
                        value={newProduct.folder_id} 
                        onValueChange={v => setNewProduct({ ...newProduct, folder_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pasta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem pasta</SelectItem>
                          {folders.map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4" style={{ color: folder.color || undefined }} />
                                {folder.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleCreateProduct} className="w-full">
                    Criar produto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Criar nova pasta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Criar nova pasta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nome da pasta</Label>
                    <Input 
                      value={newFolder.name} 
                      onChange={e => setNewFolder({ ...newFolder, name: e.target.value })} 
                      placeholder="Ex: Cursos" 
                    />
                  </div>
                  <Button onClick={handleCreateFolder} className="w-full">
                    Criar pasta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Buscar produtos..." 
              className="pl-9" 
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="inactive">Inativos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Back button when inside a folder */}
        {selectedFolder && selectedFolderInfo && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolder(null)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para todas as pastas
            </Button>
            <div className="flex items-center gap-2 mt-2">
              <Folder className="h-5 w-5" style={{ color: selectedFolderInfo.color || undefined }} />
              <h3 className="text-lg font-semibold">{selectedFolderInfo.name}</h3>
              <Badge variant="secondary">{countProductsInFolder(selectedFolder)} produtos</Badge>
            </div>
          </div>
        )}

        {/* Products Grid with Skeletons */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : (filteredProducts.length === 0 && (selectedFolder || folders.length === 0)) ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {selectedFolder ? "Nenhum produto nesta pasta" : "Nenhum produto encontrado"}
              </h3>
              <p className="text-muted-foreground">
                {selectedFolder ? "Adicione produtos a esta pasta para visualizá-los aqui." : "Crie seu primeiro produto para começar."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* SEÇÃO DE PASTAS - só mostra no nível raiz */}
            {!selectedFolder && folders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Pastas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {folders.map(folder => (
                    <div 
                      key={`folder-${folder.id}`}
                      className="aspect-square relative flex flex-col items-center justify-center group cursor-pointer rounded-2xl hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: `${folder.color}10` }}
                      onClick={() => setSelectedFolder(folder.id)}
                    >
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-background/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      
                      {/* Folder icon */}
                      <Folder 
                        className="h-10 w-10 sm:h-12 sm:w-12" 
                        style={{ color: folder.color || 'hsl(var(--muted-foreground))' }} 
                      />
                      
                      {/* Folder name */}
                      <h3 className="text-xs sm:text-sm font-semibold mt-2 px-2 text-center truncate max-w-full">
                        {folder.name}
                      </h3>
                      
                      {/* Product count */}
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {countProductsInFolder(folder.id)} {countProductsInFolder(folder.id) === 1 ? 'produto' : 'produtos'}
                      </p>
                      
                      {/* Acessar button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFolder(folder.id);
                        }}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Acessar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO DE PRODUTOS */}
            <div>
              {!selectedFolder && (
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="overflow-hidden group cursor-pointer rounded-2xl border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" 
                onClick={() => navigate(`/admin/products/${product.id}`)}
              >
                <div className="aspect-[3/4] bg-muted relative">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      loading="lazy"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2 sm:p-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold truncate">{product.name}</h3>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">Receba até</p>
                    <p className="text-base sm:text-lg font-bold text-primary">
                      R$ {(product.price * 0.55).toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Preço máximo: R$ {product.price.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-8 text-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          <FolderInput className="h-3 w-3 mr-1" />
                          Pasta
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                          <Button
                            variant={!product.folder_id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => handleMoveToFolder(product.id, null)}
                          >
                            Sem pasta
                          </Button>
                          {folders.map(folder => (
                            <Button
                              key={folder.id}
                              variant={product.folder_id === folder.id ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-xs gap-2"
                              onClick={() => handleMoveToFolder(product.id, folder.id)}
                            >
                              <Folder className="h-3 w-3" style={{ color: folder.color || undefined }} />
                              {folder.name}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-8 text-xs"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/admin/products/${product.id}`);
                      }}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}