import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, CreditCard, Star, Award, Truck, RefreshCw, BadgeCheck
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";
import { AddressFields } from "./AddressFields";
import { BannersCarousel } from "./BannersCarousel";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { supabase } from "@/integrations/supabase/client";


interface Banner {
  id: string;
  image_url: string;
  display_order: number;
}

// Template AFILIA - Checkout estilo E-commerce
// Inspirado em: Mercado Livre, Amazon Brasil, Lojas Americanas
// Foco em: Confiança, clareza, frete grátis, parcelamento
export function CheckoutTemplateAfilia({
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
}: CheckoutTemplateProps) {
  const primaryColor = config?.primary_color || "#3B82F6";
  const [banners, setBanners] = useState<Banner[]>([]);

  // Fetch banners
  useEffect(() => {
    console.log('[BANNERS DEBUG - Afilia] Verificando condições:', {
      show_banners: config?.show_banners,
      product_id: product?.id,
    });
    
    if (!config?.show_banners || !product?.id) {
      console.log('[BANNERS DEBUG - Afilia] Condições não atendidas, pulando fetch');
      return;
    }

    const fetchBanners = async () => {
      console.log('[BANNERS DEBUG - Afilia] Buscando banners para product_id:', product.id);
      
      const { data, error } = await supabase
        .from("checkout_banners")
        .select("id, image_url, display_order")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error('[BANNERS DEBUG - Afilia] Erro ao buscar banners:', error);
        return;
      }
      
      console.log('[BANNERS DEBUG - Afilia] Banners encontrados:', data?.length || 0, data);
      
      if (data) {
        setBanners(data);
      }
    };

    fetchBanners();
  }, [config?.show_banners, product?.id]);

  return (
    <div className="min-h-screen bg-[#EDEDED]">
      {/* Top Bar */}
      <div className="bg-[#FFF159] py-2">
        <div className="container max-w-6xl mx-auto px-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-800">
          <Truck className="h-4 w-4" />
          <span>FRETE GRÁTIS para todo Brasil</span>
          <span className="mx-2">|</span>
          <RefreshCw className="h-4 w-4" />
          <span>Devolução grátis em 7 dias</span>
        </div>
      </div>

      {/* Countdown Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div 
          className="py-2.5 text-center text-white text-sm font-bold"
          style={{ backgroundColor: '#E53935' }}
        >
          <span>⏰ OFERTA RELÂMPAGO: {formatCountdown(countdown)} restantes</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Finalizar Compra</p>
              <p className="text-xs text-gray-500">Ambiente 100% seguro</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <BadgeCheck className="h-5 w-5 text-blue-500" />
              <span className="hidden sm:inline font-medium">Compra Garantida</span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Images Carousel */}
      {config?.show_banners && banners.length > 0 && (
        <div className="container max-w-6xl mx-auto px-4 pt-4">
          <BannersCarousel banners={banners} />
        </div>
      )}

      {/* Video Section */}
      {config?.show_video && config?.video_url && (
        <div className="container max-w-6xl mx-auto px-4 pt-4">
          <CustomVideoPlayer 
            videoUrl={config.video_url}
            posterUrl={config.video_poster_url || product?.image_url || undefined}
            playOverlayUrl={config.video_play_overlay_url || undefined}
            className="w-full aspect-video rounded-xl overflow-hidden shadow-md"
          />
        </div>
      )}

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-7 space-y-4">
              {/* Personal Info Card */}
              <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 py-3 px-5">
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</div>
                    <h2 className="font-bold">Dados pessoais</h2>
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-gray-700 font-medium text-sm">Nome completo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: João da Silva"
                        className="h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className={config?.require_email_confirmation ? "" : "sm:col-span-2"}>
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 font-medium text-sm">E-mail *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    </div>

                    {config?.require_email_confirmation && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 font-medium text-sm">Confirmar e-mail *</Label>
                        <Input
                          type="email"
                          value={formData.emailConfirm}
                          onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                          placeholder="Confirme seu e-mail"
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    )}

                    {(config?.require_phone !== false) && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 font-medium text-sm">Celular {config?.require_phone && "*"}</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    )}

                    {config?.require_cpf && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 font-medium text-sm">CPF *</Label>
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    )}

                    {config?.require_birthdate && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 font-medium text-sm">Data de nascimento *</Label>
                        <Input
                          type="date"
                          value={formData.birthdate}
                          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    )}

                    {config?.require_address && (
                      <div className="sm:col-span-2">
                        <AddressFields
                          formData={formData}
                          setFormData={setFormData}
                          inputClassName="h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          labelClassName="text-gray-700 font-medium text-sm"
                          variant="light"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Card */}
              <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 py-3 px-5">
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</div>
                    <h2 className="font-bold">Forma de pagamento</h2>
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div 
                    className="p-4 rounded-xl border-2 flex items-center gap-4 transition-all cursor-pointer"
                    style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#32BCAD]">
                      <img src="/pix-logo.png" alt="PIX" className="w-8 h-8" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-lg">PIX</p>
                        <Badge className="bg-green-100 text-green-700 text-xs">5% OFF</Badge>
                      </div>
                      <p className="text-sm text-gray-500">Pagamento instantâneo • Aprovação imediata</p>
                    </div>
                    <CheckCircle className="h-7 w-7" style={{ color: primaryColor }} />
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-14 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isGeneratingPix ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processando...
                      </span>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        {config?.custom_button_text || `CONFIRMAR PEDIDO`}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Compra segura</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="h-4 w-4 text-green-500" />
                      <span>Dados protegidos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-5">
              <Card className="shadow-sm border-0 rounded-xl sticky top-20">
                <CardContent className="p-5">
                  <h2 className="font-bold text-gray-900 mb-4 text-lg">Resumo do pedido</h2>

                  <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    {product?.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-blue-100 text-blue-700 text-xs mb-1">MAIS VENDIDO</Badge>
                      <h3 className="font-bold text-gray-900 line-clamp-2">{offer.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">(2.847)</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-700">{formatPrice(offer.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Frete</span>
                      <span className="text-green-600 font-medium">GRÁTIS</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Desconto PIX (5%)</span>
                      <span className="text-green-600 font-medium">-{formatPrice(Math.round(offer.price * 0.05))}</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: primaryColor }}>
                        {formatPrice(Math.round(offer.price * 0.95))}
                      </span>
                      <p className="text-xs text-gray-500">à vista no PIX</p>
                    </div>
                  </div>

                  {/* Trust Section */}
                  <div className="mt-6 pt-4 border-t space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Garantia de 7 dias</p>
                        <p className="text-xs text-gray-500">Devolução sem perguntas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Award className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Produto original</p>
                        <p className="text-xs text-gray-500">Qualidade garantida</p>
                      </div>
                    </div>
                  </div>

                  {/* Testimonials Section */}
                  {config?.show_notifications && testimonials && testimonials.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Avaliações de clientes
                      </h4>
                      {testimonials.slice(0, 3).map((testimonial) => (
                        <div key={testimonial.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            {testimonial.author_photo_url ? (
                              <img 
                                src={testimonial.author_photo_url} 
                                alt={testimonial.author_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <p className="text-gray-900 text-sm font-medium">{testimonial.author_name}</p>
                              <div className="flex gap-0.5">
                                {[...Array(testimonial.rating || 5)].map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600 text-xs line-clamp-2">{testimonial.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg border-0 rounded-xl">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Clock className="h-8 w-8" style={{ color: primaryColor }} />
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg">Aguardando pagamento</h2>
                  <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o código</p>
                </div>
                {pixData && (
                  <PixQRCode
                    pixCode={pixData.pixCode}
                    qrCodeUrl={pixData.qrCode}
                    amount={Math.round(offer.price * 0.95)}
                    transactionId={pixData.transactionId}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="container max-w-6xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          Pagamento processado com segurança • Seus dados estão protegidos
        </div>
      </footer>
    </div>
  );
}
