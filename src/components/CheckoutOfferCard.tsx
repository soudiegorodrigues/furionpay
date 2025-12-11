import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link, Copy, Check, Globe, Save, Package, Activity, Trash2, Edit2, ChevronDown, ChevronUp, X } from "lucide-react";
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

interface CheckoutOffer {
  id: string;
  name: string;
  domain: string;
  popup_model: string;
  product_name: string;
  meta_pixel_ids: string[];
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

interface CheckoutOfferCardProps {
  offer: CheckoutOffer;
  userId: string;
  availableDomains: AvailableDomain[];
  metaPixels: MetaPixel[];
  popupModels: PopupModel[];
  onSave: (offer: CheckoutOffer) => Promise<void>;
  onDelete: (offerId: string) => Promise<void>;
  isNew?: boolean;
}

const blockedProductNames = ['doação', 'doacao', 'golpe', 'falso', 'fraude', 'fake', 'scam'];

const isProductNameBlocked = (name: string): boolean => {
  const normalizedName = name.toLowerCase().trim();
  return blockedProductNames.some(blocked => normalizedName.includes(blocked));
};

export const CheckoutOfferCard = ({
  offer,
  userId,
  availableDomains,
  metaPixels,
  popupModels,
  onSave,
  onDelete,
  isNew = false,
}: CheckoutOfferCardProps) => {
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

  const togglePixel = (pixelId: string) => {
    setMetaPixelIds(prev => 
      prev.includes(pixelId) 
        ? prev.filter(id => id !== pixelId)
        : [...prev, pixelId]
    );
  };

  const generateLink = () => {
    let link = domain 
      ? `https://www.${domain}/?u=${userId}&m=${popupModel}` 
      : `${window.location.origin}/?u=${userId}&m=${popupModel}`;
    
    if (metaPixelIds.length > 0) {
      const pixelValues = metaPixelIds
        .map(id => metaPixels.find(p => p.id === id)?.pixelId)
        .filter(Boolean)
        .join(',');
      if (pixelValues) {
        link += `&pixel=${pixelValues}`;
      }
    }
    return link;
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

    if (isProductNameBlocked(productName)) {
      toast({
        title: "Nome de produto bloqueado",
        description: "O nome do produto contém palavras não permitidas.",
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

    setIsSaving(true);
    try {
      await onSave({
        id: offer.id,
        name: name.trim(),
        domain,
        popup_model: popupModel,
        product_name: productName,
        meta_pixel_ids: metaPixelIds,
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
            <div>
              <CardTitle className="text-base">{name || 'Nova Oferta'}</CardTitle>
              <CardDescription className="text-xs">
                {selectedModelName} • {domain || 'Sem domínio'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableDomains.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Domínio
                </Label>
                <Select value={domain} onValueChange={setDomain} disabled={!isEditing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um domínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains.map(d => (
                      <SelectItem key={d.id} value={d.domain}>
                        {d.name ? `${d.name} (${d.domain})` : d.domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
