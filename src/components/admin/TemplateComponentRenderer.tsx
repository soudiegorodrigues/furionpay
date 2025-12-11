import { ComponentConfig, TemplateConfig } from "./TemplateEditor";
import { 
  Type, 
  Image, 
  Check, 
  BadgeCheck, 
  Layers, 
  List, 
  Clock, 
  MessageSquare, 
  Video, 
  Facebook, 
  MapPin,
  Play,
  Quote,
  Star,
  CheckCircle
} from "lucide-react";

interface ComponentRendererProps {
  component: ComponentConfig;
  config: TemplateConfig;
}

// Renderiza cada tipo de componente da paleta
export function TemplateComponentRenderer({ component, config }: ComponentRendererProps) {
  const { colors } = config;

  if (!component.enabled) return null;

  switch (component.type) {
    case "text":
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
            Este é um bloco de texto personalizável. Você pode editar o conteúdo, fonte, tamanho e cores.
          </p>
        </div>
      );

    case "image":
      return (
        <div 
          className="aspect-video rounded-lg flex items-center justify-center border"
          style={{ backgroundColor: colors.background, borderColor: colors.border }}
        >
          <div className="text-center">
            <Image className="h-8 w-8 mx-auto mb-2" style={{ color: colors.mutedText }} />
            <p className="text-[10px]" style={{ color: colors.mutedText }}>Imagem do produto</p>
          </div>
        </div>
      );

    case "benefits":
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <p className="text-xs font-semibold mb-2" style={{ color: colors.text }}>Vantagens</p>
          <div className="space-y-2">
            {["Acesso imediato", "Suporte 24/7", "Garantia de 7 dias"].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: colors.primary }} />
                <span className="text-[11px]" style={{ color: colors.text }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "badge":
      return (
        <div className="flex flex-wrap gap-2 p-2">
          <div 
            className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <BadgeCheck className="h-4 w-4" style={{ color: colors.primary }} />
            <span className="text-[10px] font-medium" style={{ color: colors.primary }}>Produto Oficial</span>
          </div>
          <div 
            className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ backgroundColor: "#fef3c7" }}
          >
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-medium text-amber-700">Mais Vendido</span>
          </div>
        </div>
      );

    case "header":
      return (
        <div className="p-3 border-b flex items-center justify-between" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <div 
            className="h-6 w-24 rounded flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: colors.primary, color: colors.buttonText }}
          >
            LOGO
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.mutedText }}>
            <BadgeCheck className="h-3 w-3" />
            <span>Compra Segura</span>
          </div>
        </div>
      );

    case "list":
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <p className="text-xs font-semibold mb-2" style={{ color: colors.text }}>O que você vai receber</p>
          <ul className="space-y-1.5">
            {["Módulo 1: Introdução", "Módulo 2: Estratégias", "Módulo 3: Prática", "Bônus: Materiais extras"].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5"
                  style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                >
                  {i + 1}
                </div>
                <span className="text-[11px]" style={{ color: colors.text }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "countdown":
      return (
        <div 
          className="p-3 rounded-lg text-center"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4" style={{ color: colors.primary }} />
            <span className="text-xs font-medium" style={{ color: colors.primary }}>Oferta por tempo limitado</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            {["00", "14", "59"].map((unit, i) => (
              <div key={i} className="flex items-center gap-1">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                >
                  {unit}
                </div>
                {i < 2 && <span className="text-lg font-bold" style={{ color: colors.primary }}>:</span>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-1 text-[9px]" style={{ color: colors.mutedText }}>
            <span>HORAS</span>
            <span>MIN</span>
            <span>SEG</span>
          </div>
        </div>
      );

    case "testimonials":
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.cardBackground, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4" style={{ color: colors.primary }} />
            <span className="text-xs font-semibold" style={{ color: colors.text }}>Depoimentos</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "Maria S.", text: "Mudou minha vida! Recomendo muito." },
              { name: "João P.", text: "Conteúdo incrível e suporte excelente!" }
            ].map((testimonial, i) => (
              <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: colors.background }}>
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                  >
                    {testimonial.name[0]}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: colors.text }}>{testimonial.name}</span>
                  <div className="flex gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[9px] italic" style={{ color: colors.mutedText }}>"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "video":
      return (
        <div 
          className="aspect-video rounded-lg flex items-center justify-center border relative overflow-hidden"
          style={{ backgroundColor: "#111", borderColor: colors.border }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center relative z-10"
            style={{ backgroundColor: colors.primary }}
          >
            <Play className="h-6 w-6 ml-1" style={{ color: colors.buttonText }} />
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <p className="text-[10px] font-medium text-white">Veja o vídeo de apresentação</p>
            <p className="text-[8px] text-white/70">02:45 min</p>
          </div>
        </div>
      );

    case "facebook":
      return (
        <div className="p-3 rounded-lg border" style={{ backgroundColor: "#1877f2", borderColor: "#1877f2" }}>
          <div className="flex items-center gap-2 text-white">
            <Facebook className="h-5 w-5" />
            <div>
              <p className="text-[10px] font-semibold">Siga no Facebook</p>
              <p className="text-[8px] opacity-80">+50.000 seguidores</p>
            </div>
          </div>
        </div>
      );

    case "map":
      return (
        <div 
          className="aspect-video rounded-lg flex items-center justify-center border"
          style={{ backgroundColor: "#e5e7eb", borderColor: colors.border }}
        >
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: colors.primary }} />
            <p className="text-[10px]" style={{ color: colors.mutedText }}>Mapa de localização</p>
          </div>
        </div>
      );

    default:
      return (
        <div 
          className="p-3 rounded-lg border-2 border-dashed"
          style={{ borderColor: colors.border }}
        >
          <p className="text-[10px] text-center" style={{ color: colors.mutedText }}>
            Componente: {component.name}
          </p>
        </div>
      );
  }
}

// Renderiza todos os componentes dinâmicos (não os fixos do template)
export function DynamicComponentsList({ config }: { config: TemplateConfig }) {
  const dynamicTypes = ["text", "image", "benefits", "badge", "list", "video", "facebook", "map"];
  
  const dynamicComponents = config.components.filter(c => 
    dynamicTypes.includes(c.type) && c.enabled
  );

  if (dynamicComponents.length === 0) return null;

  return (
    <div className="space-y-3">
      {dynamicComponents.map((component) => (
        <TemplateComponentRenderer 
          key={component.id} 
          component={component} 
          config={config} 
        />
      ))}
    </div>
  );
}
