import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, Sparkles, Zap, Star, Users, TrendingUp
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

// Template VEGA - Checkout Premium/Dark Mode
// Inspirado em: Hotmart, alta conversão para infoprodutos de alto ticket
// Foco em: Visual premium, urgência, prova social
export function CheckoutTemplateVega({
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
  const primaryColor = config?.primary_color || "#10B981";
  const [banners, setBanners] = useState<Banner[]>([]);

  // Fetch banners
  useEffect(() => {
    console.log('[BANNERS DEBUG - Vega] Verificando condições:', {
      show_banners: config?.show_banners,
      product_id: product?.id,
    });
    
    if (!config?.show_banners || !product?.id) {
      console.log('[BANNERS DEBUG - Vega] Condições não atendidas, pulando fetch');
      return;
    }

    const fetchBanners = async () => {
      console.log('[BANNERS DEBUG - Vega] Buscando banners para product_id:', product.id);
      
      const { data, error } = await supabase
        .from("checkout_banners")
        .select("id, image_url, display_order")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error('[BANNERS DEBUG - Vega] Erro ao buscar banners:', error);
        return;
      }
      
      console.log('[BANNERS DEBUG - Vega] Banners encontrados:', data?.length || 0, data);
      
      if (data) {
        setBanners(data);
      }
    };

    fetchBanners();
  }, [config?.show_banners, product?.id]);

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Urgency Banner with Animation */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div 
          className="py-3 text-center font-bold text-white relative overflow-hidden"
          style={{ backgroundColor: config?.countdown_color || '#dc2626' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="flex items-center justify-center gap-2 relative">
            <span className="text-xl">⚡</span>
            <span>{config?.countdown_text || 'ÚLTIMAS VAGAS! Oferta expira em:'} {formatCountdown(countdown)}</span>
            <span className="text-xl">⚡</span>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold">Checkout Seguro</span>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Shield className="h-3 w-3" />
                Ambiente criptografado
              </div>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
            <Lock className="h-3 w-3" />
            256-bit SSL
          </Badge>
        </div>
      </header>

      {/* Banner Images Carousel */}
      {config?.show_banners && banners.length > 0 && (
        <div className="container max-w-5xl mx-auto px-4 pt-6">
          <BannersCarousel banners={banners} />
        </div>
      )}

      {/* Video Section */}
      {config?.show_video && config?.video_url && (
        <div className="container max-w-5xl mx-auto px-4 pt-6">
          <CustomVideoPlayer 
            videoUrl={config.video_url}
            posterUrl={config.video_poster_url || product?.image_url || undefined}
            playOverlayUrl={config.video_play_overlay_url || undefined}
            className="w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10"
          />
        </div>
      )}

      <main className="container max-w-5xl mx-auto px-4 py-8">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Hero Card */}
            <div className="order-2 lg:order-1">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10 overflow-hidden">
                <div className="relative">
                  {product?.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-56 object-cover"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 flex items-center justify-center">
                      <ShoppingCart className="h-16 w-16 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-500 text-white border-0 animate-pulse">
                      🔥 OFERTA ESPECIAL
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-white mb-2">{offer.name}</h2>
                    {product?.description && (
                      <p className="text-white/70 text-sm line-clamp-2">{product.description}</p>
                    )}
                  </div>
                </div>
                
                <CardContent className="p-6 space-y-5">
                  {/* Price Section */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-gray-400 text-sm line-through">De R$ {((offer.price * 1.5) / 100).toFixed(2).replace('.', ',')}</p>
                      <p className="text-4xl font-black text-white">{formatPrice(offer.price)}</p>
                      <p className="text-emerald-400 text-sm font-medium">ou até 12x no cartão</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 text-sm py-1.5">
                      -40% OFF
                    </Badge>
                  </div>

                  {/* Social Proof */}
                  <div className="flex items-center gap-4 py-4 border-t border-b border-white/10">
                    <div className="flex -space-x-2">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-900 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">+2.847 alunos</p>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-gray-400 text-xs ml-1">4.9</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <Shield className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Garantia 7 dias</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <Zap className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">{config?.delivery_description || "Acesso imediato"}</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <TrendingUp className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Suporte VIP</p>
                    </div>
                  </div>

                  {/* Testimonials Section */}
                  {config?.show_notifications && testimonials && testimonials.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-400" />
                        O que nossos clientes dizem
                      </h4>
                      {testimonials.slice(0, 3).map((testimonial) => (
                        <div key={testimonial.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            {testimonial.author_photo_url ? (
                              <img 
                                src={testimonial.author_photo_url} 
                                alt={testimonial.author_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="text-white text-sm font-medium">{testimonial.author_name}</p>
                              <div className="flex gap-0.5">
                                {[...Array(testimonial.rating || 5)].map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-400 text-xs line-clamp-2">{testimonial.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Form Card */}
            <div className="order-1 lg:order-2">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center mb-6">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-3">
                      <Users className="h-3 w-3 mr-1" />
                      12 pessoas comprando agora
                    </Badge>
                    <h2 className="text-xl font-bold text-white">Complete sua compra</h2>
                    <p className="text-gray-400 text-sm mt-1">Preencha seus dados para ter acesso</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-medium">Nome completo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Digite seu nome"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 font-medium">Seu melhor e-mail *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    {config?.require_email_confirmation && (
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-medium">Confirmar E-mail *</Label>
                        <Input
                          type="email"
                          value={formData.emailConfirm}
                          onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                          placeholder="Confirme seu e-mail"
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}

                    {(config?.require_phone !== false) && (
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-medium">Telefone {config?.require_phone && "*"}</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}

                    {config?.require_cpf && (
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-medium">CPF *</Label>
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}

                    {config?.require_birthdate && (
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-medium">Data de nascimento *</Label>
                        <Input
                          type="date"
                          value={formData.birthdate}
                          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                          className="h-12 bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    )}

                    {config?.require_address && (
                      <AddressFields
                        formData={formData}
                        setFormData={setFormData}
                        variant="dark"
                      />
                    )}
                  </div>

                  {/* PIX Payment */}
                  <div className="p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#32BCAD] flex items-center justify-center">
                        <img src="/pix-logo.png" alt="PIX" className="w-7 h-7" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">PIX</p>
                        <p className="text-xs text-gray-400">Aprovação instantânea</p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-14 text-lg font-black bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
                    size="lg"
                  >
                    {isGeneratingPix ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando PIX...
                      </span>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        {config?.custom_button_text || `GARANTIR MINHA VAGA`}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Lock className="h-3 w-3" />
                    <span>Pagamento 100% seguro e criptografado</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Aguardando Pagamento</h2>
                  <p className="text-gray-400 text-sm mt-1">Escaneie o QR Code ou copie o código PIX</p>
                </div>
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

      <footer className="border-t border-white/10 mt-12">
        <div className="container max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Pagamento processado com segurança via PIX</p>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
