import { memo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, Lock, Shield, Clock, Star, Users, Zap, Gift, ShieldCheck, CheckCircle, ClipboardCheck, RefreshCw
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";
import { cn } from "@/lib/utils";
import { AddressFields } from "./AddressFields";
import { BannersCarousel } from "./BannersCarousel";
import { OrderBumpCard } from "./OrderBumpCard";
import { CustomVideoPlayer } from "./CustomVideoPlayer";


// Memoized star rating component
const StarRating = memo(({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn(
          "h-5 w-5 sm:h-4 sm:w-4",
          star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ))}
  </div>
));
StarRating.displayName = "StarRating";

// Template PADRÃO - Inspirado no checkout da Kiwify
// Foco em: Simplicidade, confiança e conversão
export function CheckoutTemplatePadrao({
  offer,
  product,
  config,
  formData,
  setFormData,
  step,
  pixData,
  isGeneratingPix,
  countdown,
  onGeneratePix,
  formatPrice,
  formatCountdown,
  testimonials = [],
  originalPrice,
  discountApplied,
  orderBumps = [],
  selectedBumps = [],
  onToggleBump,
  banners = [],
}: CheckoutTemplateProps) {
  const primaryColor = config?.primary_color || "#22C55E";

  const getInitials = useCallback((name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }, []);

  const getAvatarColor = useCallback((name: string) => {
    const colors = [
      "#ef4444", "#3b82f6", "#22c55e", "#eab308", 
      "#a855f7", "#ec4899", "#6366f1", "#14b8a6"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }, []);

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: config?.background_color || '#f8fafc' }}
    >
      {/* Urgency Banner - ALWAYS reserve space to prevent CLS */}
      <div 
        className="py-3 text-center text-white font-semibold transition-opacity duration-200"
        style={{ 
          backgroundColor: config?.countdown_color || '#dc2626',
          minHeight: '48px',
          opacity: (config?.show_countdown && countdown !== null && countdown > 0) ? 1 : 0,
          visibility: (config?.show_countdown && countdown !== null && countdown > 0) ? 'visible' : 'hidden',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{(config as any)?.countdown_text || '🔥 OFERTA EXPIRA EM:'} {formatCountdown(countdown || 0)}</span>
          <Clock className="h-4 w-4" />
        </div>
      </div>

      {/* Banner Images Carousel - Reserve space to prevent CLS */}
      {config?.show_banners && (
        <div className="container max-w-4xl mx-auto px-4 pt-4">
          {banners.length > 0 ? (
            <BannersCarousel banners={banners} />
          ) : (
            <div 
              className="w-full rounded-lg bg-gray-100 animate-pulse"
              style={{ aspectRatio: '16 / 6' }}
            />
          )}
        </div>
      )}

      {/* Video Section - Reserve space to prevent CLS */}
      {config?.show_video && (
        <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4">
          {config?.video_url ? (
            <CustomVideoPlayer 
              videoUrl={config.video_url}
              posterUrl={config?.video_poster_url || product?.image_url || undefined}
              playOverlayUrl={config?.video_play_overlay_url || undefined}
              className="w-full aspect-video rounded-lg overflow-hidden shadow-lg"
            />
          ) : (
            <div 
              className="w-full rounded-lg bg-gray-100 animate-pulse"
              style={{ aspectRatio: '16 / 9' }}
            />
          )}
        </div>
      )}

      {/* Compact Header - Alinhado com cards */}
      <div className="container max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-lg border shadow-sm py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
              <Lock className="h-4 w-4" style={{ color: primaryColor }} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {config?.security_badge_text || "Checkout Seguro"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
              <Shield className="h-3 w-3" />
              Protegido
            </Badge>
          </div>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-4 py-6">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-3 space-y-4">
              {/* Buyer Info + Address Card */}
              <Card className="shadow-md border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      1
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {config?.buyer_section_title || "Dados do comprador"}
                      </h2>
                      <p className="text-xs text-gray-500">Preencha seus dados</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      Nome completo *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Digite seu nome completo"
                      className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                    />
                  </div>

                  {config?.require_email_confirmation && (
                    <div className="space-y-2">
                      <Label htmlFor="emailConfirm" className="text-gray-700 font-medium">Confirmar E-mail *</Label>
                      <Input
                        id="emailConfirm"
                        type="email"
                        value={formData.emailConfirm}
                        onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                        placeholder="Confirme seu e-mail"
                        className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {config?.require_phone && (
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-700 font-medium">
                          Telefone *
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                        />
                      </div>
                    )}
                    
                    {config?.require_cpf && (
                      <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-gray-700 font-medium">CPF *</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                        />
                      </div>
                    )}
                  </div>

                  {config?.require_birthdate && (
                    <div className="space-y-2">
                      <Label htmlFor="birthdate" className="text-gray-700 font-medium">
                        Data de nascimento *
                      </Label>
                      <Input
                        id="birthdate"
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                        className="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                      />
                    </div>
                  )}

                  {/* Section 2: Address */}
                  {config?.require_address && (
                    <>
                      <div className="pt-4 mt-4 border-t">
                        <div className="flex items-center gap-3 mb-4">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: primaryColor }}
                          >
                            2
                          </div>
                          <div>
                            <h2 className="font-bold text-gray-900">Endereço</h2>
                            <p className="text-xs text-gray-500">Informe seu endereço</p>
                          </div>
                        </div>
                      </div>
                      <AddressFields
                        formData={formData}
                        setFormData={setFormData}
                        inputClassName="h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300"
                        labelClassName="text-gray-700 font-medium"
                        variant="light"
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Order Bumps Section */}
              {orderBumps.length > 0 && onToggleBump && (
                <div className="space-y-3">
                  {orderBumps.map((bump) => (
                    <OrderBumpCard
                      key={bump.id}
                      bump={bump}
                      isSelected={selectedBumps.includes(bump.id)}
                      onToggle={onToggleBump}
                      formatPrice={formatPrice}
                      primaryColor={primaryColor}
                    />
                  ))}
                </div>
              )}

              {/* Payment Method Card */}
              <Card className="shadow-md border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {config?.require_address ? "3" : "2"}
                    </div>
                    <h2 className="font-medium text-gray-700">Forma de pagamento</h2>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div 
                    className="inline-flex items-center gap-2 py-2 px-4 rounded-full border"
                    style={{ borderColor: '#32BCAD30', backgroundColor: '#32BCAD08' }}
                  >
                    <img src="/pix-icon.png" alt="PIX" className="w-5 h-5" />
                    <span className="text-sm font-medium" style={{ color: '#32BCAD' }}>PIX</span>
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-14 text-lg font-bold gap-2 shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isGeneratingPix ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando PIX...
                      </span>
                    ) : (
                      <>
                        <Lock className="h-5 w-5" />
                        {config?.custom_button_text || `FINALIZAR COMPRA`}
                      </>
                    )}
                  </Button>

                  {/* Trust Section Below Button */}
                  <div className="space-y-4 pt-6 mt-6 border-t">
                    {/* Trust Items */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Dados protegidos</p>
                          <p className="text-xs text-gray-500">Suas informações são confidenciais e seguras</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Lock className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Pagamento 100% Seguro</p>
                          <p className="text-xs text-gray-500">Todas as transações são criptografadas</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Conteúdo Aprovado</p>
                          <p className="text-xs text-gray-500">Revisado e validado por especialistas</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <RefreshCw className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Garantia de 7 dias</p>
                          <p className="text-xs text-gray-500">Você tem 7 dias para testar o produto</p>
                        </div>
                      </div>
                    </div>

                    {/* Security Footer */}
                    <div className="pt-4 border-t flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Shield className="h-4 w-4" />
                        <span>Ambiente 100% seguro</span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-500">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium">Compra 100% Segura</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium">Dados Protegidos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-20 shadow-md border-0">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-bold text-gray-900">Resumo da compra</h2>

                  {config?.show_product_image !== false && (
                    <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-24 h-24 shrink-0" style={{ aspectRatio: '1/1' }}>
                        {product?.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name || "Produto"} 
                            className="w-24 h-24 object-cover rounded-lg" 
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{product?.name || offer.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{config?.delivery_description || "Acesso imediato"}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <div className="flex items-center gap-2">
                        {discountApplied && originalPrice && (
                          <span className="text-gray-400 line-through text-xs">{formatPrice(originalPrice)}</span>
                        )}
                        <span className="text-gray-700">{formatPrice(offer.price)}</span>
                      </div>
                    </div>
                    {discountApplied && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">Desconto aplicado</span>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          -{Math.round(((originalPrice! - offer.price) / originalPrice!) * 100)}% OFF
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-gray-900">Total</span>
                      <span style={{ color: primaryColor }}>{formatPrice(offer.price)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Social Proof */}
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">+1.847 pessoas compraram</span>
                    </div>
                  </div>

                  {/* Testimonials Section */}
                  {config?.show_notifications && testimonials && testimonials.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg sm:text-base font-semibold text-gray-700 mb-3">O que dizem nossos clientes</h3>
                        <div className="space-y-3">
                          {testimonials.slice(0, 3).map((testimonial) => (
                            <div key={testimonial.id} className="flex items-start gap-4 sm:gap-3 p-4 sm:p-3 bg-gray-50 rounded-lg">
                              {testimonial.author_photo_url ? (
                                <img
                                  src={testimonial.author_photo_url}
                                  alt={testimonial.author_name}
                                  className="w-12 h-12 sm:w-10 sm:h-10 rounded-full object-cover shrink-0"
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                />
                              ) : (
                                <div 
                                  className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                                  style={{ backgroundColor: getAvatarColor(testimonial.author_name) }}
                                >
                                  {getInitials(testimonial.author_name)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-base sm:text-sm font-medium text-gray-800">{testimonial.author_name}</span>
                                  <StarRating rating={testimonial.rating} />
                                </div>
                                <p className="text-base sm:text-sm text-gray-600 mt-0.5">"{testimonial.content}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${primaryColor}15` }}>
                  <Clock className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Aguardando Pagamento</h2>
                <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o código PIX</p>
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
          </div>
        )}
      </main>


      {/* Floating WhatsApp Button */}
      {config?.show_whatsapp_button && config?.whatsapp_number && (
        <a
          href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#128C7E] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="Fale pelo WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-white fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
