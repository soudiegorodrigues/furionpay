import { useState, useEffect, Suspense, memo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUTMParams, captureUTMParams, saveUTMParams } from "@/lib/utm";
import { trackOfferClick } from "@/lib/clickTracking";
import { preloadCheckoutResources, preloadImage } from "@/lib/performanceUtils";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import type {
  ProductOffer,
  Product,
  CheckoutConfig,
  FormData,
  PixData,
  Testimonial,
  OrderBumpData,
} from "@/components/checkout/types";

// Lazy load ALL templates with retry for maximum reliability
const CheckoutTemplatePadrao = lazyWithRetry(() => import("@/components/checkout/CheckoutTemplatePadrao").then(m => ({ default: m.CheckoutTemplatePadrao })), 'CheckoutTemplatePadrao');
const CheckoutTemplateVega = lazyWithRetry(() => import("@/components/checkout/CheckoutTemplateVega").then(m => ({ default: m.CheckoutTemplateVega })), 'CheckoutTemplateVega');
const CheckoutTemplateAfilia = lazyWithRetry(() => import("@/components/checkout/CheckoutTemplateAfilia").then(m => ({ default: m.CheckoutTemplateAfilia })), 'CheckoutTemplateAfilia');
const CheckoutTemplateMultistep = lazyWithRetry(() => import("@/components/checkout/CheckoutTemplateMultistep").then(m => ({ default: m.CheckoutTemplateMultistep })), 'CheckoutTemplateMultistep');
const CheckoutPixPayment = lazyWithRetry(() => import("@/components/checkout/CheckoutPixPayment").then(m => ({ default: m.CheckoutPixPayment })), 'CheckoutPixPayment');
const ExitIntentPopup = lazyWithRetry(() => import("@/components/checkout/ExitIntentPopup").then(m => ({ default: m.ExitIntentPopup })), 'ExitIntentPopup');


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

