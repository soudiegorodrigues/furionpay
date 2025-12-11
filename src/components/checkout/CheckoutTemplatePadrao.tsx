import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, Lock, CreditCard, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";

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
}: CheckoutTemplateProps) {
  const primaryColor = config?.primary_color || "#16A34A";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Countdown Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div 
          className="py-3 text-center text-white font-medium"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Oferta expira em: {formatCountdown(countdown)}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm text-muted-foreground">Pagamento Seguro</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            SSL
          </Badge>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            {step === "form" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
                    Finalizar Compra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Dados do comprador
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Nome completo *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>

                    {config?.require_email_confirmation && (
                      <div className="space-y-2">
                        <Label htmlFor="emailConfirm">Confirmar E-mail *</Label>
                        <Input
                          id="emailConfirm"
                          type="email"
                          value={formData.emailConfirm}
                          onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                          placeholder="Confirme seu e-mail"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(config?.require_phone !== false) && (
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Telefone {config?.require_phone && "*"}
                          </Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      )}
                      
                      {config?.require_cpf && (
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF *</Label>
                          <Input
                            id="cpf"
                            value={formData.cpf}
                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                            placeholder="000.000.000-00"
                          />
                        </div>
                      )}
                    </div>

                    {config?.require_birthdate && (
                      <div className="space-y-2">
                        <Label htmlFor="birthdate" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data de nascimento *
                        </Label>
                        <Input
                          id="birthdate"
                          type="date"
                          value={formData.birthdate}
                          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                        />
                      </div>
                    )}

                    {config?.require_address && (
                      <div className="space-y-2">
                        <Label htmlFor="address" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Endereço *
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Seu endereço completo"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Forma de pagamento
                    </h3>
                    
                    <div 
                      className="p-4 border-2 rounded-lg"
                      style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}10` }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${primaryColor}20` }}
                        >
                          <img src="/pix-logo.png" alt="PIX" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <div>
                          <p className="font-medium">PIX</p>
                          <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                        </div>
                        <CheckCircle className="h-5 w-5 ml-auto" style={{ color: primaryColor }} />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={onGeneratePix}
                    disabled={isGeneratingPix}
                    className="w-full h-12 text-lg gap-2"
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isGeneratingPix ? "Gerando PIX..." : (
                      <>
                        <Lock className="h-4 w-4" />
                        {config?.custom_button_text || `Pagar ${formatPrice(offer.price)}`}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao clicar em "Pagar", você concorda com os termos de uso.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                    Aguardando Pagamento
                  </CardTitle>
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
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  {product?.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{offer.name}</h3>
                    {product?.name && product.name !== offer.name && (
                      <p className="text-sm text-muted-foreground">{product.name}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(offer.price)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span style={{ color: primaryColor }}>{formatPrice(offer.price)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Compra 100% segura</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span>Dados protegidos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Aprovação instantânea via PIX</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="container max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Pagamento processado com segurança</p>
        </div>
      </footer>
    </div>
  );
}
