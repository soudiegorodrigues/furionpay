import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Package, Plus, FolderPlus, Search, Settings, Image, Folder, X, FolderInput, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PerformanceIndicator } from "@/components/product/PerformanceIndicator";

interface ProductStats {
  total_transactions: number;
  paid_transactions: number;
  total_revenue: number;
  conversion_rate: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  folder_id: string | null;
  product_code: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
  stats?: ProductStats;
}

interface ProductFolder {
  id: string;
  name: string;
  color: string | null;
}

interface FolderCount {
  folder_id: string | null;
  count: number;
}

interface PaginatedResponse {
  products: Product[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const ITEMS_PER_PAGE = 15;

// Lista de palavras bloqueadas para nomes de produtos
const BLOCKED_PRODUCT_KEYWORDS = [
  'adult', 'porn', 'xxx', 'sex', 'sexy', 'erotic',
  'arma', 'weapon', 'gun', 'droga', 'drug', 'cocaina', 'maconha', 'cannabis', 
  'weed', 'narcotic', 'trafico', 'traficante', 'fuzil', 'pistola', 'rifle', 
  'munição', 'ammunition',
  'donate', 'donation', 'doação', 'doacao', 'doações', 'doacoes', 'vakinha', 
  'vaquinha', 'crowdfunding', 'arrecadação', 'arrecadacao', 'ajuda financeira', 
  'contribuição', 'contribuicao', 'caridade', 'charity', 'fundraising', 
  'campanha solidária', 'campanha solidaria', 'pix solidário', 'pix solidario', 
  'rifinha', 'rifa', 'sorteio beneficente',
  'cripto', 'crypto', 'bitcoin', 'forex', 'trade', 'trading', 'investimento', 
  'investir', 'renda fixa', 'day trade', 'mmn', 'marketing multinivel', 
  'multinível', 'pirâmide', 'esquema', 'empréstimo', 'financiamento', 'crédito'
];

const normalizeText = (text: string): string => {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const containsBlockedKeyword = (text: string): string | null => {
  const normalizedText = normalizeText(text);
  for (const keyword of BLOCKED_PRODUCT_KEYWORDS) {
    if (normalizedText.includes(normalizeText(keyword))) return keyword;
  }
  return null;
};

// Memoized Skeleton Component
const ProductSkeleton = memo(() => (
  <Card className="overflow-hidden">
    <div className="aspect-square bg-muted animate-pulse" />
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
));
ProductSkeleton.displayName = 'ProductSkeleton';

// Memoized Product Card Component
interface ProductCardProps {
  product: Product;
  folders: ProductFolder[];
  onNavigate: (id: string) => void;
  onMoveToFolder: (productId: string, folderId: string | null) => void;
}

const ProductCard = memo(({ product, folders, onNavigate, onMoveToFolder }: ProductCardProps) => (
  <Card 
    className="overflow-hidden group cursor-pointer rounded-2xl border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" 
    onClick={() => onNavigate(product.id)}
  >
    <div className="aspect-square bg-muted relative">
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.name} 
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
        </div>
      )}
    </div>
    <CardContent className="p-3 sm:p-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold truncate">{product.name}</h3>
      </div>
      <div className="mt-1 sm:mt-2">
        <p className="text-sm sm:text-base font-bold text-primary">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </p>
      </div>
      
      {/* Performance Indicator */}
      <PerformanceIndicator 
        score={product.stats?.conversion_rate || 0} 
        totalPaid={product.stats?.paid_transactions || 0}
      />
      
      <div className="flex flex-wrap gap-2 mt-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-7 text-xs px-2.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
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
                onClick={() => onMoveToFolder(product.id, null)}
              >
                Sem pasta
              </Button>
              {folders.map(folder => (
                <Button
                  key={folder.id}
                  variant={product.folder_id === folder.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() => onMoveToFolder(product.id, folder.id)}
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
          className="flex-1 h-7 text-xs px-2.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          onClick={e => {
            e.stopPropagation();
            onNavigate(product.id);
          }}
        >
          <Settings className="h-3 w-3 mr-1" />
          Configurar
        </Button>
      </div>
    </CardContent>
  </Card>
));
ProductCard.displayName = 'ProductCard';

export default function AdminProducts() {
  const navigate = useNavigate();
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  
  // Search with debounce
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Filters and pagination
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    folder_id: ""
  });
  const [newFolder, setNewFolder] = useState({ name: "", color: "#dc2626" });

  // Debounce search - 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedFolder]);

  // Get user ID once
  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch paginated products with performance using optimized RPC
  const queryClient = useQueryClient();
  
  const fetchProducts = useCallback(async (page: number): Promise<PaginatedResponse> => {
    if (!userId) return { products: [], total_count: 0, page: 1, per_page: ITEMS_PER_PAGE, total_pages: 0 };
    
    const { data, error } = await supabase.rpc('get_products_paginated_with_performance', {
      p_user_id: userId,
      p_page: page,
      p_per_page: ITEMS_PER_PAGE,
      p_search: debouncedSearch || null,
      p_status: activeTab,
      p_folder_id: selectedFolder
    });
    
    if (error) throw error;
    return data as unknown as PaginatedResponse;
  }, [userId, debouncedSearch, activeTab, selectedFolder]);

  const {
    data: paginatedData,
    isLoading: isLoadingProducts,
    isPending: isPendingProducts,
    isFetching: isFetchingProducts,
    isPlaceholderData,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ["products-paginated", userId, currentPage, debouncedSearch, activeTab, selectedFolder],
    queryFn: () => fetchProducts(currentPage),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute cache
    placeholderData: (previousData) => previousData,
  });

  // Prefetch next page for instant navigation
  useEffect(() => {
    if (!userId || !paginatedData) return;
    const totalPages = paginatedData.total_pages || 0;
    
    // Prefetch next page
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ["products-paginated", userId, currentPage + 1, debouncedSearch, activeTab, selectedFolder],
        queryFn: () => fetchProducts(currentPage + 1),
        staleTime: 60 * 1000,
      });
    }
    
    // Prefetch previous page if not cached
    if (currentPage > 1) {
      queryClient.prefetchQuery({
        queryKey: ["products-paginated", userId, currentPage - 1, debouncedSearch, activeTab, selectedFolder],
        queryFn: () => fetchProducts(currentPage - 1),
        staleTime: 60 * 1000,
      });
    }
  }, [userId, currentPage, paginatedData, debouncedSearch, activeTab, selectedFolder, queryClient, fetchProducts]);

  // Fetch folders
  const { data: folders = [], refetch: refetchFolders } = useQuery({
    queryKey: ["product_folders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("product_folders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductFolder[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch folder counts using RPC
  const { data: folderCounts = [] } = useQuery({
    queryKey: ["product_folder_counts", userId],
    queryFn: async (): Promise<FolderCount[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_product_folder_counts', {
        p_user_id: userId
      });
      if (error) throw error;
      return (data as unknown as FolderCount[]) || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Memoized folder count lookup
  const getFolderCount = useCallback((folderId: string) => {
    const found = folderCounts.find(fc => fc.folder_id === folderId);
    return found?.count || 0;
  }, [folderCounts]);

  // Get selected folder info
  const selectedFolderInfo = useMemo(() => {
    return selectedFolder ? folders.find(f => f.id === selectedFolder) : null;
  }, [selectedFolder, folders]);

  // Products already include performance data from optimized RPC
  const products = paginatedData?.products || [];

  const totalCount = paginatedData?.total_count || 0;
  const totalPages = paginatedData?.total_pages || 0;

  // Handlers
  const handleNavigate = useCallback((id: string) => {
    navigate(`/admin/products/${id}`);
  }, [navigate]);

  const handleMoveToFolder = useCallback(async (productId: string, folderId: string | null) => {
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
  }, [refetchProducts]);

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    const blockedWord = containsBlockedKeyword(newProduct.name);
    if (blockedWord) {
      toast.error(`Nome do produto contém termos não permitidos ("${blockedWord}")`);
      return;
    }
    if (!userId) return;
    
    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      description: newProduct.description || null,
      price: newProduct.price,
      image_url: newProduct.image_url || null,
      folder_id: newProduct.folder_id && newProduct.folder_id !== "none" ? newProduct.folder_id : null,
      user_id: userId
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
    if (!userId) return;
    
    const { error } = await supabase.from("product_folders").insert({
      name: newFolder.name,
      color: newFolder.color,
      user_id: userId
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
    await supabase.from("products").update({ folder_id: null }).eq("folder_id", folderId);
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

  // Permission check
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_products')) {
    return <AccessDenied message="Você não tem permissão para gerenciar Produtos." />;
  }


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">
              {totalCount > 0 ? `${totalCount} produto${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}` : 'Visualize e gerencie todos seus produtos.'}
            </p>
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
                    <Label>Preço</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={newProduct.price > 0 ? newProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '');
                        const numericValue = (parseInt(value) || 0) / 100;
                        setNewProduct({ ...newProduct, price: numericValue });
                      }}
                      placeholder="R$ 0,00" 
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
              <Badge variant="secondary">{getFolderCount(selectedFolder)} produtos</Badge>
            </div>
          </div>
        )}

        {/* Loading state - mostra skeleton durante carregamento inicial ou troca de pasta */}
        {(isPendingProducts || isLoadingProducts || !userId || (isFetchingProducts && isPlaceholderData)) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 && (selectedFolder || folders.length === 0) ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {selectedFolder ? "Nenhum produto nesta pasta" : debouncedSearch ? "Nenhum produto encontrado" : "Nenhum produto encontrado"}
              </h3>
              <p className="text-muted-foreground">
                {selectedFolder ? "Adicione produtos a esta pasta para visualizá-los aqui." : debouncedSearch ? "Tente buscar por outro termo." : "Crie seu primeiro produto para começar."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* SEÇÃO DE PASTAS - só mostra no nível raiz */}
            {!selectedFolder && folders.length > 0 && !debouncedSearch && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Pastas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {folders.map(folder => (
                    <div 
                      key={`folder-${folder.id}`}
                      className="aspect-square relative flex flex-col items-center justify-center group cursor-pointer rounded-2xl bg-card hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md border"
                      onClick={() => setSelectedFolder(folder.id)}
                    >
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
                      <Folder 
                        className="h-10 w-10 sm:h-12 sm:w-12" 
                        style={{ color: folder.color || 'hsl(var(--muted-foreground))' }} 
                      />
                      <h3 className="text-xs sm:text-sm font-semibold mt-2 px-2 text-center truncate max-w-full">
                        {folder.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {getFolderCount(folder.id)} {getFolderCount(folder.id) === 1 ? 'produto' : 'produtos'}
                      </p>
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
            <div className={isFetchingProducts && !isLoadingProducts ? "opacity-70 transition-opacity" : ""}>
              {!selectedFolder && !debouncedSearch && (
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    folders={folders}
                    onNavigate={handleNavigate}
                    onMoveToFolder={handleMoveToFolder}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isFetchingProducts}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={isFetchingProducts}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isFetchingProducts}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
