import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link, Copy, Check, Globe, Save, Package, Activity, Trash2, Edit2, ChevronDown, ChevronUp, X, AlertTriangle, BarChart3, CheckCircle, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Lista de palavras bloqueadas para nomes de produtos
const BLOCKED_PRODUCT_KEYWORDS = [
  // Conteúdo Adulto
  'adult', 'porn', 'xxx', 'sex', 'sexy', 'erotic',
  // Armas/Drogas
  'arma', 'weapon', 'gun', 'droga', 'drug', 'cocaina', 'maconha', 'cannabis', 
  'weed', 'narcotic', 'trafico', 'traficante', 'fuzil', 'pistola', 'rifle', 
  'munição', 'ammunition',
  // Doações
  'donate', 'donation', 'doação', 'doacao', 'doações', 'doacoes', 'vakinha', 
  'vaquinha', 'crowdfunding', 'arrecadação', 'arrecadacao', 'ajuda financeira', 
  'contribuição', 'contribuicao', 'caridade', 'charity', 'fundraising', 
  'campanha solidária', 'campanha solidaria', 'pix solidário', 'pix solidario', 
  'rifinha', 'rifa', 'sorteio beneficente',
  // Financeiro/Cripto
  'cripto', 'crypto', 'bitcoin', 'forex', 'trade', 'trading', 'investimento', 
  'investir', 'renda fixa', 'day trade', 'mmn', 'marketing multinivel', 
  'multinível', 'pirâmide', 'esquema', 'empréstimo', 'financiamento', 'crédito'
];

// Função para normalizar texto (remover acentos e converter para minúsculo)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Verifica se o texto contém alguma palavra bloqueada
const containsBlockedKeyword = (text: string): string | null => {
  const normalizedText = normalizeText(text);
  
  for (const keyword of BLOCKED_PRODUCT_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      return keyword;
    }
  }
  
  return null;
};

interface CheckoutOffer {
  id: string;
  name: string;
  domain: string;
  popup_model: string;
  product_name: string;
  meta_pixel_ids: string[];
  slug?: string;
  click_count?: number;
  created_at?: string;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}

interface PopupModel {
  id: string;
  name: string;
  description: string;
  hasDynamicAmount: boolean;
}

interface PopupModelStats {
  popup_model: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}

interface OfferStats {
  offer_id: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}

interface CheckoutOfferCardProps {
  offer: CheckoutOffer;
  userId: string;
  availableDomains: AvailableDomain[];
  metaPixels: MetaPixel[];
  popupModels: PopupModel[];
  popupStats?: PopupModelStats[];
  offerStats?: OfferStats;
  onSave: (offer: CheckoutOffer) => Promise<void>;
  onDelete: (offerId: string) => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isNew?: boolean;
}

