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
} from "lucide-react";

interface Testimonial {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  content: string;
}

interface CheckoutPreviewMiniProps {
  templateName: string;
  productName: string;
  productPrice: number;
  primaryColor: string;
  showCountdown?: boolean;
  countdownMinutes?: number;
  showTestimonials?: boolean;
  showBanner?: boolean;
  bannerImageUrl?: string | null;
  previewMode?: "desktop" | "mobile";
  testimonials?: Testimonial[];
}

export function CheckoutPreviewMini({
  templateName,
  productName,
  productPrice,
  primaryColor,
  showCountdown = false,
  countdownMinutes = 15,
  showTestimonials = false,
  showBanner = false,
  bannerImageUrl = null,
  previewMode = "desktop",
  testimonials = [],
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
          <div className="bg-gradient-to-r from-red-600 to-orange-500 py-2 px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold">
              <Zap className="h-4 w-4" />
              <span>{countdownMinutes}:00</span>
              <span className="text-xs opacity-90">OFERTA EXPIRA EM</span>
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

  // Render Padrão (Default Kiwify-style)
  return (
    <div className="bg-gray-50 min-h-[500px]">
      {/* Countdown */}
      {showCountdown && (
        <div 
          className="py-3 px-4 text-white text-center flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Clock className="h-4 w-4" />
          <span className="font-bold">{countdownMinutes}:00</span>
          <span className="text-sm">Oferta por tempo limitado</span>
        </div>
      )}

      {/* Banner */}
      {showBanner && bannerImageUrl && (
        <div className="w-full">
          <img 
            src={bannerImageUrl} 
            alt="Banner" 
            className="w-full h-auto object-cover"
          />
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
          <div>
            <p className="font-medium">{productName}</p>
            <p className="font-bold" style={{ color: primaryColor }}>
              1 X de {formatPrice(productPrice)}
            </p>
            <p className="text-xs text-gray-500">
              ou {formatPrice(productPrice)} à vista
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 bg-white">
        <h3 className="font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
            <User className="h-3 w-3" />
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
          <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-gray-400">
            (00) 00000-0000
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="p-4 space-y-3 bg-white border-t">
        <h3 className="font-medium text-gray-700">Forma de pagamento</h3>
        <div 
          className="inline-flex items-center gap-2 py-2 px-4 rounded-full border"
          style={{ borderColor: '#32BCAD30', backgroundColor: '#32BCAD08' }}
        >
          <svg width="16" height="16" viewBox="0 0 512 512" fill="none">
            <path d="M112.57 391.19c20.056 0 38.928-7.808 53.12-22l76.693-76.692c5.385-5.404 14.765-5.384 20.15 0l76.989 76.989c14.191 14.172 33.045 21.98 53.12 21.98h15.098l-97.138 97.139c-30.326 30.344-79.505 30.344-109.85 0l-97.415-97.416h9.232z" fill="#32BCAD"/>
            <path d="M401.51 120.81c-14.192 0-33.045 7.808-53.12 22l-76.97 76.99c-5.551 5.53-14.6 5.55-20.15 0l-76.711-76.693c-14.192-14.191-33.046-21.999-53.12-21.999h-9.214l97.139-97.138c30.344-30.344 79.523-30.344 109.867 0l97.138 97.139-14.86-.299z" fill="#32BCAD"/>
            <path d="M401.51 231.97c-20.075 0-38.929 7.808-53.12 22l-76.97 76.99c-2.775 2.756-6.4 4.134-10.057 4.134-3.675 0-7.3-1.378-10.093-4.134l-76.711-76.693c-14.192-14.191-33.046-22.018-53.12-22.018H91.88l-67.592-67.592c-30.326-30.344-30.326-79.523 0-109.867l67.592 67.592h29.559c20.075 0 38.929 7.807 53.12 22l76.711 76.693c5.55 5.55 14.581 5.55 20.15 0l76.97-76.99c14.191-14.172 33.045-21.98 53.12-21.98h29.559l67.611 67.592c30.326 30.344 30.326 79.523 0 109.867l-67.611-67.592H401.51z" fill="#32BCAD"/>
          </svg>
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
    </div>
  );
}