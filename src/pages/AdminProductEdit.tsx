import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckoutBuilderSimple } from "@/components/checkout/CheckoutBuilderSimple";
import { 
  ProductDetailsSection,
  OffersSection,
  DangerZoneSection,
  ComingSoonSection,
  ProductNavigation,
  Section
} from "@/components/product-edit";
import { Package, ArrowLeft, Save, CheckCircle } from "lucide-react";

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

// Skeleton for main content
const ContentSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-48 h-48 bg-muted animate-pulse rounded-lg shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted animate-pulse rounded-lg" />
              <div className="h-20 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  </div>
);

// Header skeleton
const HeaderSkeleton = () => (
  <div className="mb-6">
    <Button variant="ghost" size="sm" className="mb-4 opacity-50" disabled>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Voltar para produtos
    </Button>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="h-10 w-36 bg-muted animate-pulse rounded" />
    </div>
  </div>
);

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
    staleTime: 30000, // Cache for 30 seconds
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
      if ((window as any).__checkoutSaveConfig) {
        await (window as any).__checkoutSaveConfig();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  // Render page immediately - no blocking loading state
  // Navigation is always visible, content shows skeleton if loading

  const renderSectionContent = () => {
    // Show skeleton while loading
    if (isLoading || !product) {
      return <ContentSkeleton />;
    }

    switch (activeSection) {
      case "details":
        return <ProductDetailsSection formData={formData} setFormData={setFormData} product={product} copyToClipboard={copyToClipboard} />;
      case "checkout":
        return <CheckoutBuilderSimple productId={product.id} userId={product.user_id} productName={product.name} productPrice={product.price} />;
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

  // Product not found (after loading completes)
  if (!isLoading && !product) {
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

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title={product?.name || "Carregando..."} icon={Package} />
      
      <main className="flex-1 p-4 md:p-6">
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
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
                  <h1 className="text-2xl font-bold">{product?.name}</h1>
                  <Badge variant={product?.is_active ? "default" : "secondary"} className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {product?.is_active ? "Aprovado" : "Inativo"}
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
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {renderSectionContent()}
          </div>

          <div className="lg:w-80 shrink-0 order-1 lg:order-2">
            <ProductNavigation activeSection={activeSection} setActiveSection={setActiveSection} />
          </div>
        </div>
      </main>
    </div>
  );
}