export const CheckoutOfferCard = ({
  offer,
  userId,
  availableDomains,
  metaPixels,
  popupModels,
  popupStats = [],
  offerStats,
  onSave,
  onDelete,
  onRefresh,
  isRefreshing = false,
  isNew = false,
}: CheckoutOfferCardProps) => {
  // Use offer-specific stats if available, fallback to popup model stats
  const stats = offerStats || popupStats.find(s => s.popup_model === offer.popup_model);
  const [isEditing, setIsEditing] = useState(isNew);
  const [isExpanded, setIsExpanded] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [name, setName] = useState(offer.name);
  const [domain, setDomain] = useState(offer.domain);
  const [popupModel, setPopupModel] = useState(offer.popup_model);
  const [productName, setProductName] = useState(offer.product_name);
  const [metaPixelIds, setMetaPixelIds] = useState<string[]>(offer.meta_pixel_ids || []);
  const [slug, setSlug] = useState(offer.slug || '');
  const [slugError, setSlugError] = useState<string | null>(null);

  // Sync local state with offer from backend when not editing
  useEffect(() => {
    if (!isEditing) {
      setName(offer.name);
      setDomain(offer.domain);
      setPopupModel(offer.popup_model);
      setProductName(offer.product_name);
      setMetaPixelIds(offer.meta_pixel_ids || []);
      setSlug(offer.slug || '');
      setSlugError(null);
    }
  }, [offer, isEditing]);

  // Generate slug suggestion from name
  const generateSlugFromName = (offerName: string): string => {
    return offerName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  // Validate slug format
  const validateSlug = (value: string): string | null => {
    if (!value) return null; // Empty is OK
    if (value.length < 3) return 'Mínimo 3 caracteres';
    if (value.length > 50) return 'Máximo 50 caracteres';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(value)) {
      return 'Use apenas letras minúsculas, números e hífens';
    }
    if (/--/.test(value)) return 'Não use hífens consecutivos';
    return null;
  };

  // Handle slug change
  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(normalized);
    setSlugError(validateSlug(normalized));
  };

  const togglePixel = (pixelId: string) => {
    setMetaPixelIds(prev => 
      prev.includes(pixelId) 
        ? prev.filter(id => id !== pixelId)
        : [...prev, pixelId]
    );
  };

  const generateLink = () => {
    const normalizedDomain = (domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const baseUrl = normalizedDomain ? `https://${normalizedDomain}` : window.location.origin;
    
    // Use short slug if available
    if (slug && !slugError) {
      return `${baseUrl}/c/${slug}`;
    }
    
    // Fallback to full URL (without pixel param - loaded from DB)
    return `${baseUrl}/?o=${offer.id}&u=${userId}&m=${popupModel}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generateLink());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para sua área de transferência"
    });
  };

  const handleSave = async () => {
    if (!productName || !productName.trim()) {
      toast({
        title: "Nome do produto obrigatório",
        description: "Por favor, informe o nome do produto que aparecerá no gateway de pagamento.",
        variant: "destructive"
      });
      return;
    }

    // Validação de palavras bloqueadas
    const blockedWord = containsBlockedKeyword(productName);
    if (blockedWord) {
      toast({
        title: "Nome do produto não permitido",
        description: `O nome do produto contém termos não permitidos ("${blockedWord}"). Por favor, escolha outro nome.`,
        variant: "destructive"
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, dê um nome para esta oferta.",
        variant: "destructive"
      });
      return;
    }

    // Validação de domínio - deve ser um domínio de Popup válido
    const isValidDomain = !domain || availableDomains.some(d => d.domain === domain);
    if (!isValidDomain && availableDomains.length > 0) {
      toast({
        title: "Domínio inválido",
        description: "Selecione um domínio cadastrado em Domínios (Popup).",
        variant: "destructive"
      });
      return;
    }

    // Validate slug if provided
    if (slug && slugError) {
      toast({
        title: "Slug inválido",
        description: slugError,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: offer.id,
        name: name.trim(),
        domain,
        popup_model: popupModel,
        product_name: productName,
        meta_pixel_ids: metaPixelIds,
        slug: slug || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(offer.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setName(offer.name);
    setDomain(offer.domain);
    setPopupModel(offer.popup_model);
    setProductName(offer.product_name);
    setMetaPixelIds(offer.meta_pixel_ids || []);
    setSlug(offer.slug || '');
    setSlugError(null);
    setIsEditing(false);
    if (isNew) {
      onDelete(offer.id);
    }
  };

  const selectedModelName = popupModels.find(m => m.id === popupModel)?.name || popupModel;

  return (
    <Card className={`transition-all ${isEditing ? 'border-primary ring-2 ring-primary/20' : ''}`}>
      <CardHeader 
        className="pb-3 cursor-pointer" 
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Link className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{name || 'Nova Oferta'}</CardTitle>
              <CardDescription className="text-xs">
                {selectedModelName} • {domain || 'Sem domínio'}
              </CardDescription>
              {/* Métricas da oferta */}
              {!isNew && stats && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                    <BarChart3 className="w-3 h-3" />
                    {stats.total_generated} PIX gerado
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    {stats.total_paid} PIX pago
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                    <TrendingUp className="w-3 h-3" />
                    Taxa {stats.conversion_rate}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                title="Atualizar estatísticas"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setIsExpanded(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink();
                  }}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </>
            )}
            {!isEditing && (
              <Button variant="ghost" size="icon">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {(isExpanded || isEditing) && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label>Nome da Oferta</Label>
            <Input 
              placeholder="Ex: Oferta Principal" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Slug do Link (opcional)
            </Label>
            <div className="flex gap-2">
              <Input 
                placeholder="ex: oferta-jade-2025" 
                value={slug} 
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={!isEditing}
                className={slugError ? 'border-destructive' : ''}
              />
              {isEditing && name && !slug && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSlugChange(generateSlugFromName(name))}
                >
                  Sugerir
                </Button>
              )}
            </div>
            {slugError && (
              <p className="text-xs text-destructive">{slugError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {slug && !slugError 
                ? `Link curto: ${(domain || window.location.host).replace(/^https?:\/\//, '')}/c/${slug}`
                : 'Crie um link curto e fácil de lembrar (ex: jade2025)'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(availableDomains.length > 0 || domain) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Domínio
                </Label>
                {(() => {
                  const isDomainInList = availableDomains.some(d => d.domain === domain);
                  const showLegacyWarning = domain && !isDomainInList && availableDomains.length > 0;
                  
                  return (
                    <>
                      <Select value={domain} onValueChange={setDomain} disabled={!isEditing}>
                        <SelectTrigger className={showLegacyWarning ? 'border-amber-500' : ''}>
                          <SelectValue placeholder="Selecione um domínio" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Mostrar domínio atual se não estiver na lista */}
                          {showLegacyWarning && (
                            <SelectItem value={domain} disabled className="text-muted-foreground">
                              {domain} (não cadastrado)
                            </SelectItem>
                          )}
                          {availableDomains.map(d => (
                            <SelectItem key={d.id} value={d.domain}>
                              {d.name ? `${d.name} (${d.domain})` : d.domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showLegacyWarning && isEditing && (
                        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            <p>Este domínio não está cadastrado como Domínio de Popup.</p>
                            {availableDomains.length > 0 && (
                              <button 
                                type="button"
                                className="underline font-medium mt-1"
                                onClick={() => setDomain(availableDomains[0].domain)}
                              >
                                Usar {availableDomains[0].domain}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Modelo
              </Label>
              <Select value={popupModel} onValueChange={setPopupModel} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {popupModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Meta Pixels
            </Label>
            <Popover>
              <PopoverTrigger asChild disabled={!isEditing}>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                  disabled={!isEditing}
                >
                  {metaPixelIds.length === 0 
                    ? "Selecione pixels..." 
                    : `${metaPixelIds.length} pixel${metaPixelIds.length > 1 ? 's' : ''} selecionado${metaPixelIds.length > 1 ? 's' : ''}`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-2" align="start">
                {metaPixels.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Nenhum pixel configurado</p>
                ) : (
                  <div className="space-y-2">
                    {metaPixels.filter(pixel => pixel.id).map(pixel => (
                      <div key={pixel.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={pixel.id}
                          checked={metaPixelIds.includes(pixel.id)}
                          onCheckedChange={() => togglePixel(pixel.id)}
                        />
                        <label 
                          htmlFor={pixel.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {pixel.name || `Pixel ${pixel.pixelId.slice(0, 8)}...`}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {metaPixelIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {metaPixelIds.map(id => {
                  const pixel = metaPixels.find(p => p.id === id);
                  if (!pixel) return null;
                  return (
                    <span 
                      key={id} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                    >
                      {pixel.name || `Pixel ${pixel.pixelId.slice(0, 8)}...`}
                      {isEditing && (
                        <button 
                          onClick={() => togglePixel(id)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Nome do Produto <span className="text-destructive">*</span>
            </Label>
            <Input 
              placeholder="Ex: Ebook, Curso, Produto Digital" 
              value={productName} 
              onChange={(e) => setProductName(e.target.value)}
              disabled={!isEditing}
              required
            />
            <p className="text-xs text-muted-foreground">
              Nome que aparecerá no gateway de pagamento (obrigatório)
            </p>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Seu link</Label>
              <div className="flex gap-2">
                <Input value={generateLink()} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={copyLink}>
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancelar
                </Button>
              </>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="ml-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir oferta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O link desta oferta deixará de funcionar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
