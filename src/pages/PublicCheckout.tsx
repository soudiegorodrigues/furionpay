import { useState, useEffect, lazy, Suspense, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUTMParams, captureUTMParams, saveUTMParams } from "@/lib/utm";
import {
  ProductOffer,
  Product,
  CheckoutConfig,
  FormData,
  PixData,
  Testimonial,
} from "@/components/checkout";

// Lazy load ALL templates for maximum code splitting
const CheckoutTemplatePadrao = lazy(() => import("@/components/checkout/CheckoutTemplatePadrao").then(m => ({ default: m.CheckoutTemplatePadrao })));
const CheckoutTemplateVega = lazy(() => import("@/components/checkout/CheckoutTemplateVega").then(m => ({ default: m.CheckoutTemplateVega })));
const CheckoutTemplateAfilia = lazy(() => import("@/components/checkout/CheckoutTemplateAfilia").then(m => ({ default: m.CheckoutTemplateAfilia })));
const CheckoutTemplateMultistep = lazy(() => import("@/components/checkout/CheckoutTemplateMultistep").then(m => ({ default: m.CheckoutTemplateMultistep })));
const CheckoutPixPayment = lazy(() => import("@/components/checkout/CheckoutPixPayment").then(m => ({ default: m.CheckoutPixPayment })));
const ExitIntentPopup = lazy(() => import("@/components/checkout/ExitIntentPopup").then(m => ({ default: m.ExitIntentPopup })));

// Minimal skeleton for instant render - CSS-only, no JS
const CheckoutSkeleton = memo(() => (
  <div className="min-h-screen bg-gray-50">
    <div className="h-12 bg-white border-b" />
    <div className="max-w-4xl mx-auto p-4 animate-pulse">
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-lg p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-16 bg-gray-100 rounded" />
            <div className="h-10 bg-green-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
));
CheckoutSkeleton.displayName = "CheckoutSkeleton";

