import { TemplateConfig } from "./TemplateEditor";
import { CreditCard, Shield, Lock, Clock, User, Mail, Phone, FileText, CheckCircle, Star, Truck, Gift, Zap, Users, TrendingUp, Play, Award, EyeOff } from "lucide-react";

interface TemplateEditorPreviewProps {
  config: TemplateConfig;
  previewMode: "desktop" | "mobile";
}

// Placeholder component for disabled blocks
function DisabledPlaceholder({ name }: { name: string }) {
  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-100/50 dark:bg-gray-800/30 flex items-center justify-center gap-3 my-2">
      <EyeOff className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-400 font-medium">{name}</span>
      <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">Desativado</span>
    </div>
  );
}

// Preview para Template Padrão (Kiwify style)
function PreviewPadrao({ config, previewMode }: { config: TemplateConfig; previewMode: "desktop" | "mobile" }) {
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? true;

  return (
    <div 
      className="min-h-[600px] rounded-lg overflow-hidden border shadow-xl"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      {isComponentEnabled("header") && (
        <div className="p-3 border-b flex items-center justify-between" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          {settings.showLogo && settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-6 object-contain" />
          ) : (
            <div className="h-6 w-24 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>
              LOGO
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.mutedText }}>
            <Shield className="h-3 w-3" />
            <span>{labels.securityBadgeText}</span>
          </div>
        </div>
      )}

      {/* Social proof banner */}
      <div className="p-2 text-center border-b" style={{ backgroundColor: `${colors.primary}15`, borderColor: colors.border }}>
        <span className="text-[10px] font-medium" style={{ color: colors.primary }}>
          🔥 +1.847 pessoas compraram nas últimas 24h
        </span>
      </div>

      {/* Countdown */}
      {isComponentEnabled("countdown") && (
        <div className="p-2 text-center flex items-center justify-center gap-2" style={{ backgroundColor: `${colors.primary}10` }}>
          <Clock className="h-3 w-3" style={{ color: colors.primary }} />
          <span className="text-[10px] font-medium" style={{ color: colors.primary }}>Oferta expira em: 14:59</span>
        </div>
      )}

      <div className={`p-3 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Title */}
          <div className="mb-3">
            <h1 className="text-sm font-bold" style={{ color: colors.text }}>{labels.checkoutTitle}</h1>
            {labels.checkoutSubtitle && (
              <p className="text-[10px] mt-0.5" style={{ color: colors.mutedText }}>{labels.checkoutSubtitle}</p>
            )}
          </div>

          {/* Step 1 - Buyer Form */}
          {isComponentEnabled("buyerForm") && (
            <div className="rounded-lg p-3 border mb-3" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>1</div>
                <span className="text-xs font-semibold" style={{ color: colors.text }}>{labels.buyerSectionTitle}</span>
              </div>
              <div className="space-y-2">
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>Nome completo</div>
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>E-mail</div>
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>CPF</div>
              </div>
            </div>
          )}

          {/* Step 2 - Payment */}
          {isComponentEnabled("payment") && (
            <div className="rounded-lg p-3 border" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>2</div>
                <span className="text-xs font-semibold" style={{ color: colors.text }}>{labels.paymentSectionTitle}</span>
              </div>
              <div className="p-2 border-2 rounded-lg flex items-center gap-2" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <CheckCircle className="h-2.5 w-2.5" style={{ color: colors.buttonText }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: colors.primary }}>PIX</span>
                <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>-5%</span>
              </div>
              <button className="w-full mt-3 h-10 text-xs font-bold rounded-lg" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>
                {labels.buttonText}
              </button>
            </div>
          )}
        </div>

        {/* Product Summary */}
        {previewMode === "desktop" && isComponentEnabled("productInfo") && (
          <div className="w-56 shrink-0">
            <div className="rounded-lg p-3 border sticky top-3" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              {settings.showProductImage && (
                <div className="aspect-video rounded mb-2 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
                  <FileText className="h-6 w-6" style={{ color: colors.mutedText }} />
                </div>
              )}
              <p className="text-xs font-semibold" style={{ color: colors.text }}>Curso Completo</p>
              <p className="text-[10px] mt-0.5" style={{ color: colors.mutedText }}>Acesso vitalício</p>
              <div className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <div className="flex justify-between">
                  <span className="text-[10px]" style={{ color: colors.mutedText }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: colors.primary }}>R$ 97,00</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Testimonials */}
      {isComponentEnabled("testimonials") && (
        <div className="p-3" style={{ backgroundColor: colors.cardBackground }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: colors.text }}>O que dizem nossos clientes</p>
          <div className="flex gap-2">
            {[{ name: "Maria", text: "Excelente!" }, { name: "João", text: "Recomendo!" }].map((t, i) => (
              <div key={i} className="flex-1 p-2 rounded-lg" style={{ backgroundColor: colors.background }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>{t.name[0]}</div>
                  <span className="text-[9px]" style={{ color: colors.text }}>{t.name}</span>
                </div>
                <p className="text-[8px]" style={{ color: colors.mutedText }}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security footer */}
      {isComponentEnabled("securityBadges") && (
        <div className="p-2 border-t" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
          <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: colors.mutedText }}>
            <div className="flex items-center gap-1"><Shield className="h-3 w-3" />{labels.securityBadgeText}</div>
            <div className="flex items-center gap-1"><Lock className="h-3 w-3" />SSL</div>
            <div className="flex items-center gap-1"><Award className="h-3 w-3" />Garantia 7 dias</div>
          </div>
        </div>
      )}

      {/* Footer */}
      {isComponentEnabled("footer") && (
        <div className="p-2 border-t text-center" style={{ borderColor: colors.border }}>
          <p className="text-[10px]" style={{ color: colors.mutedText }}>{labels.footerText}</p>
        </div>
      )}
    </div>
  );
}

// Preview para Template Vega (Hotmart style - Dark Premium)
function PreviewVega({ config, previewMode }: { config: TemplateConfig; previewMode: "desktop" | "mobile" }) {
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? true;

  // Vega usa cores escuras por padrão, mas respeita as cores customizadas
  const vegaBg = colors.background === "#f8fafc" ? "#111827" : colors.background;
  const vegaCard = colors.cardBackground === "#ffffff" ? "#1f2937" : colors.cardBackground;
  const vegaText = colors.text === "#1f2937" ? "#ffffff" : colors.text;
  const vegaMuted = colors.mutedText === "#6b7280" ? "#9ca3af" : colors.mutedText;
  const vegaBorder = colors.border === "#e5e7eb" ? "#374151" : colors.border;

  return (
    <div 
      className="min-h-[600px] rounded-lg overflow-hidden border shadow-xl"
      style={{ backgroundColor: vegaBg, borderColor: vegaBorder }}
    >
      {/* Header */}
      {isComponentEnabled("header") && (
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: vegaBorder }}>
          {settings.showLogo && settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-6 object-contain" />
          ) : (
            <div className="h-6 w-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded flex items-center justify-center text-[10px] font-bold" style={{ color: colors.buttonText }}>
              VEGA
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px]" style={{ color: vegaMuted }}>
            <Lock className="h-3 w-3" />
            <span>256-bit SSL</span>
          </div>
        </div>
      )}

      {/* Urgency banner */}
      {isComponentEnabled("countdown") && (
        <div className="p-2 text-center" style={{ background: `linear-gradient(to right, ${colors.primary}, #f97316)` }}>
          <div className="flex items-center justify-center gap-2 text-[10px] font-medium" style={{ color: colors.buttonText }}>
            <Clock className="h-3 w-3 animate-pulse" />
            <span>OFERTA EXPIRA EM: 14:59</span>
          </div>
        </div>
      )}

      <div className={`p-4 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Title */}
          <div className="mb-3">
            <h1 className="text-sm font-bold" style={{ color: vegaText }}>{labels.checkoutTitle}</h1>
            {labels.checkoutSubtitle && (
              <p className="text-[10px] mt-0.5" style={{ color: vegaMuted }}>{labels.checkoutSubtitle}</p>
            )}
          </div>

          {/* Avatar social proof */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold" style={{ borderColor: vegaBg, background: `linear-gradient(to br, ${colors.primary}, #8b5cf6)`, color: colors.buttonText }}>
                  {["M", "J", "A"][i - 1]}
                </div>
              ))}
            </div>
            <span className="text-[10px]" style={{ color: vegaMuted }}>+2.453 já compraram</span>
          </div>

          {/* Form */}
          {isComponentEnabled("buyerForm") && (
            <div className="rounded-xl p-3 border mb-3" style={{ backgroundColor: `${vegaCard}80`, borderColor: vegaBorder }}>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: vegaText }}>
                <User className="h-3 w-3" style={{ color: colors.primary }} />
                {labels.buyerSectionTitle}
              </h3>
              <div className="space-y-2">
                <div className="h-9 rounded-lg border text-[10px] px-3 flex items-center" style={{ backgroundColor: vegaCard, borderColor: vegaBorder, color: vegaMuted }}>Nome completo</div>
                <div className="h-9 rounded-lg border text-[10px] px-3 flex items-center" style={{ backgroundColor: vegaCard, borderColor: vegaBorder, color: vegaMuted }}>Seu melhor e-mail</div>
              </div>
            </div>
          )}

          {/* Payment */}
          {isComponentEnabled("payment") && (
            <div className="rounded-xl p-3 border" style={{ backgroundColor: `${vegaCard}80`, borderColor: vegaBorder }}>
              <h3 className="text-xs font-semibold mb-2" style={{ color: vegaText }}>{labels.paymentSectionTitle}</h3>
              <div className="p-2.5 border-2 rounded-lg flex items-center gap-2" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}15` }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <CheckCircle className="h-2.5 w-2.5" style={{ color: colors.buttonText }} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-medium" style={{ color: vegaText }}>PIX Instantâneo</span>
                  <p className="text-[8px]" style={{ color: vegaMuted }}>Liberação imediata</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: `linear-gradient(to r, ${colors.primary}, #8b5cf6)`, color: colors.buttonText }}>-10%</span>
              </div>
              <button className="w-full mt-3 h-11 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg" style={{ background: `linear-gradient(to r, ${colors.primary}, #8b5cf6)`, color: colors.buttonText, boxShadow: `0 10px 25px -5px ${colors.primary}50` }}>
                <Zap className="h-3.5 w-3.5" />
                {labels.buttonText}
              </button>
            </div>
          )}
        </div>

        {/* Product */}
        {previewMode === "desktop" && isComponentEnabled("productInfo") && (
          <div className="w-52 shrink-0">
            <div className="rounded-xl p-3 border" style={{ backgroundColor: `${vegaCard}80`, borderColor: vegaBorder }}>
              {settings.showProductImage && (
                <div className="aspect-video rounded-lg mb-2 flex items-center justify-center" style={{ background: `linear-gradient(to br, ${colors.primary}40, #8b5cf640)` }}>
                  <Play className="h-6 w-6" style={{ color: vegaText }} />
                </div>
              )}
              <p className="text-xs font-semibold" style={{ color: vegaText }}>Mentoria Premium</p>
              <p className="text-[10px] mt-0.5" style={{ color: vegaMuted }}>12 semanas de acompanhamento</p>
              <div className="mt-2 pt-2 border-t" style={{ borderColor: vegaBorder }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] line-through" style={{ color: vegaMuted }}>R$ 497</span>
                  <span className="text-sm font-bold" style={{ color: colors.primary }}>R$ 297</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {isComponentEnabled("footer") && (
        <div className="p-2 border-t text-center" style={{ borderColor: vegaBorder }}>
          <p className="text-[10px]" style={{ color: vegaMuted }}>{labels.footerText}</p>
        </div>
      )}
    </div>
  );
}

