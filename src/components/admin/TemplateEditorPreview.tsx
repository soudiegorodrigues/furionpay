import { TemplateConfig } from "./TemplateEditor";
import { CreditCard, Shield, Lock, Clock, User, Mail, Phone, FileText, CheckCircle } from "lucide-react";

interface TemplateEditorPreviewProps {
  config: TemplateConfig;
  previewMode: "desktop" | "mobile";
}

export function TemplateEditorPreview({ config, previewMode }: TemplateEditorPreviewProps) {
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? false;

  const borderRadius = settings.borderRadius || "8px";

  return (
    <div 
      className="min-h-[600px] shadow-xl rounded-lg overflow-hidden border"
      style={{ 
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {/* Header */}
      {isComponentEnabled("header") && (
        <div 
          className="p-4 border-b"
          style={{ 
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          }}
        >
          <div className="flex items-center justify-between">
            {settings.showLogo && settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : settings.showLogo ? (
              <div 
                className="h-8 w-32 rounded flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: colors.primary, color: colors.buttonText }}
              >
                SUA LOGO
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.mutedText }}>
              <Shield className="h-3.5 w-3.5" />
              <span>Ambiente Seguro</span>
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 ${previewMode === "desktop" ? "flex gap-6" : "space-y-4"}`}>
        {/* Left Column - Form */}
        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>
              {labels.checkoutTitle}
            </h1>
            {labels.checkoutSubtitle && (
              <p className="text-sm mt-1" style={{ color: colors.mutedText }}>
                {labels.checkoutSubtitle}
              </p>
            )}
          </div>

          {/* Countdown */}
          {isComponentEnabled("countdown") && (
            <div 
              className="mb-4 p-3 rounded-lg flex items-center gap-2"
              style={{ 
                backgroundColor: `${colors.primary}15`,
                borderRadius,
              }}
            >
              <Clock className="h-4 w-4" style={{ color: colors.primary }} />
              <span className="text-sm font-medium" style={{ color: colors.primary }}>
                Oferta expira em: 14:59
              </span>
            </div>
          )}

          {/* Buyer Form */}
          {isComponentEnabled("buyerForm") && (
            <div 
              className="p-4 mb-4 border"
              style={{ 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderRadius,
              }}
            >
              <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                <User className="h-4 w-4" style={{ color: colors.primary }} />
                {labels.buyerSectionTitle}
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: colors.mutedText }}>
                    Nome completo
                  </label>
                  <div 
                    className="h-10 px-3 flex items-center border rounded-md"
                    style={{ 
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius,
                    }}
                  >
                    <span className="text-sm" style={{ color: colors.mutedText }}>João Silva</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: colors.mutedText }}>
                    E-mail
                  </label>
                  <div 
                    className="h-10 px-3 flex items-center border rounded-md"
                    style={{ 
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius,
                    }}
                  >
                    <span className="text-sm" style={{ color: colors.mutedText }}>joao@email.com</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: colors.mutedText }}>
                    Telefone
                  </label>
                  <div 
                    className="h-10 px-3 flex items-center border rounded-md"
                    style={{ 
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius,
                    }}
                  >
                    <span className="text-sm" style={{ color: colors.mutedText }}>(11) 99999-9999</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Section */}
          {isComponentEnabled("payment") && (
            <div 
              className="p-4 border"
              style={{ 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderRadius,
              }}
            >
              <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                <CreditCard className="h-4 w-4" style={{ color: colors.primary }} />
                {labels.paymentSectionTitle}
              </h2>
              
              <div 
                className="p-3 border-2 rounded-lg flex items-center gap-3 cursor-pointer"
                style={{ 
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                  borderRadius,
                }}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <CheckCircle className="h-3 w-3" style={{ color: colors.buttonText }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: colors.text }}>PIX</p>
                  <p className="text-xs" style={{ color: colors.mutedText }}>Aprovação imediata</p>
                </div>
                <div 
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                >
                  -5%
                </div>
              </div>

              <button 
                className="w-full mt-4 h-12 font-semibold rounded-lg transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: colors.primary,
                  color: colors.buttonText,
                  borderRadius,
                }}
              >
                {labels.buttonText}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Product Summary */}
        {previewMode === "desktop" && isComponentEnabled("productInfo") && (
          <div className="w-80 shrink-0">
            <div 
              className="p-4 border sticky top-4"
              style={{ 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderRadius,
              }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: colors.text }}>
                Resumo do Pedido
              </h3>
              
              {settings.showProductImage && (
                <div 
                  className="aspect-video rounded-lg mb-3 flex items-center justify-center"
                  style={{ 
                    backgroundColor: colors.background,
                    borderRadius,
                  }}
                >
                  <FileText className="h-8 w-8" style={{ color: colors.mutedText }} />
                </div>
              )}
              
              <p className="font-medium text-sm" style={{ color: colors.text }}>
                Nome do Produto
              </p>
              <p className="text-xs mt-1" style={{ color: colors.mutedText }}>
                Descrição do produto aqui
              </p>
              
              <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: colors.mutedText }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: colors.primary }}>
                    R$ 97,00
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Testimonials */}
      {isComponentEnabled("testimonials") && (
        <div className="px-4 pb-4">
          <div 
            className="p-4 border"
            style={{ 
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              borderRadius,
            }}
          >
            <h3 className="font-semibold text-sm mb-3" style={{ color: colors.text }}>
              O que nossos clientes dizem
            </h3>
            <div className="flex gap-3">
              {[1, 2].map((i) => (
                <div 
                  key={i}
                  className="flex-1 p-3 rounded-lg"
                  style={{ 
                    backgroundColor: colors.background,
                    borderRadius,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                    >
                      {i === 1 ? "M" : "A"}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: colors.text }}>
                        {i === 1 ? "Maria S." : "André L."}
                      </p>
                      <p className="text-[10px]" style={{ color: colors.mutedText }}>⭐⭐⭐⭐⭐</p>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: colors.mutedText }}>
                    "Produto excelente, recomendo!"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Badges */}
      {isComponentEnabled("securityBadges") && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5" style={{ color: colors.mutedText }}>
              <Shield className="h-4 w-4" />
              <span className="text-xs">{labels.securityBadgeText}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: colors.mutedText }}>
              <Lock className="h-4 w-4" />
              <span className="text-xs">SSL Certificado</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {isComponentEnabled("footer") && (
        <div 
          className="p-4 border-t text-center"
          style={{ borderColor: colors.border }}
        >
          <p className="text-xs" style={{ color: colors.mutedText }}>
            {labels.footerText}
          </p>
        </div>
      )}
    </div>
  );
}