// Preload critical images with priority
const preloadImage = (src: string | null | undefined) => {
  if (!src || typeof document === 'undefined') return;
  const existing = document.querySelector(`link[href="${src}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  link.fetchPriority = "high";
  document.head.appendChild(link);
};

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
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);

  // Capture and save UTM params IMMEDIATELY on component mount
  useEffect(() => {
    console.log('[UTM DEBUG] ========= CHECKOUT MOUNT =========');
    console.log('[UTM DEBUG] URL completa:', window.location.href);
    console.log('[UTM DEBUG] Search params:', window.location.search);
    console.log('[UTM DEBUG] Referrer:', document.referrer);
    
    // PRIORIDADE: Verificar fbclid diretamente na URL
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get("fbclid");
    
    if (fbclid) {
      // fbclid encontrado - salvar IMEDIATAMENTE como Facebook Ads
      const facebookUtms = {
        fbclid: fbclid,
        utm_source: urlParams.get("utm_source") || "facebook",
        utm_medium: urlParams.get("utm_medium") || "paid",
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        traffic_type: "ad" as const,
      };
      saveUTMParams(facebookUtms);
      console.log('[UTM DEBUG] fbclid DETECTADO e SALVO:', facebookUtms);
    } else {
      // Sem fbclid - usar lógica normal
      const currentUtms = captureUTMParams();
      console.log('[UTM DEBUG] UTMs capturados:', currentUtms);
      
      if (currentUtms.utm_source && currentUtms.utm_source !== "direct") {
        saveUTMParams(currentUtms);
        console.log('[UTM DEBUG] UTMs salvos (source relevante)');
      } else {
        const savedUtms = getUTMParams();
        console.log('[UTM DEBUG] UTMs salvos recuperados:', savedUtms);
      }
    }
    
    console.log('[UTM DEBUG] ====================================');
  }, []);

  // Fetch ALL checkout data using secure RPC function (no user_id exposure)
  const { data: checkoutData, isLoading, error } = useQuery({
    queryKey: ["public-checkout", offerCode],
    queryFn: async () => {
      if (!offerCode) return null;
      
      // Step 1: Get offer via secure RPC function (no user_id exposed)
      const { data: offerData, error: offerError } = await supabase
        .rpc("get_public_offer_by_code", { p_offer_code: offerCode });
      
      if (offerError) throw offerError;
      if (!offerData || offerData.length === 0) return null;
      
      const offerRow = offerData[0];
      
      // Map RPC result to ProductOffer format
      const offer: ProductOffer = {
        id: offerRow.id,
        product_id: offerRow.product_id,
        name: offerRow.name,
        type: offerRow.type,
        domain: offerRow.domain,
        price: offerRow.price,
        offer_code: offerRow.offer_code,
        is_active: true,
        user_id: "", // Not exposed for security
      };
      
      // Map to Product format
      const product: Product = {
        id: offerRow.product_id,
        name: offerRow.product_name,
        description: offerRow.product_description,
        image_url: offerRow.product_image_url,
        price: offerRow.product_price,
        product_code: offerRow.product_code,
        is_active: true,
      };

      // Step 2: Fetch config and testimonials IN PARALLEL using secure RPC
      const [configResult, testimonialsResult] = await Promise.all([
        supabase.rpc("get_public_checkout_config", { p_product_id: offer.product_id }),
        supabase
          .from("product_testimonials")
          .select("id, author_name, author_photo_url, rating, content")
          .eq("product_id", offer.product_id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      // RPC returns array, get first result (cast via unknown to handle type differences)
      let config = (configResult.data && configResult.data.length > 0 
        ? configResult.data[0] as unknown
        : null) as CheckoutConfig | null;
      const testimonials = (testimonialsResult.data || []) as Testimonial[];
      
      // Fetch pixel config using config's user_id (separate call to avoid circular reference)
      let pixelConfig: { pixelId?: string; accessToken?: string } = {};
      if (config?.user_id) {
        const { data: pixelData } = await supabase.functions.invoke('get-pixel-config', {
          body: { userId: config.user_id }
        });
        if (pixelData?.pixels && pixelData.pixels.length > 0) {
          const firstPixel = pixelData.pixels[0];
          pixelConfig = {
            pixelId: firstPixel.pixelId,
            accessToken: firstPixel.accessToken || undefined
          };
          console.log('[CHECKOUT] Pixel config loaded:', { 
            pixelId: pixelConfig.pixelId, 
            hasToken: !!pixelConfig.accessToken 
          });
        }
      }

      // Handle template mapping if needed (rare case)
      if (config?.template_id) {
        const { data: templateData } = await supabase
          .from("checkout_templates")
          .select("template_code, name")
          .eq("id", config.template_id)
          .eq("is_published", true)
          .maybeSingle();
        
        if (templateData) {
          const templateName = templateData.name.toLowerCase();
          config = { ...config, template: templateName === "padrão" ? "padrao" : templateName };
        }
      }

      return { offer, product, config, testimonials, pixelConfig };
    },
    enabled: !!offerCode,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  const offer = checkoutData?.offer;
  const product = checkoutData?.product;
  const config = checkoutData?.config;
  const testimonials = checkoutData?.testimonials || [];
  const pixelConfig = checkoutData?.pixelConfig;

  // Preload critical images as soon as data is available
  useEffect(() => {
    if (product?.image_url) preloadImage(product.image_url);
    if (config?.header_logo_url) preloadImage(config.header_logo_url);
    if (config?.discount_popup_image_url) preloadImage(config.discount_popup_image_url);
  }, [product, config]);

  // Back redirect handler
  useEffect(() => {
    const backRedirectUrl = config?.back_redirect_url;
    if (!backRedirectUrl) return;

    // Handle browser back button
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.location.href = backRedirectUrl;
    };

    // Push a state to enable back button detection
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [config]);

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
    if (config?.require_address) {
      if (!formData.cep.trim() || formData.cep.replace(/\D/g, '').length !== 8) {
        toast.error("CEP é obrigatório");
        return false;
      }
      if (!formData.street.trim()) {
        toast.error("Endereço/Rua é obrigatório");
        return false;
      }
      if (!formData.number.trim()) {
        toast.error("Número é obrigatório");
        return false;
      }
      if (!formData.neighborhood.trim()) {
        toast.error("Bairro é obrigatório");
        return false;
      }
    }
    return true;
  };

  // Build full address string from structured fields
  const buildFullAddress = () => {
    if (!formData.street) return "";
    const complement = formData.complement ? `, ${formData.complement}` : "";
    return `${formData.street}, ${formData.number}${complement} - ${formData.neighborhood}, ${formData.city}/${formData.state} - CEP: ${formData.cep}`;
  };

  // Calculate current price (with discount if applied)
  const getCurrentPrice = () => {
    if (!offer) return 0;
    if (discountApplied && config?.discount_popup_percentage) {
      const discountMultiplier = 1 - (config.discount_popup_percentage / 100);
      return offer.price * discountMultiplier;
    }
    return offer.price;
  };

  const handleApplyDiscount = () => {
    setDiscountApplied(true);
    toast.success(`Desconto de ${config?.discount_popup_percentage || 10}% aplicado!`);
  };

  const handleGeneratePix = async () => {
    if (!validateForm() || !offer) return;

    setIsGeneratingPix(true);
    try {
      const finalPrice = getCurrentPrice();
      
      // Get UTM params to send with PIX generation
      const utmParams = getUTMParams();
      console.log('[UTM DEBUG] ========= GERANDO PIX =========');
      console.log('[UTM DEBUG] UTMs para enviar:', utmParams);
      
      // Ensure we always send UTM data, even if minimal
      const utmToSend = Object.keys(utmParams).length > 0 ? utmParams : {
        utm_source: "direct",
        utm_medium: "none",
        traffic_type: "direct"
      };
      
      const requestBody = {
        amount: finalPrice,
        customerName: formData.name,
        customerEmail: formData.email,
        userId: offer.user_id,
        productName: offer.name,
        popupModel: "checkout",
        utmParams: utmToSend,
      };
      
      console.log('[UTM DEBUG] Body completo:', JSON.stringify(requestBody, null, 2));
      console.log('[UTM DEBUG] ===============================');
      
      const { data, error } = await supabase.functions.invoke("generate-pix", {
        body: requestBody,
      });

      console.log('[UTM DEBUG] Resposta do generate-pix:', data);

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

  // Show skeleton for fast perceived load
  if (isLoading) {
    return <CheckoutSkeleton />;
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Oferta não encontrada</h2>
          <p className="text-gray-500 mb-4">Esta oferta não está mais disponível.</p>
          <button 
            onClick={() => navigate("/")} 
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // Create modified offer with discounted price if applicable
  const effectiveOffer = {
    ...offer,
    price: getCurrentPrice(),
  };

  const templateProps = {
    offer: effectiveOffer,
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
    testimonials: testimonials || [],
    // Pass original price and discount info for display
    originalPrice: discountApplied ? offer.price : undefined,
    discountApplied,
  };

  // If PIX is generated, show the payment page
  if (step === "payment" && pixData) {
    return (
      <CheckoutPixPayment
        amount={getCurrentPrice()}
        pixCode={pixData.pixCode}
        qrCodeUrl={pixData.qrCode}
        transactionId={pixData.transactionId}
        primaryColor={config?.primary_color || "#16A34A"}
        customerEmail={formData.email}
        customerName={formData.name}
        productName={offer?.name || product?.name}
        pixelId={pixelConfig?.pixelId}
        accessToken={pixelConfig?.accessToken}
      />
    );
  }

  // Render the appropriate template based on config
  const template = config?.template || "padrao";

  const renderTemplate = () => {
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
  };

  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      {renderTemplate()}
      {config?.show_discount_popup && (
        <Suspense fallback={null}>
          <ExitIntentPopup
            isEnabled={true}
            title={config?.discount_popup_title || undefined}
            message={config?.discount_popup_message || undefined}
            ctaText={config?.discount_popup_cta || undefined}
            primaryColor={config?.discount_popup_color || config?.primary_color || "#16A34A"}
            discountPercentage={config?.discount_popup_percentage || 10}
            imageUrl={config?.discount_popup_image_url || undefined}
            onCtaClick={handleApplyDiscount}
          />
        </Suspense>
      )}
    </Suspense>
  );
}
