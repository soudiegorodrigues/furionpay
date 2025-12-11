import { TemplateConfig } from "./TemplateEditor";
import { CreditCard, Shield, Lock, Clock, User, Mail, Phone, FileText, CheckCircle, Star, Truck, Gift, Zap, Users, TrendingUp, Play, Award } from "lucide-react";

interface TemplateEditorPreviewProps {
  config: TemplateConfig;
  previewMode: "desktop" | "mobile";
}

// Preview para Template Padrão (Kiwify style)
function PreviewPadrao({ previewMode }: { previewMode: "desktop" | "mobile" }) {
  return (
    <div className="min-h-[600px] bg-gray-50 rounded-lg overflow-hidden border shadow-xl">
      {/* Header */}
      <div className="bg-white p-3 border-b flex items-center justify-between">
        <div className="h-6 w-24 bg-emerald-500 rounded flex items-center justify-center text-white text-[10px] font-bold">
          LOGO
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Shield className="h-3 w-3" />
          <span>Compra Segura</span>
        </div>
      </div>

      {/* Social proof banner */}
      <div className="bg-emerald-50 p-2 text-center border-b">
        <span className="text-[10px] text-emerald-700 font-medium">
          🔥 +1.847 pessoas compraram nas últimas 24h
        </span>
      </div>

      <div className={`p-3 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Step 1 */}
          <div className="bg-white rounded-lg p-3 border mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">1</div>
              <span className="text-xs font-semibold text-gray-800">Seus dados</span>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded border text-[10px] px-2 flex items-center text-gray-400">Nome completo</div>
              <div className="h-8 bg-gray-100 rounded border text-[10px] px-2 flex items-center text-gray-400">E-mail</div>
              <div className="h-8 bg-gray-100 rounded border text-[10px] px-2 flex items-center text-gray-400">CPF</div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">2</div>
              <span className="text-xs font-semibold text-gray-800">Pagamento</span>
            </div>
            <div className="p-2 border-2 border-emerald-500 rounded-lg bg-emerald-50 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-emerald-700">PIX</span>
              <span className="ml-auto text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded">-5%</span>
            </div>
            <button className="w-full mt-3 h-10 bg-emerald-500 text-white text-xs font-bold rounded-lg">
              FINALIZAR COMPRA
            </button>
          </div>
        </div>

        {/* Product Summary */}
        {previewMode === "desktop" && (
          <div className="w-56 shrink-0">
            <div className="bg-white rounded-lg p-3 border sticky top-3">
              <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Curso Completo</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Acesso vitalício</p>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-[10px] text-gray-500">Total</span>
                  <span className="text-sm font-bold text-emerald-600">R$ 97,00</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security footer */}
      <div className="p-2 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1"><Shield className="h-3 w-3" />Seguro</div>
          <div className="flex items-center gap-1"><Lock className="h-3 w-3" />SSL</div>
          <div className="flex items-center gap-1"><Award className="h-3 w-3" />Garantia 7 dias</div>
        </div>
      </div>
    </div>
  );
}

// Preview para Template Vega (Hotmart style - Dark Premium)
function PreviewVega({ previewMode }: { previewMode: "desktop" | "mobile" }) {
  return (
    <div className="min-h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="h-6 w-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
          VEGA
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Lock className="h-3 w-3" />
          <span>256-bit SSL</span>
        </div>
      </div>

      {/* Urgency banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 p-2 text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] text-white font-medium">
          <Clock className="h-3 w-3 animate-pulse" />
          <span>OFERTA EXPIRA EM: 14:59</span>
        </div>
      </div>

      <div className={`p-4 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Avatar social proof */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 border-2 border-gray-900 flex items-center justify-center text-[8px] text-white font-bold">
                  {["M", "J", "A"][i - 1]}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-gray-400">+2.453 já compraram</span>
          </div>

          {/* Form */}
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 mb-3">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
              <User className="h-3 w-3 text-violet-400" />
              Identificação
            </h3>
            <div className="space-y-2">
              <div className="h-9 bg-gray-800 rounded-lg border border-gray-700 text-[10px] px-3 flex items-center text-gray-500">Nome completo</div>
              <div className="h-9 bg-gray-800 rounded-lg border border-gray-700 text-[10px] px-3 flex items-center text-gray-500">Seu melhor e-mail</div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
            <div className="p-2.5 border-2 border-violet-500 rounded-lg bg-violet-500/10 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-medium text-white">PIX Instantâneo</span>
                <p className="text-[8px] text-gray-400">Liberação imediata</p>
              </div>
              <span className="text-[8px] bg-gradient-to-r from-violet-500 to-purple-600 text-white px-1.5 py-0.5 rounded font-bold">-10%</span>
            </div>
            <button className="w-full mt-3 h-11 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30">
              <Zap className="h-3.5 w-3.5" />
              GARANTIR MINHA VAGA
            </button>
          </div>
        </div>

        {/* Product */}
        {previewMode === "desktop" && (
          <div className="w-52 shrink-0">
            <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
              <div className="aspect-video bg-gradient-to-br from-violet-900 to-purple-900 rounded-lg mb-2 flex items-center justify-center">
                <Play className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs font-semibold text-white">Mentoria Premium</p>
              <p className="text-[10px] text-gray-400 mt-0.5">12 semanas de acompanhamento</p>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 line-through">R$ 497</span>
                  <span className="text-sm font-bold text-violet-400">R$ 297</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Preview para Template Afilia (E-commerce style)
function PreviewAfilia({ previewMode }: { previewMode: "desktop" | "mobile" }) {
  return (
    <div className="min-h-[600px] bg-white rounded-lg overflow-hidden border shadow-xl">
      {/* Free shipping banner */}
      <div className="bg-blue-600 p-1.5 text-center">
        <span className="text-[10px] text-white font-medium flex items-center justify-center gap-1">
          <Truck className="h-3 w-3" />
          FRETE GRÁTIS para todo Brasil
        </span>
      </div>

      {/* Header */}
      <div className="bg-yellow-400 p-2 flex items-center justify-between">
        <div className="text-gray-900 font-black text-sm">LOJA</div>
        <div className="flex items-center gap-1 text-[10px] text-gray-800">
          <Shield className="h-3 w-3" />
          Compra Garantida
        </div>
      </div>

      <div className={`p-3 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        {/* Product column */}
        {previewMode === "desktop" && (
          <div className="w-48 shrink-0">
            <div className="bg-gray-50 rounded-lg p-2 border">
              <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center relative">
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="absolute top-1 left-1 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">-30%</span>
              </div>
              <p className="text-xs font-bold text-gray-900">Kit Completo</p>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-[9px] text-gray-500">(2.847)</span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-gray-500 line-through">R$ 199,90</span>
                <span className="text-sm font-bold text-blue-600 ml-1">R$ 139,90</span>
              </div>
            </div>
          </div>
        )}

        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* PIX discount */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">PIX</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-green-700">5% OFF no PIX</p>
              <p className="text-[8px] text-green-600">Aprovação instantânea</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-gray-50 rounded-lg p-3 border mb-3">
            <h3 className="text-xs font-bold text-gray-800 mb-2">Dados de entrega</h3>
            <div className="space-y-2">
              <div className="h-8 bg-white rounded border text-[10px] px-2 flex items-center text-gray-400">Nome completo</div>
              <div className="h-8 bg-white rounded border text-[10px] px-2 flex items-center text-gray-400">E-mail</div>
              <div className="h-8 bg-white rounded border text-[10px] px-2 flex items-center text-gray-400">CEP</div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="p-2 border-2 border-blue-500 rounded bg-blue-50 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-medium text-blue-700">PIX</span>
            </div>
            <button className="w-full mt-3 h-10 bg-blue-600 text-white text-xs font-bold rounded">
              COMPRAR AGORA
            </button>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="p-2 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-[9px] text-gray-500">
          <div className="flex items-center gap-1"><Shield className="h-3 w-3 text-green-500" />Compra Segura</div>
          <div className="flex items-center gap-1"><Truck className="h-3 w-3 text-blue-500" />Entrega Grátis</div>
          <div className="flex items-center gap-1"><Award className="h-3 w-3 text-yellow-500" />Garantia</div>
        </div>
      </div>
    </div>
  );
}

// Preview para Template Multistep (Eduzz style)
function PreviewMultistep({ previewMode }: { previewMode: "desktop" | "mobile" }) {
  return (
    <div className="min-h-[600px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg overflow-hidden border shadow-xl">
      {/* Progress header */}
      <div className="bg-white p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded flex items-center justify-center text-white text-[8px] font-bold">
            STEP
          </div>
          <span className="text-[10px] text-gray-500">Passo 2 de 3</span>
        </div>
        <div className="flex gap-1">
          <div className="h-1 flex-1 bg-blue-500 rounded-full" />
          <div className="h-1 flex-1 bg-blue-500 rounded-full" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        </div>
      </div>

      <div className="p-4">
        {/* Current step */}
        <div className="bg-white rounded-xl p-4 border shadow-sm mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Dados Pessoais</h3>
              <p className="text-[10px] text-gray-500">Preencha suas informações</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-10 bg-gray-50 rounded-lg border text-[10px] px-3 flex items-center text-gray-400">Nome completo</div>
            <div className="h-10 bg-gray-50 rounded-lg border text-[10px] px-3 flex items-center text-gray-400">E-mail</div>
            <div className="h-10 bg-gray-50 rounded-lg border text-[10px] px-3 flex items-center text-gray-400">Telefone com DDD</div>
          </div>

          <button className="w-full mt-4 h-11 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2">
            CONTINUAR
            <span>→</span>
          </button>
        </div>

        {/* Bonus section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">BÔNUS EXCLUSIVOS</span>
          </div>
          <div className="space-y-1.5">
            {["Acesso VIP ao grupo", "Planilhas exclusivas", "Suporte prioritário"].map((bonus, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-amber-700">
                <CheckCircle className="h-3 w-3 text-amber-500" />
                <span>{bonus}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="flex -space-x-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-white flex items-center justify-center text-[7px] text-white font-bold">
                {["M", "J", "A", "P"][i - 1]}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-500">+847 alunos já inscritos</span>
        </div>
      </div>

      {/* Trust footer */}
      <div className="mt-auto p-3 bg-white border-t">
        <div className="flex items-center justify-center gap-4 text-[9px] text-gray-500">
          <div className="flex items-center gap-1"><Lock className="h-3 w-3" />Seguro</div>
          <div className="flex items-center gap-1"><Award className="h-3 w-3" />7 dias garantia</div>
        </div>
      </div>
    </div>
  );
}

export function TemplateEditorPreview({ config, previewMode }: TemplateEditorPreviewProps) {
  // Determine which preview to show based on template type
  const templateType = (config.type || "").toLowerCase();
  
  if (templateType.includes("vega")) {
    return <PreviewVega previewMode={previewMode} />;
  }
  
  if (templateType.includes("afilia")) {
    return <PreviewAfilia previewMode={previewMode} />;
  }
  
  if (templateType.includes("multistep") || templateType.includes("etapa")) {
    return <PreviewMultistep previewMode={previewMode} />;
  }
  
  if (templateType.includes("padr") || templateType.includes("padrao") || templateType.includes("default")) {
    return <PreviewPadrao previewMode={previewMode} />;
  }

  // Fallback: use original generic preview for custom templates
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