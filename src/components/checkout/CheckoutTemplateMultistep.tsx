import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, ChevronRight, ArrowLeft, Zap, Gift, Star
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";
import { cn } from "@/lib/utils";
import { AddressFields } from "./AddressFields";
import { CustomVideoPlayer } from "./CustomVideoPlayer";


type MultiStep = "info" | "contact" | "payment";

// Template MULTISTEP - Checkout em Etapas
// Inspirado em: Eduzz, Monetizze, Braip
// Foco em: Reduzir fricção, progressão visual, foco em cada etapa
export function CheckoutTemplateMultistep({
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
  const [currentStep, setCurrentStep] = useState<MultiStep>("info");
  const primaryColor = config?.primary_color || "#8B5CF6";

  const steps: { id: MultiStep; label: string; icon: typeof User }[] = [
    { id: "info", label: "Seus Dados", icon: User },
    { id: "contact", label: "Contato", icon: Phone },
    { id: "payment", label: "Pagamento", icon: Lock },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    if (currentStep === "info") {
      return formData.name.trim().length > 2 && formData.email.includes("@") && formData.email.includes(".");
    }
    if (currentStep === "contact") {
      if (config?.require_phone && !formData.phone.trim()) return false;
      if (config?.require_cpf && !formData.cpf.trim()) return false;
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === "info") setCurrentStep("contact");
    else if (currentStep === "contact") setCurrentStep("payment");
  };

  const prevStep = () => {
    if (currentStep === "contact") setCurrentStep("info");
    else if (currentStep === "payment") setCurrentStep("contact");
  };

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-4 px-6 text-center">
            <h2 className="text-xl font-bold text-white">Aguardando Pagamento</h2>
          </div>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-gray-600 text-sm">Escaneie o QR Code ou copie o código PIX</p>
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      {/* Urgency Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div className="py-3 text-center text-white text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>OFERTA POR TEMPO LIMITADO: {formatCountdown(countdown)}</span>
            <Zap className="h-4 w-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* Header with Progress */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                <Lock className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <span className="font-semibold text-gray-800">Checkout Seguro</span>
            </div>
            <Badge className="bg-green-100 text-green-700 gap-1">
              <Shield className="h-3 w-3" />
              SSL
            </Badge>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === currentStep;
              const isCompleted = index < currentIndex;
              
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                        isCompleted ? "bg-green-500 text-white" : 
                        isActive ? "text-white scale-110" : "bg-gray-100 text-gray-400"
                      )}
                      style={{ 
                        backgroundColor: isActive ? primaryColor : undefined,
                        boxShadow: isActive ? `0 8px 20px ${primaryColor}40` : undefined
                      }}
                    >
                      {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <span className={cn(
                      "text-xs mt-2 font-semibold transition-colors",
                      isActive ? "text-gray-900" : isCompleted ? "text-green-600" : "text-gray-400"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "h-1 w-full mx-3 rounded-full transition-colors",
                      index < currentIndex ? "bg-green-500" : "bg-gray-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6">
        {/* Video Section */}
        {config?.show_video && config?.video_url && (
          <div className="mb-6">
            <CustomVideoPlayer 
              videoUrl={config.video_url}
              posterUrl={config.video_poster_url || product?.image_url || undefined}
              playOverlayUrl={config.video_play_overlay_url || undefined}
              className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg"
            />
          </div>
        )}

        {/* Product Summary */}
        <Card className="mb-6 shadow-lg border-0 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-3 px-4">
            <p className="text-white/90 text-xs font-medium text-center">🎉 Você está a poucos passos de garantir seu acesso!</p>
          </div>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              {product?.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-20 h-20 object-cover rounded-xl shadow-md"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 text-purple-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{offer.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">(4.9)</span>
                </div>
                <p className="text-2xl font-black mt-1" style={{ color: primaryColor }}>
                  {formatPrice(offer.price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            {currentStep === "info" && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Quem é você?</h2>
                  <p className="text-sm text-gray-500 mt-1">Precisamos dessas informações para liberar seu acesso</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Seu nome completo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Digite seu nome completo"
                      className="h-14 text-base rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Seu melhor e-mail *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="h-14 text-base rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-400">Você receberá seu acesso por esse e-mail</p>
                  </div>

                  {config?.require_email_confirmation && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Confirmar e-mail *</Label>
                      <Input
                        type="email"
                        value={formData.emailConfirm}
                        onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                        placeholder="Confirme seu e-mail"
                        className="h-14 text-base rounded-xl border-gray-200"
                      />
                    </div>
                  )}

                  {config?.require_birthdate && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Data de nascimento *</Label>
                      <Input
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                        className="h-14 rounded-xl border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === "contact" && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Como podemos falar com você?</h2>
                  <p className="text-sm text-gray-500 mt-1">Só usaremos para enviar informações importantes</p>
                </div>

                <div className="space-y-4">
                  {(config?.require_phone !== false) && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Telefone {config?.require_phone && "*"}</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="h-14 text-base rounded-xl border-gray-200"
                      />
                    </div>
                  )}

                  {config?.require_cpf && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">CPF *</Label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="h-14 text-base rounded-xl border-gray-200"
                      />
                    </div>
                  )}

                  {config?.require_address && (
                    <AddressFields
                      formData={formData}
                      setFormData={setFormData}
                      inputClassName="h-14 text-base rounded-xl border-gray-200"
                      labelClassName="text-gray-700 font-medium"
                      variant="light"
                    />
                  )}

                  {!config?.require_phone && !config?.require_cpf && !config?.require_address && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-semibold text-gray-800">Tudo certo!</p>
                      <p className="text-sm text-gray-500 mt-1">Clique em continuar para finalizar</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === "payment" && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Último passo!</h2>
                  <p className="text-sm text-gray-500 mt-1">Escolha como deseja pagar</p>
                </div>

                <div 
                  className="p-5 rounded-2xl border-2 flex items-center gap-4"
                  style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#32BCAD]">
                    <img src="/pix-logo.png" alt="PIX" className="w-8 h-8" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-lg">PIX</p>
                      <Badge className="bg-green-100 text-green-700 text-xs">Aprovação Imediata</Badge>
                    </div>
                    <p className="text-sm text-gray-500">Pague e receba acesso na hora</p>
                  </div>
                  <CheckCircle className="h-7 w-7" style={{ color: primaryColor }} />
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-800">{formatPrice(offer.price)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span style={{ color: primaryColor }}>{formatPrice(offer.price)}</span>
                  </div>
                </div>

                {/* Bonus Section */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <Gift className="h-5 w-5" />
                    <span>Bônus exclusivos inclusos!</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">Você também receberá materiais extras após a compra</p>
                </div>

                {/* Testimonials Section */}
                {config?.show_notifications && testimonials && testimonials.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      O que dizem nossos clientes
                    </h4>
                    {testimonials.slice(0, 2).map((testimonial) => (
                      <div key={testimonial.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          {testimonial.author_photo_url ? (
                            <img 
                              src={testimonial.author_photo_url} 
                              alt={testimonial.author_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
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
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
              {currentIndex > 0 && (
                <Button variant="outline" onClick={prevStep} className="flex-1 h-14 rounded-xl text-base">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Voltar
                </Button>
              )}
              
              {currentStep !== "payment" ? (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 h-14 rounded-xl text-base font-bold shadow-lg transition-all hover:shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={onGeneratePix}
                  disabled={isGeneratingPix}
                  className="flex-1 h-14 rounded-xl text-base font-bold shadow-lg transition-all hover:shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isGeneratingPix ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gerando PIX...
                    </span>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      {config?.custom_button_text || `GARANTIR ACESSO`}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex justify-center gap-6 mt-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-green-500" />
            Garantia 7 dias
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-green-500" />
            Pagamento seguro
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-green-500" />
            Acesso imediato
          </div>
        </div>
      </main>
    </div>
  );
}
