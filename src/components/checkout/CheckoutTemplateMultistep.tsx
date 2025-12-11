import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Lock, CheckCircle, Shield, Clock, MapPin, Phone, Calendar, User, ChevronRight, ArrowLeft
} from "lucide-react";
import { PixQRCode } from "@/components/PixQRCode";
import { CheckoutTemplateProps } from "./types";
import { cn } from "@/lib/utils";

type MultiStep = "info" | "contact" | "payment";

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
}: CheckoutTemplateProps) {
  const [currentStep, setCurrentStep] = useState<MultiStep>("info");
  const primaryColor = config?.primary_color || "#2563EB";

  const steps: { id: MultiStep; label: string; icon: typeof User }[] = [
    { id: "info", label: "Identificação", icon: User },
    { id: "contact", label: "Contato", icon: Phone },
    { id: "payment", label: "Pagamento", icon: Lock },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    if (currentStep === "info") {
      return formData.name.trim().length > 0 && formData.email.includes("@");
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Clock className="h-8 w-8" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Aguardando Pagamento</h2>
              <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code para pagar</p>
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
    <div className="min-h-screen bg-gray-100">
      {/* Countdown Banner */}
      {config?.show_countdown && countdown !== null && countdown > 0 && (
        <div 
          className="py-2.5 text-center text-white text-sm font-medium"
          style={{ backgroundColor: primaryColor }}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Oferta expira em: {formatCountdown(countdown)}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Checkout Seguro
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
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
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isActive && "ring-4",
                        isCompleted ? "bg-green-500 text-white" : isActive ? "text-white" : "bg-gray-200 text-gray-500"
                      )}
                      style={{ 
                        backgroundColor: isActive ? primaryColor : isCompleted ? undefined : undefined,
                        boxShadow: isActive ? `0 0 0 4px ${primaryColor}30` : undefined
                      }}
                    >
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-xs mt-1.5 font-medium",
                      isActive ? "text-gray-900" : "text-gray-500"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "h-0.5 w-full mx-2 rounded",
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
        {/* Product Summary */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {product?.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{offer.name}</h3>
                <p className="text-2xl font-bold mt-1" style={{ color: primaryColor }}>
                  {formatPrice(offer.price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {currentStep === "info" && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Seus dados pessoais</h2>
                  <p className="text-sm text-gray-500">Informe seus dados para continuar</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Nome completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome completo"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="h-12"
                  />
                </div>

                {config?.require_email_confirmation && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Confirmar e-mail *</Label>
                    <Input
                      type="email"
                      value={formData.emailConfirm}
                      onChange={(e) => setFormData({ ...formData, emailConfirm: e.target.value })}
                      placeholder="Confirme seu e-mail"
                      className="h-12"
                    />
                  </div>
                )}

                {config?.require_birthdate && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data de nascimento *</Label>
                    <Input
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      className="h-12"
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep === "contact" && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Informações de contato</h2>
                  <p className="text-sm text-gray-500">Como podemos entrar em contato?</p>
                </div>

                {(config?.require_phone !== false) && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Telefone {config?.require_phone && "*"}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="h-12"
                    />
                  </div>
                )}

                {config?.require_cpf && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">CPF *</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="h-12"
                    />
                  </div>
                )}

                {config?.require_address && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Endereço completo *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, número, bairro, cidade"
                      className="h-12"
                    />
                  </div>
                )}

                {!config?.require_phone && !config?.require_cpf && !config?.require_address && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhum dado adicional necessário!</p>
                    <p className="text-sm">Clique em continuar para finalizar</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === "payment" && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Método de pagamento</h2>
                  <p className="text-sm text-gray-500">Selecione como deseja pagar</p>
                </div>

                <div 
                  className="p-4 rounded-lg border-2 flex items-center gap-4"
                  style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <img src="/pix-logo.png" alt="PIX" className="w-7 h-7" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">PIX</p>
                    <p className="text-sm text-gray-500">Aprovação instantânea</p>
                  </div>
                  <CheckCircle className="h-6 w-6" style={{ color: primaryColor }} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(offer.price)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span style={{ color: primaryColor }}>{formatPrice(offer.price)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              {currentIndex > 0 && (
                <Button variant="outline" onClick={prevStep} className="flex-1 h-12">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              
              {currentStep !== "payment" ? (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 h-12"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={onGeneratePix}
                  disabled={isGeneratingPix}
                  className="flex-1 h-12"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isGeneratingPix ? "Gerando PIX..." : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {config?.custom_button_text || `Pagar ${formatPrice(offer.price)}`}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex justify-center gap-6 mt-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-green-600" />
            Compra segura
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-4 w-4 text-green-600" />
            Dados protegidos
          </div>
        </div>
      </main>
    </div>
  );
}
