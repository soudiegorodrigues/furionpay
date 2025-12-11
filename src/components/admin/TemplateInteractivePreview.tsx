import { useState } from "react";
import { TemplateConfig } from "./TemplateEditor";
import { Shield, Lock, Clock, CheckCircle, Star, Award, FileText, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemplateInteractivePreviewProps {
  config: TemplateConfig;
  previewMode: "desktop" | "mobile";
  onUpdateLabel: (key: keyof TemplateConfig["labels"], value: string) => void;
  onUpdateColor: (key: keyof TemplateConfig["colors"], value: string) => void;
  onUpdateSetting: (key: keyof TemplateConfig["settings"], value: unknown) => void;
}

type EditableElement = 
  | "logo" 
  | "securityBadge" 
  | "socialProof" 
  | "countdown" 
  | "checkoutTitle" 
  | "buyerSectionTitle" 
  | "paymentSectionTitle" 
  | "buttonText" 
  | "footerText"
  | "primaryColor"
  | null;

export function TemplateInteractivePreview({ 
  config, 
  previewMode, 
  onUpdateLabel,
  onUpdateColor,
  onUpdateSetting 
}: TemplateInteractivePreviewProps) {
  const [selectedElement, setSelectedElement] = useState<EditableElement>(null);
  const [editingValue, setEditingValue] = useState("");
  
  const { colors, labels, components, settings } = config;
  
  const isComponentEnabled = (type: string) => 
    components.find(c => c.type === type)?.enabled ?? true;

  const handleElementClick = (element: EditableElement, currentValue: string) => {
    setSelectedElement(element);
    setEditingValue(currentValue);
  };

  const handleSave = () => {
    if (!selectedElement) return;
    
    switch (selectedElement) {
      case "checkoutTitle":
        onUpdateLabel("checkoutTitle", editingValue);
        break;
      case "buyerSectionTitle":
        onUpdateLabel("buyerSectionTitle", editingValue);
        break;
      case "paymentSectionTitle":
        onUpdateLabel("paymentSectionTitle", editingValue);
        break;
      case "buttonText":
        onUpdateLabel("buttonText", editingValue);
        break;
      case "footerText":
        onUpdateLabel("footerText", editingValue);
        break;
      case "securityBadge":
        onUpdateLabel("securityBadgeText", editingValue);
        break;
      case "primaryColor":
        onUpdateColor("primary", editingValue);
        break;
      case "logo":
        onUpdateSetting("logoUrl", editingValue);
        break;
    }
    
    setSelectedElement(null);
    setEditingValue("");
  };

  const handleCancel = () => {
    setSelectedElement(null);
    setEditingValue("");
  };

  // Wrapper for editable elements
  const EditableWrapper = ({ 
    element, 
    currentValue, 
    children,
    className = ""
  }: { 
    element: EditableElement; 
    currentValue: string; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        handleElementClick(element, currentValue);
      }}
      className={cn(
        "relative cursor-pointer group transition-all",
        selectedElement === element 
          ? "ring-2 ring-emerald-500 ring-offset-2 rounded" 
          : "hover:ring-2 hover:ring-emerald-500/50 hover:ring-offset-1 rounded",
        className
      )}
    >
      {children}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <Pencil className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Inline Editor Popover */}
      {selectedElement && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Editar elemento</span>
            <button onClick={handleCancel} className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {selectedElement === "primaryColor" ? (
            <div className="flex gap-2">
              <input
                type="color"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-white/10"
              />
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="h-10 bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
                placeholder="Ex: #16A34A"
              />
            </div>
          ) : selectedElement === "logo" ? (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="h-10 bg-white/5 border-white/10 text-white text-sm"
              placeholder="URL da imagem do logo..."
            />
          ) : (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="h-10 bg-white/5 border-white/10 text-white text-sm"
              autoFocus
            />
          )}
          
          <div className="flex gap-2 mt-3">
            <Button 
              onClick={handleCancel} 
              variant="outline" 
              size="sm"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Preview */}
      <div 
        className="min-h-[600px] rounded-lg overflow-hidden border shadow-xl"
        style={{ backgroundColor: colors.background }}
        onClick={() => setSelectedElement(null)}
      >
        {/* Header */}
        {isComponentEnabled("header") && (
          <div className="p-3 border-b flex items-center justify-between" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
            <EditableWrapper element="logo" currentValue={settings.logoUrl || ""}>
              {settings.showLogo && settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-6 object-contain" />
              ) : (
                <div 
                  className="h-6 w-24 rounded flex items-center justify-center text-[10px] font-bold" 
                  style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                >
                  LOGO
                </div>
              )}
            </EditableWrapper>
            
            <EditableWrapper element="securityBadge" currentValue={labels.securityBadgeText}>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.mutedText }}>
                <Shield className="h-3 w-3" />
                <span>{labels.securityBadgeText}</span>
              </div>
            </EditableWrapper>
          </div>
        )}

        {/* Social proof banner */}
        <div 
          className="p-2 text-center border-b cursor-pointer" 
          style={{ backgroundColor: `${colors.primary}15`, borderColor: colors.border }}
          onClick={(e) => {
            e.stopPropagation();
            handleElementClick("primaryColor", colors.primary);
          }}
        >
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
              <EditableWrapper element="checkoutTitle" currentValue={labels.checkoutTitle}>
                <h1 className="text-sm font-bold" style={{ color: colors.text }}>{labels.checkoutTitle}</h1>
              </EditableWrapper>
            </div>

            {/* Step 1 - Buyer Form */}
            {isComponentEnabled("buyerForm") && (
              <div className="rounded-lg p-3 border mb-3" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>1</div>
                  <EditableWrapper element="buyerSectionTitle" currentValue={labels.buyerSectionTitle}>
                    <span className="text-xs font-semibold" style={{ color: colors.text }}>{labels.buyerSectionTitle}</span>
                  </EditableWrapper>
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
                  <EditableWrapper element="paymentSectionTitle" currentValue={labels.paymentSectionTitle}>
                    <span className="text-xs font-semibold" style={{ color: colors.text }}>{labels.paymentSectionTitle}</span>
                  </EditableWrapper>
                </div>
                <div className="p-2 border-2 rounded-lg flex items-center gap-2" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                    <CheckCircle className="h-2.5 w-2.5" style={{ color: colors.buttonText }} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: colors.primary }}>PIX</span>
                  <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>-5%</span>
                </div>
                <EditableWrapper element="buttonText" currentValue={labels.buttonText} className="mt-3">
                  <button className="w-full h-10 text-xs font-bold rounded-lg" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>
                    {labels.buttonText}
                  </button>
                </EditableWrapper>
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
            <EditableWrapper element="footerText" currentValue={labels.footerText}>
              <p className="text-[10px]" style={{ color: colors.mutedText }}>{labels.footerText}</p>
            </EditableWrapper>
          </div>
        )}
      </div>

      {/* Help tooltip */}
      <div className="mt-3 text-center">
        <p className="text-[11px] text-white/40">
          💡 Clique em qualquer elemento para editar diretamente
        </p>
      </div>
    </div>
  );
}
