import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CheckoutBuilder } from "@/components/checkout/CheckoutBuilder";
import { 
  Package, 
  ArrowLeft, 
  FileText, 
  CreditCard, 
  Tag, 
  Globe, 
  Users,
  ShoppingCart,
  Zap,
  Target,
  Handshake,
  Store,
  AlertTriangle,
  Save,
  Copy,
  CheckCircle,
  Image,
  Upload,
  X,
  ChevronDown,
  Plus,
  MapPin,
  Phone,
  Calendar,
  CreditCard as CreditCardIcon,
  Star,
  ExternalLink,
  Trash2,
  Edit2,
  Link
} from "lucide-react";
import { cn } from "@/lib/utils";

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

type Section = 
  | "details" 
  | "checkout" 
  | "offers" 
  | "domains" 
  | "order-bump" 
  | "upsell" 
  | "pixels" 
  | "coproduction" 
  | "affiliation" 
  | "danger-zone";

const navigationItems: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: "details", label: "Detalhes do produto", description: "Informações gerais sobre o produto", icon: FileText },
  { id: "checkout", label: "Checkout", description: "Configurações de pagamento e personalização", icon: CreditCard },
  { id: "offers", label: "Ofertas", description: "Gerenciar links e ofertas", icon: Tag },
  { id: "domains", label: "Domínios", description: "Adicione o seu próprio domínio no checkout", icon: Globe },
  { id: "order-bump", label: "Order Bump", description: "Configurar ofertas adicionais", icon: ShoppingCart },
  { id: "upsell", label: "Upsell um clique", description: "Configurar ofertas adicionais", icon: Zap },
  { id: "pixels", label: "Pixels", description: "Configurar pixels de rastreamento", icon: Target },
  { id: "coproduction", label: "Co produção", description: "Adicione coprodutores ao seu produto", icon: Handshake },
  { id: "affiliation", label: "Afiliação e marketplace", description: "Configurações de afiliação e marketplace", icon: Store },
  { id: "danger-zone", label: "Danger Zone", description: "Ações irreversíveis", icon: AlertTriangle },
];

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("details");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    website_url: "",
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        image_url: product.image_url || "",
        website_url: product.website_url || "",
      });
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!id) throw new Error("Product ID is required");
      
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description || null,
          price: data.price,
          image_url: data.image_url || null,
          website_url: data.website_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar produto");
    },
  });

  const handleSave = async () => {
    if (activeSection === "details") {
      if (!formData.name.trim()) {
        toast.error("Nome do produto é obrigatório");
        return;
      }
      updateMutation.mutate(formData);
    } else if (activeSection === "checkout") {
      // Call checkout save function if available
      if ((window as any).__checkoutSaveConfig) {
        await (window as any).__checkoutSaveConfig();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Carregando..." icon={Package} />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando produto...</div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Produto não encontrado" icon={Package} />
        <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">O produto solicitado não foi encontrado.</p>
          <Button onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para produtos
          </Button>
        </main>
      </div>
    );
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case "details":
        return <ProductDetailsSection formData={formData} setFormData={setFormData} product={product} copyToClipboard={copyToClipboard} />;
      case "checkout":
        return <CheckoutBuilder productId={product.id} userId={product.user_id} productName={product.name} productPrice={product.price} />;
      case "offers":
        return <OffersSection productId={product.id} userId={product.user_id} />;
      case "domains":
        return <ComingSoonSection title="Domínios" description="Adicione seu próprio domínio personalizado no checkout." />;
      case "order-bump":
        return <ComingSoonSection title="Order Bump" description="Configure ofertas adicionais que aparecem no checkout." />;
      case "upsell":
        return <ComingSoonSection title="Upsell um clique" description="Configure ofertas de upsell após a compra." />;
      case "pixels":
        return <ComingSoonSection title="Pixels" description="Configure pixels de rastreamento como Meta Pixel, Google Analytics, etc." />;
      case "coproduction":
        return <ComingSoonSection title="Co produção" description="Adicione coprodutores e configure divisão de receita." />;
      case "affiliation":
        return <ComingSoonSection title="Afiliação e marketplace" description="Configure programa de afiliados e listagem no marketplace." />;
      case "danger-zone":
        return <DangerZoneSection productId={product.id} productName={product.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title={product.name} icon={Package} />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Back button and header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/admin/products")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para produtos
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{product.name}</h1>
                <Badge variant={product.is_active ? "default" : "secondary"} className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {product.is_active ? "Aprovado" : "Inativo"}
                </Badge>
              </div>
              <p className="text-muted-foreground">Gerencie os detalhes e configurações do seu produto</p>
            </div>
            
            {(activeSection === "details" || activeSection === "checkout") && (
              <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2 lg:mr-16">
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            )}
          </div>
        </div>

        {/* Main content with sidebar on the right */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Content Area */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {renderSectionContent()}
          </div>

          {/* Sidebar Navigation - Right side */}
          <div className="lg:w-80 shrink-0 order-1 lg:order-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className={cn(
                          "text-xs",
                          activeSection === item.id ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Product Details Section Component
function ProductDetailsSection({ 
  formData, 
  setFormData, 
  product, 
  copyToClipboard 
}: { 
  formData: { name: string; description: string; price: number; image_url: string; website_url: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  product: Product;
  copyToClipboard: (text: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `${product.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Imagem enviada com sucesso");
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
      {/* Hidden file input */}
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
            {/* Top row: Image, ID and Status */}
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
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      {/* Remove button */}
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

            {/* Description below image */}
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
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
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


// Offers Section Component
interface ProductOffer {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  price: number;
  type: string;
  domain: string | null;
  offer_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

function OffersSection({ productId, userId }: { productId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ProductOffer | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    type: "checkout",
  });

  // Fetch offers for this product
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["product-offers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ProductOffer[];
    },
  });

  // Fetch available domains
  const { data: domains = [] } = useQuery({
    queryKey: ["available-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_domains")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data as AvailableDomain[];
    },
  });

  // Set default domain
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain);
    }
  }, [domains, selectedDomain]);

  // Create offer mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("product_offers")
        .insert({
          product_id: productId,
          user_id: userId,
          name: data.name,
          price: data.price,
          type: data.type,
          domain: selectedDomain,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
      setIsCreating(false);
      setFormData({ name: "", price: 0, type: "checkout" });
    },
    onError: () => {
      toast.error("Erro ao criar oferta");
    },
  });

  // Update offer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({
          name: data.name,
          price: data.price,
          type: data.type,
          domain: selectedDomain,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
      setEditingOffer(null);
      setFormData({ name: "", price: 0, type: "checkout" });
    },
    onError: () => {
      toast.error("Erro ao atualizar oferta");
    },
  });

  // Delete offer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
    },
    onError: () => {
      toast.error("Erro ao excluir oferta");
    },
  });

  // Toggle offer status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
    },
  });

  const generateLink = (offer: ProductOffer) => {
    // Use FurionPay checkout route - external domains require DNS configuration
    return `${window.location.origin}/checkout/${offer.offer_code}`;
  };

  const copyLink = (offer: ProductOffer) => {
    navigator.clipboard.writeText(generateLink(offer));
    toast.success("Link copiado!");
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Nome da oferta é obrigatório");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingOffer) return;
    if (!formData.name.trim()) {
      toast.error("Nome da oferta é obrigatório");
      return;
    }
    updateMutation.mutate({ id: editingOffer.id, data: formData });
  };

  const startEditing = (offer: ProductOffer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      price: offer.price,
      type: offer.type,
    });
    setSelectedDomain(offer.domain || domains[0]?.domain || "");
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingOffer(null);
    setIsCreating(false);
    setFormData({ name: "", price: 0, type: "checkout" });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header with domain selector and new offer button */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-primary">Ofertas</CardTitle>
            <CardDescription>Gerencie links e ofertas do seu produto</CardDescription>
          </div>
          <Button 
            onClick={() => { setIsCreating(true); setEditingOffer(null); }}
            className="gap-2"
            disabled={isCreating || !!editingOffer}
          >
            <Plus className="h-4 w-4" />
            Nova Oferta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain selector */}
          <div className="space-y-2">
            <Label>Domínio</Label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full md:w-72 h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.domain}>
                  {domain.domain}
                </option>
              ))}
            </select>
          </div>

          {/* Create/Edit form */}
          {(isCreating || editingOffer) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-medium">
                  {editingOffer ? "Editar Oferta" : "Nova Oferta"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da oferta</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome da oferta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="checkout">Checkout</option>
                      <option value="upsell">Upsell</option>
                      <option value="downsell">Downsell</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editingOffer ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? "Salvando..." 
                      : editingOffer ? "Atualizar" : "Criar Oferta"
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offers table */}
          {offersLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando ofertas...
            </div>
          ) : offers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma oferta cadastrada</p>
              <p className="text-sm">Clique em "Nova Oferta" para criar sua primeira oferta</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Nome</th>
                    <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Link</th>
                    <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium">Preço</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-medium text-sm">{offer.name}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {generateLink(offer)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyLink(offer)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge variant="outline" className="capitalize">
                          {offer.type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{formatPrice(offer.price)}</span>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={offer.is_active ? "default" : "secondary"}
                          className={cn(
                            "cursor-pointer",
                            offer.is_active ? "bg-green-500 hover:bg-green-600" : ""
                          )}
                          onClick={() => toggleStatusMutation.mutate({ 
                            id: offer.id, 
                            is_active: !offer.is_active 
                          })}
                        >
                          {offer.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 md:hidden"
                            onClick={() => copyLink(offer)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => startEditing(offer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(offer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function ComingSoonSection({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Badge variant="secondary">Em breve</Badge>
      </CardContent>
    </Card>
  );
}

// Danger Zone Section Component
function DangerZoneSection({ productId, productName }: { productId: string; productName: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmName, setConfirmName] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/admin/products");
    },
    onError: () => {
      toast.error("Erro ao excluir produto");
    },
  });

  const handleDelete = () => {
    if (confirmName !== productName) {
      toast.error("Nome do produto não corresponde");
      return;
    }
    deleteMutation.mutate();
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </div>
        <CardDescription>
          Ações irreversíveis. Tenha cuidado ao realizar estas ações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <h4 className="font-semibold text-destructive mb-2">Excluir produto</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Uma vez excluído, não será possível recuperar este produto. Todos os dados associados serão perdidos permanentemente.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="confirm-name" className="text-sm">
                Digite <strong>{productName}</strong> para confirmar
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Nome do produto"
              />
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={confirmName !== productName || deleteMutation.isPending}
              className="w-full"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir produto permanentemente"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
