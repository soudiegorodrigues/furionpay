import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Plus, FolderPlus, Search, CheckCircle, Pencil, Trash2, Image, Construction } from "lucide-react";

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

// Skeleton Card Component
const ProductSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="aspect-[4/3] bg-muted animate-pulse" />
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: ""
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || 
      (activeTab === "active" && product.is_active) || 
      (activeTab === "inactive" && !product.is_active);
    return matchesSearch && matchesTab;
  });

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      description: newProduct.description || null,
      price: newProduct.price,
      image_url: newProduct.image_url || null,
      user_id: user.id
    });
    if (error) {
      toast.error("Erro ao criar produto");
      return;
    }
    toast.success("Produto criado com sucesso");
    setIsCreateDialogOpen(false);
    setNewProduct({ name: "", description: "", price: 0, image_url: "" });
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

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast.error("Erro ao excluir produto");
      return;
    }
    toast.success("Produto excluído com sucesso");
    refetchProducts();
  };

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
              <DialogContent>
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
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input 
                      type="color" 
                      value={newFolder.color} 
                      onChange={e => setNewFolder({ ...newFolder, color: e.target.value })} 
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

        {/* Products Grid with Skeletons */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">Crie seu primeiro produto para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="overflow-hidden group cursor-pointer" 
                onClick={() => navigate(`/admin/products/${product.id}`)}
              >
                <div className="aspect-[4/3] bg-muted relative">
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
                  <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-6 w-6 sm:h-8 sm:w-8" 
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/admin/products/${product.id}`);
                      }}
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="h-6 w-6 sm:h-8 sm:w-8" 
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-start justify-between gap-1 sm:gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold truncate">{product.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {product.description || "Sem descrição"}
                      </p>
                    </div>
                    <Badge variant={product.is_active ? "default" : "secondary"} className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2">
                      {product.is_active ? <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /> : null}
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}