export default function PublicCheckout() {
  const { offerCode } = useParams<{ offerCode: string }>();
  const navigate = useNavigate();

  const debugEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";
  const debugClickEnabled = 
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug_click") === "1";

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
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);

  // Debug state for click tracking
  const [clickDebugInfo, setClickDebugInfo] = useState<{ status: string; details?: any } | null>(null);

  // Capture and save UTM params IMMEDIATELY on component mount
  useEffect(() => {
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
    } else {
      // Sem fbclid - usar lógica normal
      const currentUtms = captureUTMParams();
      
      if (currentUtms.utm_source && currentUtms.utm_source !== "direct") {
        saveUTMParams(currentUtms);
      }
    }
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
      
      const offerRow = offerData[0] as {
        id: string;
        product_id: string;
        name: string;
        type: string;
        domain: string | null;
        price: number;
        offer_code: string | null;
        product_name: string;
        product_description: string | null;
        product_image_url: string | null;
        product_price: number;
        product_code: string | null;
        upsell_url: string | null;
        downsell_url: string | null;
        crosssell_url: string | null;
      };
      
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
        upsell_url: offerRow.upsell_url,
        downsell_url: offerRow.downsell_url,
        crosssell_url: offerRow.crosssell_url,
      };
      
      // Map to Product format - add cache busting to image URL
      const product: Product = {
        id: offerRow.product_id,
        name: offerRow.product_name,
        description: offerRow.product_description,
        image_url: offerRow.product_image_url 
          ? `${offerRow.product_image_url.split('?')[0]}?t=${Date.now()}`
          : null,
        price: offerRow.product_price,
        product_code: offerRow.product_code,
        is_active: true,
      };

      // Step 2: Fetch config, testimonials, and order bumps IN PARALLEL using secure RPC
      const [configResult, testimonialsResult, orderBumpsResult] = await Promise.all([
        supabase.rpc("get_public_checkout_config", { p_product_id: offer.product_id }),
        supabase
          .from("product_testimonials")
          .select("id, author_name, author_photo_url, rating, content")
          .eq("product_id", offer.product_id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        // SECURITY FIX: Use secure RPC to fetch order bumps (no user_id exposure)
        supabase.rpc("get_public_order_bumps", { p_product_id: offer.product_id }),
      ]);

      // RPC returns array, get first result (cast via unknown to handle type differences)
      let config = (configResult.data && configResult.data.length > 0 
        ? configResult.data[0] as unknown
        : null) as CheckoutConfig | null;
      const testimonials = (testimonialsResult.data || []) as Testimonial[];
      
      // Process order bumps from secure RPC - new flat structure
      const orderBumps: OrderBumpData[] = (orderBumpsResult.data || []).map((bump: any) => ({
        id: bump.id,
        title: bump.title,
        description: bump.description,
        bump_price: bump.bump_price,
        image_url: bump.image_url,
        bump_product: bump.bump_product_id ? {
          id: bump.bump_product_id,
          name: bump.bump_product_name,
          image_url: bump.bump_product_image_url,
        } : null,
      }));

      // Fetch banners in parallel to avoid CLS from internal template fetch
      const { data: bannersData } = await supabase
        .from("checkout_banners")
        .select("id, image_url, display_order")
        .eq("product_id", offer.product_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      const banners = bannersData || [];
      
      // Fetch pixel config using config's user_id and product_id for product-specific pixels
      let pixelConfig: { pixelId?: string; accessToken?: string } = {};
      if (config?.user_id) {
        const { data: pixelData } = await supabase.functions.invoke('get-pixel-config', {
          body: { 
            userId: config.user_id,
            productId: offer.product_id 
          }
        });
        if (pixelData?.pixels && pixelData.pixels.length > 0) {
          const firstPixel = pixelData.pixels[0];
          pixelConfig = {
            pixelId: firstPixel.pixelId,
            accessToken: firstPixel.accessToken || undefined
          };
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

      return { offer, product, config, testimonials, pixelConfig, orderBumps, banners };
    },
    enabled: !!offerCode,
    staleTime: 1000 * 30, // Cache for 30 seconds (ensures fresh product images)
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  const offer = checkoutData?.offer;
  const product = checkoutData?.product;
  const config = checkoutData?.config;
  const testimonials = checkoutData?.testimonials || [];
  const pixelConfig = checkoutData?.pixelConfig;
  const orderBumps = checkoutData?.orderBumps || [];
  const banners = checkoutData?.banners || [];

  // Track offer clicks when offer is loaded - every open = 1 click
  useEffect(() => {
    if (!offer?.id) return;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('[Checkout] Missing VITE_SUPABASE_URL');
      return;
    }

    // Track the click
    trackOfferClick(offer.id, supabaseUrl).then((result) => {
      if (debugClickEnabled) {
        setClickDebugInfo({ 
          status: result.success ? 'success' : 'error', 
          details: { ...result, offerId: offer.id } 
        });
      }
      console.log('[Checkout] Click tracked:', result);
    });
  }, [offer?.id, debugClickEnabled]);

  // Preload critical resources as soon as data is available
  useEffect(() => {
    if (product || config) {
      preloadCheckoutResources({
        productImage: product?.image_url,
        headerLogo: config?.header_logo_url,
        videoUrl: config?.video_url,
      });
    }
  }, [product, config]);

  // PERFORMANCE: Preload product image for faster LCP
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (checkoutData?.product?.image_url && !preloadedRef.current) {
      preloadedRef.current = true;
      const imageUrl = checkoutData.product.image_url;
      
      // Inject link preload into head for browser prioritization
      const existingPreload = document.querySelector(`link[rel="preload"][href="${imageUrl}"]`);
      if (!existingPreload) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imageUrl;
        document.head.appendChild(link);
      }
      
      preloadImage(imageUrl, 'high');
    }
  }, [checkoutData?.product?.image_url]);

  // Initialize Meta Pixel DEFERRED - não bloqueia LCP
  useEffect(() => {
    if (!pixelConfig?.pixelId || typeof window === 'undefined') return;
    
    const pixelId = pixelConfig.pixelId;
    let loaded = false;
    
    const loadPixel = () => {
      if (loaded) return;
      loaded = true;
      
      // Check if this pixel is already initialized
      if (window.fbq && window.fbq.getState && window.fbq.getState().pixels?.some((p: any) => p.id === pixelId)) {
        return;
      }
      
      // Create fbq function if it doesn't exist
      if (!window.fbq) {
        const n = window.fbq = function() {
          // @ts-ignore
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!window._fbq) window._fbq = n;
        // @ts-ignore
        n.push = n;
        // @ts-ignore
        n.loaded = true;
        // @ts-ignore
        n.version = '2.0';
        // @ts-ignore
        n.queue = [];
        
        // Load the Facebook script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(script);
      }
      
      // Initialize this pixel
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    };
    
    // PERFORMANCE: Defer pixel loading to after LCP
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadPixel, { timeout: 3000 });
      } else {
        setTimeout(loadPixel, 2000);
      }
    };
    
    // Load after 2 seconds or first user interaction
    const timer = setTimeout(scheduleLoad, 2000);
    const events = ['scroll', 'click', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, loadPixel, { once: true, passive: true });
    });
    
    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        document.removeEventListener(event, loadPixel);
      });
    };
  }, [pixelConfig]);

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
      setCountdown(prev => {
        if (prev !== null && prev > 1) return prev - 1;
        clearInterval(timer); // Para o timer definitivamente em 0
        return 0;
      });
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

  // Calculate current price (with discount and order bumps)
  const getCurrentPrice = () => {
    if (!offer) return 0;
    
    let basePrice = offer.price;
    
    // Apply discount if applicable
    if (discountApplied && config?.discount_popup_percentage) {
      const discountMultiplier = 1 - (config.discount_popup_percentage / 100);
      basePrice = basePrice * discountMultiplier;
    }
    
    // Add selected order bumps
    const bumpTotal = selectedBumps.reduce((total, bumpId) => {
      const bump = orderBumps.find(b => b.id === bumpId);
      return total + (bump?.bump_price || 0);
    }, 0);
    
    return basePrice + bumpTotal;
  };

  // Toggle order bump selection
  const handleToggleBump = (bumpId: string) => {
    setSelectedBumps(prev => 
      prev.includes(bumpId)
        ? prev.filter(id => id !== bumpId)
        : [...prev, bumpId]
    );
  };

  // Get selected bumps data for PIX generation
  const getSelectedBumpsData = () => {
    return selectedBumps.map(bumpId => {
      const bump = orderBumps.find(b => b.id === bumpId);
      return bump ? {
        id: bump.id,
        title: bump.title,
        price: bump.bump_price,
        product_name: bump.bump_product?.name || "Oferta adicional",
      } : null;
    }).filter(Boolean);
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
        customerPhone: formData.phone || null,
        customerCpf: formData.cpf || null,
        customerBirthdate: formData.birthdate || null,
        customerAddress: formData.cep ? {
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
        } : null,
        userId: config?.user_id || offer.user_id,
        productName: product?.name || offer.name,
        popupModel: "checkout",
        utmParams: utmToSend,
        orderBumps: getSelectedBumpsData(),
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
    // Order bump props
    orderBumps,
    selectedBumps,
    onToggleBump: handleToggleBump,
    // Banners prop to eliminate CLS
    banners,
  };

  // If PIX is generated, show the payment page
  if (step === "payment" && pixData) {
    return (
      <Suspense fallback={<CheckoutSkeleton />}>
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
          upsellUrl={offer?.upsell_url || undefined}
          downsellUrl={offer?.downsell_url || undefined}
          crosssellUrl={offer?.crosssell_url || undefined}
          thankYouUrl={config?.thank_you_url || undefined}
        />
      </Suspense>
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
    <ChunkErrorBoundary>
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
    </ChunkErrorBoundary>
  );
}