// Preview para Template Afilia (E-commerce style)
function PreviewAfilia({ config, previewMode }: { config: TemplateConfig; previewMode: "desktop" | "mobile" }) {
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? true;

  return (
    <div 
      className="min-h-[600px] rounded-lg overflow-hidden border shadow-xl"
      style={{ backgroundColor: colors.background }}
    >
      {/* Free shipping banner */}
      <div className="p-1.5 text-center" style={{ backgroundColor: colors.primary }}>
        <span className="text-[10px] font-medium flex items-center justify-center gap-1" style={{ color: colors.buttonText }}>
          <Truck className="h-3 w-3" />
          FRETE GRÁTIS para todo Brasil
        </span>
      </div>

      {/* Header */}
      {isComponentEnabled("header") && (
        <div className="p-2 flex items-center justify-between" style={{ backgroundColor: "#facc15" }}>
          {settings.showLogo && settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-5 object-contain" />
          ) : (
            <div className="font-black text-sm" style={{ color: colors.text }}>LOJA</div>
          )}
          <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.text }}>
            <Shield className="h-3 w-3" />
            {labels.securityBadgeText}
          </div>
        </div>
      )}

      <div className={`p-3 ${previewMode === "desktop" ? "flex gap-4" : "space-y-3"}`}>
        {/* Product column */}
        {previewMode === "desktop" && isComponentEnabled("productInfo") && (
          <div className="w-48 shrink-0">
            <div className="rounded-lg p-2 border" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              {settings.showProductImage && (
                <div className="aspect-square rounded mb-2 flex items-center justify-center relative" style={{ backgroundColor: colors.background }}>
                  <FileText className="h-8 w-8" style={{ color: colors.mutedText }} />
                  <span className="absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>-30%</span>
                </div>
              )}
              <p className="text-xs font-bold" style={{ color: colors.text }}>Kit Completo</p>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-[9px]" style={{ color: colors.mutedText }}>(2.847)</span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] line-through" style={{ color: colors.mutedText }}>R$ 199,90</span>
                <span className="text-sm font-bold ml-1" style={{ color: colors.primary }}>R$ 139,90</span>
              </div>
            </div>
          </div>
        )}

        <div className={previewMode === "desktop" ? "flex-1" : ""}>
          {/* Title */}
          <div className="mb-3">
            <h1 className="text-sm font-bold" style={{ color: colors.text }}>{labels.checkoutTitle}</h1>
          </div>

          {/* PIX discount */}
          <div className="border rounded-lg p-2 mb-3 flex items-center gap-2" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}40` }}>
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
              <span className="text-[8px] font-bold" style={{ color: colors.buttonText }}>PIX</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold" style={{ color: colors.primary }}>5% OFF no PIX</p>
              <p className="text-[8px]" style={{ color: colors.mutedText }}>Aprovação instantânea</p>
            </div>
          </div>

          {/* Form */}
          {isComponentEnabled("buyerForm") && (
            <div className="rounded-lg p-3 border mb-3" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              <h3 className="text-xs font-bold mb-2" style={{ color: colors.text }}>{labels.buyerSectionTitle}</h3>
              <div className="space-y-2">
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>Nome completo</div>
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>E-mail</div>
                <div className="h-8 rounded border text-[10px] px-2 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>CEP</div>
              </div>
            </div>
          )}

          {/* Payment */}
          {isComponentEnabled("payment") && (
            <div className="rounded-lg p-3 border" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
              <h3 className="text-xs font-bold mb-2" style={{ color: colors.text }}>{labels.paymentSectionTitle}</h3>
              <div className="p-2 border-2 rounded flex items-center gap-2" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}>
                <CheckCircle className="h-4 w-4" style={{ color: colors.primary }} />
                <span className="text-[10px] font-medium" style={{ color: colors.primary }}>PIX</span>
              </div>
              <button className="w-full mt-3 h-10 text-xs font-bold rounded" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>
                {labels.buttonText}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trust badges */}
      {isComponentEnabled("securityBadges") && (
        <div className="p-2 border-t" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
          <div className="flex items-center justify-center gap-4 text-[9px]" style={{ color: colors.mutedText }}>
            <div className="flex items-center gap-1"><Shield className="h-3 w-3" style={{ color: colors.primary }} />{labels.securityBadgeText}</div>
            <div className="flex items-center gap-1"><Truck className="h-3 w-3" style={{ color: colors.primary }} />Entrega Grátis</div>
            <div className="flex items-center gap-1"><Award className="h-3 w-3" style={{ color: "#facc15" }} />Garantia</div>
          </div>
        </div>
      )}

      {/* Footer */}
      {isComponentEnabled("footer") && (
        <div className="p-2 border-t text-center" style={{ borderColor: colors.border }}>
          <p className="text-[10px]" style={{ color: colors.mutedText }}>{labels.footerText}</p>
        </div>
      )}
    </div>
  );
}

// Preview para Template Multistep (Eduzz style)
function PreviewMultistep({ config, previewMode }: { config: TemplateConfig; previewMode: "desktop" | "mobile" }) {
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? true;

  return (
    <div 
      className="min-h-[600px] rounded-lg overflow-hidden border shadow-xl"
      style={{ background: `linear-gradient(to br, ${colors.background}, ${colors.primary}10)` }}
    >
      {/* Progress header */}
      {isComponentEnabled("header") && (
        <div className="p-3 border-b" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <div className="flex items-center justify-between mb-2">
            {settings.showLogo && settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-5 object-contain" />
            ) : (
              <div className="h-5 w-16 rounded flex items-center justify-center text-[8px] font-bold" style={{ background: `linear-gradient(to r, ${colors.primary}, #06b6d4)`, color: colors.buttonText }}>
                STEP
              </div>
            )}
            <span className="text-[10px]" style={{ color: colors.mutedText }}>Passo 2 de 3</span>
          </div>
          <div className="flex gap-1">
            <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: colors.primary }} />
            <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: colors.primary }} />
            <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: colors.border }} />
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Title */}
        <div className="mb-3">
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>{labels.checkoutTitle}</h1>
          {labels.checkoutSubtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: colors.mutedText }}>{labels.checkoutSubtitle}</p>
          )}
        </div>

        {/* Current step */}
        {isComponentEnabled("buyerForm") && (
          <div className="rounded-xl p-4 border shadow-sm mb-3" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(to br, ${colors.primary}, #06b6d4)` }}>
                <User className="h-4 w-4" style={{ color: colors.buttonText }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: colors.text }}>{labels.buyerSectionTitle}</h3>
                <p className="text-[10px]" style={{ color: colors.mutedText }}>Preencha suas informações</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-10 rounded-lg border text-[10px] px-3 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>Nome completo</div>
              <div className="h-10 rounded-lg border text-[10px] px-3 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>E-mail</div>
              <div className="h-10 rounded-lg border text-[10px] px-3 flex items-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.mutedText }}>Telefone com DDD</div>
            </div>

            <button className="w-full mt-4 h-11 text-xs font-bold rounded-lg flex items-center justify-center gap-2" style={{ background: `linear-gradient(to r, ${colors.primary}, #06b6d4)`, color: colors.buttonText }}>
              {labels.buttonText}
              <span>→</span>
            </button>
          </div>
        )}

        {/* Bonus section */}
        <div className="rounded-xl p-3 border" style={{ background: "linear-gradient(to r, #fef3c7, #fed7aa)", borderColor: "#fcd34d" }}>
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
              <div key={i} className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[7px] font-bold" style={{ background: `linear-gradient(to br, ${colors.primary}, #06b6d4)`, borderColor: colors.cardBackground, color: colors.buttonText }}>
                {["M", "J", "A", "P"][i - 1]}
              </div>
            ))}
          </div>
          <span className="text-[10px]" style={{ color: colors.mutedText }}>+847 alunos já inscritos</span>
        </div>
      </div>

      {/* Trust footer */}
      {isComponentEnabled("footer") && (
        <div className="mt-auto p-3 border-t" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <div className="flex items-center justify-center gap-4 text-[9px]" style={{ color: colors.mutedText }}>
            <div className="flex items-center gap-1"><Lock className="h-3 w-3" />Seguro</div>
            <div className="flex items-center gap-1"><Award className="h-3 w-3" />7 dias garantia</div>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: colors.mutedText }}>{labels.footerText}</p>
        </div>
      )}
    </div>
  );
}

export function TemplateEditorPreview({ config, previewMode }: TemplateEditorPreviewProps) {
  // Determine which preview to show based on template type
  const templateType = (config.type || "").toLowerCase();
  
  if (templateType.includes("vega")) {
    return <PreviewVega config={config} previewMode={previewMode} />;
  }
  
  if (templateType.includes("afilia")) {
    return <PreviewAfilia config={config} previewMode={previewMode} />;
  }
  
  if (templateType.includes("multistep") || templateType.includes("etapa")) {
    return <PreviewMultistep config={config} previewMode={previewMode} />;
  }
  
  // Default to Padrão
  return <PreviewPadrao config={config} previewMode={previewMode} />;
}
