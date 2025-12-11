import { Package, Check, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CheckoutConfig {
  template: string;
  primary_color: string;
  background_color: string;
  show_banners: boolean;
  show_countdown: boolean;
  countdown_minutes: number;
  show_notifications: boolean;
  show_security_badges: boolean;
  show_whatsapp_button: boolean;
  checkout_title: string;
  checkout_subtitle: string;
  buyer_section_title: string;
  payment_section_title: string;
  footer_text: string;
  security_badge_text: string;
  require_phone: boolean;
  require_address: boolean;
  require_birthdate: boolean;
  require_cpf: boolean;
  require_email_confirmation: boolean;
  show_product_image: boolean;
}

interface CheckoutPreviewProps {
  config: CheckoutConfig;
  productName: string;
  productPrice: number;
  productImage?: string | null;
}

export default function CheckoutPreview({ 
  config, 
  productName, 
  productPrice,
  productImage 
}: CheckoutPreviewProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div 
      className="rounded-lg overflow-hidden border"
      style={{ backgroundColor: config.background_color }}
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Title */}
        <h2 className="text-xl font-bold text-foreground">{config.checkout_title}</h2>

        {/* Product Info */}
        <div className="flex items-start gap-3 p-3 bg-card rounded-lg border">
          <div className="w-14 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0">
            {productImage ? (
              <img src={productImage} alt={productName} className="w-full h-full object-cover rounded" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{productName}</p>
            <p style={{ color: config.primary_color }} className="font-bold">
              1 X de {formatPrice(productPrice)}
            </p>
            <p className="text-xs text-muted-foreground">
              ou {formatPrice(productPrice)} à vista
            </p>
          </div>
        </div>

        {/* Buyer Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.primary_color }}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">{config.buyer_section_title}</span>
          </div>
          
          <div className="space-y-3 pl-8">
            <div>
              <label className="text-sm text-muted-foreground">Nome completo</label>
              <Input placeholder="Digite seu nome" disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">E-mail</label>
              <Input placeholder="seu@email.com" disabled className="mt-1" />
            </div>
            {config.require_phone && (
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <Input placeholder="(00) 00000-0000" disabled className="mt-1" />
              </div>
            )}
            {config.require_cpf && (
              <div>
                <label className="text-sm text-muted-foreground">CPF</label>
                <Input placeholder="000.000.000-00" disabled className="mt-1" />
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.primary_color }}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">{config.payment_section_title}</span>
          </div>
          
          <div 
            className="p-3 rounded-lg border-2 flex items-center gap-3 ml-8"
            style={{ borderColor: config.primary_color }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.primary_color }}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">Pix</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full"
          style={{ backgroundColor: config.primary_color }}
          disabled
        >
          Finalizar Compra
        </Button>

        {/* Security Badges */}
        {config.show_security_badges && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>{config.security_badge_text}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Compra Garantida</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {config.footer_text}
        </p>
      </div>
    </div>
  );
}
