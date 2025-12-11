import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Lock, 
  CreditCard,
  CheckCircle,
  Shield,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PixQRCode } from "@/components/PixQRCode";

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
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export default function PublicCheckout() {
  const { offerCode } = useParams<{ offerCode: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "payment">("form");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const [pixData, setPixData] = useState<{
    qrCode: string;
    pixCode: string;
    txid: string;
    transactionId: string;
  } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  // Fetch offer by code
  const { data: offer, isLoading: offerLoading, error: offerError } = useQuery({
    queryKey: ["public-offer", offerCode],
    queryFn: async () => {
      if (!offerCode) return null;
      
      const { data, error } = await supabase
        .from("product_offers")
        .select("*")
        .eq("offer_code", offerCode)
        .eq("is_active", true)
        .single();
      
      if (error) throw error;
      return data as ProductOffer;
    },
    enabled: !!offerCode,
  });

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["public-product", offer?.product_id],
    queryFn: async () => {
      if (!offer?.product_id) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", offer.product_id)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    enabled: !!offer?.product_id,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Email válido é obrigatório");
      return false;
    }
    return true;
  };

  const handleGeneratePix = async () => {
    if (!validateForm() || !offer) return;

    setIsGeneratingPix(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pix", {
        body: {
          amount: offer.price,
          donorName: formData.name,
          userId: offer.user_id,
          productName: offer.name,
          popupModel: "checkout",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar PIX");

      setPixData({
        qrCode: data.qrCode,
        pixCode: data.pixCode,
        txid: data.txid,
        transactionId: data.transactionId,
      });
      setStep("payment");
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast.error("Erro ao gerar PIX. Tente novamente.");
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const isLoading = offerLoading || productLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando checkout...</div>
      </div>
    );
  }

  if (offerError || !offer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Oferta não encontrada</h2>
            <p className="text-muted-foreground mb-4">
              Esta oferta não está mais disponível ou o link está incorreto.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Pagamento Seguro</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            SSL
          </Badge>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Checkout Form - Left Side */}
          <div className="lg:col-span-3">
            {step === "form" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Finalizar Compra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Dados do comprador
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Forma de pagamento
                    </h3>
                    
                    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <img 
                            src="/pix-logo.png" 
                            alt="PIX" 
                            className="w-6 h-6"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">PIX</p>
                          <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-12 text-lg gap-2"
                    size="lg"
                  >
                    {isGeneratingPix ? (
                      "Gerando PIX..."
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Pagar {formatPrice(offer.price)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao clicar em "Pagar", você concorda com os termos de uso.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Aguardando Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pixData && (
                    <PixQRCode
                      pixCode={pixData.pixCode}
                      qrCodeUrl={pixData.qrCode}
                      amount={offer.price}
                      transactionId={pixData.transactionId}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product */}
                <div className="flex gap-4">
                  {product?.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{offer.name}</h3>
                    {product?.name && product.name !== offer.name && (
                      <p className="text-sm text-muted-foreground">{product.name}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(offer.price)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(offer.price)}</span>
                  </div>
                </div>

                <Separator />

                {/* Trust badges */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Compra 100% segura</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span>Dados protegidos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Aprovação instantânea via PIX</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Pagamento processado com segurança</p>
        </div>
      </footer>
    </div>
  );
}
