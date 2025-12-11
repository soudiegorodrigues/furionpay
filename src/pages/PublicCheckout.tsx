import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import {
  CheckoutTemplatePadrao,
  CheckoutTemplateVega,
  CheckoutTemplateAfilia,
  CheckoutTemplateMultistep,
  CheckoutPixPayment,
  ProductOffer,
  Product,
  CheckoutConfig,
  FormData,
  PixData,
} from "@/components/checkout";

export default function PublicCheckout() {
  const { offerCode } = useParams<{ offerCode: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "payment">("form");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    emailConfirm: "",
    phone: "",
    cpf: "",
    birthdate: "",
    address: "",
  });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

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
        .maybeSingle();
      
      if (error) throw error;
      return data as ProductOffer | null;
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
        .maybeSingle();
      
      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!offer?.product_id,
  });

  // Fetch checkout config with template info
  const { data: config } = useQuery({
    queryKey: ["checkout-config", offer?.product_id],
    queryFn: async () => {
      if (!offer?.product_id) return null;
      
      const { data, error } = await supabase
        .from("product_checkout_configs")
        .select("*")
        .eq("product_id", offer.product_id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If template_id is set, fetch the template to get template_code
      if (data?.template_id) {
        const { data: templateData } = await supabase
          .from("checkout_templates")
          .select("template_code, name")
          .eq("id", data.template_id)
          .eq("is_published", true)
          .maybeSingle();
        
        if (templateData) {
          // Map template name to template code for backwards compatibility
          const templateName = templateData.name.toLowerCase();
          data.template = templateName === "padrão" ? "padrao" : templateName;
        }
      }
      
      return data as CheckoutConfig | null;
    },
    enabled: !!offer?.product_id,
  });

  // Countdown timer
  useEffect(() => {
    if (config?.show_countdown && config.countdown_minutes) {
      setCountdown(config.countdown_minutes * 60);
    }
  }, [config]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    if (config?.require_email_confirmation && formData.email !== formData.emailConfirm) {
      toast.error("Os emails não coincidem");
      return false;
    }
    if (config?.require_phone && !formData.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return false;
    }
    if (config?.require_cpf && !formData.cpf.trim()) {
      toast.error("CPF é obrigatório");
      return false;
    }
    if (config?.require_birthdate && !formData.birthdate.trim()) {
      toast.error("Data de nascimento é obrigatória");
      return false;
    }
    if (config?.require_address && !formData.address.trim()) {
      toast.error("Endereço é obrigatório");
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

  const templateProps = {
    offer,
    product,
    config,
    formData,
    setFormData,
    step,
    pixData,
    isGeneratingPix,
    countdown,
    onGeneratePix: handleGeneratePix,
    formatPrice,
    formatCountdown,
  };

  // If PIX is generated, show the payment page
  if (step === "payment" && pixData) {
    return (
      <CheckoutPixPayment
        amount={offer.price}
        pixCode={pixData.pixCode}
        qrCodeUrl={pixData.qrCode}
        transactionId={pixData.transactionId}
        primaryColor={config?.primary_color || "#16A34A"}
      />
    );
  }

  // Render the appropriate template based on config
  const template = config?.template || "padrao";

  switch (template) {
    case "vega":
      return <CheckoutTemplateVega {...templateProps} />;
    case "afilia":
      return <CheckoutTemplateAfilia {...templateProps} />;
    case "multistep":
      return <CheckoutTemplateMultistep {...templateProps} />;
    default:
      return <CheckoutTemplatePadrao {...templateProps} />;
  }
}
