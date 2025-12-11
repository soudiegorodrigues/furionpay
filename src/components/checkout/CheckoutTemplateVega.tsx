import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, Sparkles, Zap
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";

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
}: CheckoutTemplateProps) {
  const primaryColor = config?.primary_color || "#8B5CF6";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Countdown Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div className="py-3 text-center font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>Oferta especial expira em: {formatCountdown(countdown)}</span>
            <Zap className="h-4 w-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5 sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-white/80 font-medium">Checkout Seguro</span>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Shield className="h-3 w-3 mr-1" />
            256-bit SSL
          </Badge>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Card */}
            <div className="order-2 lg:order-1">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="relative">
                  {product?.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                      <ShoppingCart className="h-16 w-16 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-white mb-1">{offer.name}</h2>
                    {product?.description && (
                      <p className="text-white/70 text-sm line-clamp-2">{product.description}</p>
                    )}
                  </div>
                </div>
                
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-sm">Valor total</p>
                      <p className="text-3xl font-bold text-white">{formatPrice(offer.price)}</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      PIX Instantâneo
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <Shield className="h-5 w-5 text-green-400 mx-auto mb-1" />
                      <p className="text-xs text-white/60">Seguro</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <Lock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                      <p className="text-xs text-white/60">Criptografado</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <Zap className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-xs text-white/60">Instantâneo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Card */}
            <div className="order-1 lg:order-2">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white">Complete sua compra</h2>
                    <p className="text-white/50 text-sm mt-1">Preencha seus dados abaixo</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/80 flex items-center gap-1">
                        <User className="h-3 w-3" /> Nome completo *
                      </Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/80">E-mail *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>

                    {config?.require_email_confirmation && (
                      <div className="space-y-2">
                        <Label className="text-white/80">Confirmar E-mail *</Label>
                        <Input
                          type="email"
                          value={formData.emailConfirm}
                          onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                          placeholder="Confirme seu e-mail"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}

                    {(config?.require_phone !== false) && (
                      <div className="space-y-2">
                        <Label className="text-white/80 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Telefone {config?.require_phone && "*"}
                        </Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}

                    {config?.require_cpf && (
                      <div className="space-y-2">
                        <Label className="text-white/80">CPF *</Label>
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}

                    {config?.require_birthdate && (
                      <div className="space-y-2">
                        <Label className="text-white/80 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data de nascimento *
                        </Label>
                        <Input
                          type="date"
                          value={formData.birthdate}
                          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    )}

                    {config?.require_address && (
                      <div className="space-y-2">
                        <Label className="text-white/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Endereço *
                        </Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Seu endereço"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
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
                        {config?.custom_button_text || `Pagar ${formatPrice(offer.price)}`}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-white/40">
                    🔒 Pagamento 100% seguro e criptografado
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Aguardando Pagamento</h2>
                  <p className="text-white/50 text-sm mt-1">Escaneie o QR Code ou copie o código PIX</p>
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
        <div className="container max-w-5xl mx-auto px-4 py-6 text-center text-sm text-white/40">
          <p>Pagamento processado com segurança via PIX</p>
        </div>
      </footer>
    </div>
  );
}
