import { cn } from "@/lib/utils";
import {
  Clock,
  Shield,
  ShieldCheck,
  Lock,
  User,
  CreditCard,
  CheckCircle,
  Star,
  Truck,
  Check,
  Zap,
  Gift,
  Play,
  MessageCircle,
  Percent,
  Image,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Testimonial {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  content: string;
}

interface Banner {
  id: string;
  image_url: string;
  display_order: number | null;
  is_active: boolean | null;
}

interface OrderBump {
  id: string;
  title: string;
  description: string | null;
  bump_price: number;
  image_url: string | null;
  is_active: boolean | null;
}

interface CheckoutPreviewMiniProps {
  templateName: string;
  productName: string;
  productPrice: number;
  primaryColor: string;
  backgroundColor?: string;
  showCountdown?: boolean;
  countdownMinutes?: number;
  countdownColor?: string;
  countdownText?: string;
  showTestimonials?: boolean;
  showBanner?: boolean;
  bannerImageUrl?: string | null;
  previewMode?: "desktop" | "mobile";
  testimonials?: Testimonial[];
  deliveryDescription?: string;
  requiredFields?: {
    address: boolean;
    phone: boolean;
    birthdate: boolean;
    cpf: boolean;
    emailConfirmation: boolean;
  };
  // New props
  showVideo?: boolean;
  videoUrl?: string;
  videoPosterUrl?: string;
  videoPlayOverlayUrl?: string;
  showWhatsappButton?: boolean;
  whatsappNumber?: string;
  banners?: Banner[];
  orderBumps?: OrderBump[];
  showDiscountPopup?: boolean;
  discountPopupPercentage?: number;
}

export function CheckoutPreviewMini({
  templateName,
  productName,
  productPrice,
  primaryColor,
  backgroundColor = "#f3f4f6",
  showCountdown = false,
  countdownMinutes = 15,
  countdownColor = "#dc2626",
  countdownText = "🔥 OFERTA EXPIRA EM:",
  showTestimonials = false,
  showBanner = false,
  bannerImageUrl = null,
  previewMode = "desktop",
  testimonials = [],
  deliveryDescription = "Acesso imediato",
  requiredFields = {
    address: false,
    phone: false,
    birthdate: false,
    cpf: false,
    emailConfirmation: false,
  },
  showVideo = false,
  videoUrl = "",
  videoPosterUrl = "",
  videoPlayOverlayUrl = "",
  showWhatsappButton = false,
  whatsappNumber = "",
  banners = [],
  orderBumps = [],
  showDiscountPopup = false,
  discountPopupPercentage = 10,
}: CheckoutPreviewMiniProps) {
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const template = templateName?.toLowerCase() || "padrão";

  // Render Vega (Dark Premium Theme)
  if (template === "vega") {
    return (
      <div className="bg-zinc-900 text-white min-h-[500px]">
        {/* Urgency Banner */}
        {showCountdown && (
          <div 
            className="py-2 px-4 text-center text-white"
            style={{ backgroundColor: countdownColor }}
          >
            <div className="flex items-center justify-center gap-2 text-sm font-bold">
              <Zap className="h-4 w-4" />
              <span>{countdownText} {countdownMinutes}:00</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-zinc-400">Checkout Seguro</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">SSL 256-bit</span>
          </div>
        </div>

        {/* Video Preview */}
        {showVideo && videoUrl && (
          <div className="mx-4 mt-4 relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-700">
            {videoPosterUrl ? (
              <img 
                src={videoPosterUrl} 
                alt="Video poster" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-2">
              {videoPlayOverlayUrl ? (
                <img 
                  src={videoPlayOverlayUrl} 
                  alt="Play" 
                  className="max-w-[50%] max-h-[60%] object-contain drop-shadow-lg"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500"
                >
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product */}
        <div className="p-4">
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg flex items-center justify-center">
                <Gift className="h-6 w-6 text-zinc-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{productName}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-zinc-400 ml-1">(2.847)</span>
                </div>
                <p className="text-xl font-bold mt-2" style={{ color: primaryColor }}>
                  {formatPrice(productPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="h-10 bg-zinc-800 rounded-lg border border-zinc-700 px-3 flex items-center text-sm text-zinc-500">
              Seu nome completo
            </div>
            <div className="h-10 bg-zinc-800 rounded-lg border border-zinc-700 px-3 flex items-center text-sm text-zinc-500">
              seu@email.com
            </div>
          </div>
          <button 
            className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Lock className="h-4 w-4" />
            GARANTIR ACESSO
          </button>
        </div>

        {/* Social Proof */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 border-2 border-zinc-900" />
              ))}
            </div>
            <span className="text-xs text-zinc-400">+1.234 pessoas compraram</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Afilia (E-commerce Style)
  if (template === "afilia") {
    return (
      <div className="bg-gray-50 min-h-[500px]">
        {/* Free Shipping Banner */}
        <div className="bg-emerald-500 text-white py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Truck className="h-4 w-4" />
            <span className="font-medium">Frete Grátis para todo Brasil!</span>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Finalizar Pedido</h2>
          <p className="text-xs text-gray-500">Preencha seus dados para continuar</p>
        </div>

        {/* Video Preview */}
        {showVideo && videoUrl && (
          <div className="mx-4 mt-4 relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center shadow-md">
            {videoPosterUrl ? (
              <img 
                src={videoPosterUrl} 
                alt="Video poster" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-2">
              {videoPlayOverlayUrl ? (
                <img 
                  src={videoPlayOverlayUrl} 
                  alt="Play" 
                  className="max-w-[50%] max-h-[60%] object-contain drop-shadow-lg"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Card */}
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <Gift className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{productName}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-gray-500">(1.432 vendidos)</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-gray-400 line-through">{formatPrice(productPrice * 1.3)}</span>
                  <span className="text-lg font-bold ml-2" style={{ color: primaryColor }}>
                    {formatPrice(productPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PIX Discount */}
        <div className="px-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              5%
            </div>
            <div>
              <p className="font-semibold text-emerald-700 text-sm">Desconto no PIX</p>
              <p className="text-xs text-emerald-600">Pague com PIX e economize!</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-lg border p-3 space-y-3">
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              Nome completo
            </div>
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              seu@email.com
            </div>
          </div>
          <button 
            className="w-full py-3 rounded-lg font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Confirmar Pedido
          </button>
        </div>
      </div>
    );
  }

  // Render Multistep
  if (template === "multistep") {
    return (
      <div className="bg-white min-h-[500px]">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Checkout Seguro</h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Lock className="h-3 w-3" />
              SSL
            </div>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                1
              </div>
              <span className="text-xs font-medium" style={{ color: primaryColor }}>Info</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                2
              </div>
              <span className="text-xs text-gray-400">Contato</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                3
              </div>
              <span className="text-xs text-gray-400">Pagar</span>
            </div>
          </div>
        </div>

        {/* Video Preview */}
        {showVideo && videoUrl && (
          <div className="mx-4 mb-4 relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-lg">
            {videoPosterUrl ? (
              <img 
                src={videoPosterUrl} 
                alt="Video poster" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-indigo-900" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-2">
              {videoPlayOverlayUrl ? (
                <img 
                  src={videoPlayOverlayUrl} 
                  alt="Play" 
                  className="max-w-[50%] max-h-[60%] object-contain drop-shadow-lg"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Summary */}
        <div className="px-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{productName}</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>
                  {formatPrice(productPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Step */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-700">Suas Informações</h3>
          <div className="space-y-2">
            <div className="h-10 bg-gray-50 rounded-lg border px-3 flex items-center text-sm text-gray-400">
              Seu nome
            </div>
            <div className="h-10 bg-gray-50 rounded-lg border px-3 flex items-center text-sm text-gray-400">
              Seu email
            </div>
          </div>
          <button 
            className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            Continuar
            <span>→</span>
          </button>
        </div>

        {/* Bonus Section */}
        <div className="p-4 border-t">
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <Gift className="h-4 w-4" />
              <span className="text-sm font-medium">+3 Bônus Exclusivos</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to format price
  const formatPriceBRL = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  // Active banners
  const activeBanners = banners.filter(b => b.is_active !== false);
  const activeOrderBumps = orderBumps.filter(ob => ob.is_active !== false);

  // Render Padrão (Default Kiwify-style)
  return (
    <div className="min-h-[500px] relative" style={{ backgroundColor }}>
      {/* Countdown */}
      {showCountdown && (
        <div 
          className="py-3 px-4 text-white text-center flex items-center justify-center gap-2"
          style={{ backgroundColor: countdownColor }}
        >
          <Clock className="h-4 w-4" />
          <span className="font-bold">{countdownText} {countdownMinutes}:00</span>
        </div>
      )}

      {/* Banner / Carousel */}
      {showBanner && (activeBanners.length > 0 || bannerImageUrl) && (
        <div className="w-full relative">
          {activeBanners.length > 0 ? (
            <>
              <img 
                src={activeBanners[0].image_url} 
                alt="Banner" 
                className="w-full h-auto object-cover"
              />
              {activeBanners.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                  <ChevronLeft className="h-3 w-3 text-white/70" />
                  <span className="text-xs text-white font-medium">1/{activeBanners.length}</span>
                  <ChevronRight className="h-3 w-3 text-white/70" />
                </div>
              )}
            </>
          ) : bannerImageUrl ? (
            <img 
              src={bannerImageUrl} 
              alt="Banner" 
              className="w-full h-auto object-cover"
            />
          ) : null}
        </div>
      )}

      {/* Video Preview */}
      {showVideo && videoUrl && (
        <div className="mx-4 mt-4 relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
          {videoPosterUrl ? (
            <img 
              src={videoPosterUrl} 
              alt="Video poster" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-2">
            {videoPlayOverlayUrl ? (
              <img 
                src={videoPlayOverlayUrl} 
                alt="Play" 
                className="max-w-[50%] max-h-[60%] object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            )}
            {!videoPlayOverlayUrl && (
              <span className="text-xs text-white/70">Vídeo de Vendas</span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">Finalizar Compra</h2>
      </div>

      {/* Product Summary */}
      <div className="p-4 bg-white">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <Gift className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{productName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {deliveryDescription}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(productPrice)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span style={{ color: primaryColor }}>{formatPrice(productPrice)}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 bg-white">
        <h3 className="font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
            1
          </span>
          Dados do comprador
        </h3>
        <div className="space-y-3">
          <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
            Digite seu nome
          </div>
          <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
            seu@email.com
          </div>
          {requiredFields.emailConfirmation && (
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              Confirme seu email
            </div>
          )}
          {requiredFields.phone && (
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              (00) 00000-0000
            </div>
          )}
          {requiredFields.cpf && (
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              000.000.000-00
            </div>
          )}
          {requiredFields.birthdate && (
            <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
              Data de nascimento
            </div>
          )}
          {requiredFields.address && (
            <>
              <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
                CEP
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
                  Endereço
                </div>
                <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
                  Nº
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
                  Cidade
                </div>
                <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
                  Estado
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Order Bumps */}
      {activeOrderBumps.length > 0 && (
        <div className="mx-4 mt-4 space-y-2">
          {activeOrderBumps.map((bump) => (
            <div 
              key={bump.id}
              className="p-3 rounded-lg border-2 border-dashed"
              style={{ borderColor: primaryColor + "50", backgroundColor: primaryColor + "08" }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderColor: primaryColor }}
                >
                  <Check className="h-3 w-3" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {bump.image_url && (
                      <img 
                        src={bump.image_url} 
                        alt={bump.title}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold truncate">{bump.title}</p>
                      {bump.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{bump.description}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold mt-1" style={{ color: primaryColor }}>
                    + {formatPriceBRL(bump.bump_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment */}
      <div className="p-4 space-y-3 bg-white border-t">
        <h3 className="font-medium text-gray-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
            2
          </span>
          Forma de pagamento
        </h3>
        <div 
          className="inline-flex items-center gap-2 py-2 px-4 rounded-full border"
          style={{ borderColor: '#32BCAD30', backgroundColor: '#32BCAD08' }}
        >
          <img src="/pix-icon.png" alt="PIX" className="w-4 h-4" />
          <span className="text-sm font-medium" style={{ color: '#32BCAD' }}>PIX</span>
        </div>
        <button 
          className="w-full py-3 rounded-lg font-semibold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Finalizar Compra
        </button>
      </div>

      {/* Testimonials */}
      {showTestimonials && testimonials.length > 0 && (
        <div className="p-5 bg-white border-t">
          <h4 className="font-semibold text-base mb-4">O que dizem nossos clientes</h4>
          <div className="space-y-3">
            {testimonials.slice(0, 3).map((item) => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  {item.author_photo_url ? (
                    <img
                      src={item.author_photo_url}
                      alt={item.author_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: getAvatarColor(item.author_name) }}
                    >
                      {getInitials(item.author_name)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.author_name}</span>
                    <span className="text-sm text-yellow-500">
                      {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">"{item.content}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Section */}
      <div className="p-5 bg-white border-t">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Dados protegidos</p>
              <p className="text-xs text-gray-500">Suas informações são confidenciais e seguras</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Pagamento 100% Seguro</p>
              <p className="text-xs text-gray-500">Todas as transações são criptografadas</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Conteúdo Aprovado</p>
              <p className="text-xs text-gray-500">Revisado e validado por especialistas</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Garantia de 7 dias</p>
              <p className="text-xs text-gray-500">Você tem 7 dias para testar o produto</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-3">
            <Lock className="w-3 h-3" />
            <span className="text-xs">Ambiente 100% seguro</span>
          </div>
        </div>
      </div>

      {/* Security badges */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center justify-center gap-4 text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="text-xs">Pagamento Seguro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-4 w-4" />
            <span className="text-xs">Compra Garantida</span>
          </div>
        </div>
        <p className="text-xs text-center text-gray-400 mt-3">
          Pagamento processado com segurança
        </p>
      </div>

      {/* WhatsApp Button */}
      {showWhatsappButton && whatsappNumber && (
        <div 
          className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg cursor-pointer z-10"
          style={{ position: 'absolute' }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Discount Popup Indicator */}
      {showDiscountPopup && (
        <div 
          className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <Percent className="h-3 w-3" />
          -{discountPopupPercentage}%
        </div>
      )}
    </div>
  );
}