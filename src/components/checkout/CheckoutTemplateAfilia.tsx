import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, CreditCard, Star
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";

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
}: CheckoutTemplateProps) {
  const primaryColor = config?.primary_color || "#059669";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Countdown Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div 
          className="py-2 text-center text-white text-sm font-medium"
          style={{ backgroundColor: primaryColor }}
        >
          <span>⏰ Oferta por tempo limitado: {formatCountdown(countdown)}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Checkout</p>
              <p className="text-xs text-gray-500">Ambiente seguro</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <Shield className="h-4 w-4 text-green-600" />
              Compra Segura
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <Lock className="h-4 w-4 text-green-600" />
              SSL
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-7 space-y-4">
              {/* Personal Info Card */}
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      1
                    </div>
                    <h2 className="font-semibold text-gray-900">Seus dados</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-gray-700 text-sm">Nome completo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Digite seu nome"
                        className="h-11"
                      />
                    </div>

                    <div className={config?.require_email_confirmation ? "" : "sm:col-span-2"}>
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-sm">E-mail *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="h-11"
                        />
                      </div>
                    </div>

                    {config?.require_email_confirmation && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-sm">Confirmar e-mail *</Label>
                        <Input
                          type="email"
                          value={formData.emailConfirm}
                          onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                          placeholder="Confirme seu e-mail"
                          className="h-11"
                        />
                      </div>
                    )}

                    {(config?.require_phone !== false) && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-sm">Telefone {config?.require_phone && "*"}</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-11"
                        />
                      </div>
                    )}

                    {config?.require_cpf && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-sm">CPF *</Label>
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="h-11"
                        />
                      </div>
                    )}

                    {config?.require_birthdate && (
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-sm">Data de nascimento *</Label>
                        <Input
                          type="date"
                          value={formData.birthdate}
                          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    )}

                    {config?.require_address && (
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-gray-700 text-sm">Endereço completo *</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Rua, número, bairro, cidade"
                          className="h-11"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Card */}
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      2
                    </div>
                    <h2 className="font-semibold text-gray-900">Pagamento</h2>
                  </div>

                  <div 
                    className="p-4 rounded-lg border-2 flex items-center gap-4"
                    style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <img src="/pix-logo.png" alt="PIX" className="w-7 h-7" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">PIX</p>
                      <p className="text-sm text-gray-500">Pagamento instantâneo</p>
                    </div>
                    <CheckCircle className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-12 text-base font-semibold mt-4"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isGeneratingPix ? "Processando..." : (
                      config?.custom_button_text || `Finalizar compra - ${formatPrice(offer.price)}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-5">
              <Card className="shadow-sm sticky top-20">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Resumo do pedido</h2>

                  <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    {product?.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{offer.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">(127)</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900">{formatPrice(offer.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Desconto</span>
                      <span className="text-green-600">-R$ 0,00</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                      {formatPrice(offer.price)}
                    </span>
                  </div>

                  <div className="mt-6 pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Shield className="h-4 w-4 text-green-600" />
                      Garantia de 7 dias
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Lock className="h-4 w-4 text-green-600" />
                      Pagamento 100% seguro
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Acesso imediato
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <Clock className="h-10 w-10 mx-auto mb-2" style={{ color: primaryColor }} />
                  <h2 className="font-semibold text-gray-900">Aguardando pagamento</h2>
                  <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o código</p>
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

      <footer className="bg-white border-t mt-8">
        <div className="container max-w-6xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          Pagamento processado com segurança
        </div>
      </footer>
    </div>
  );
}
