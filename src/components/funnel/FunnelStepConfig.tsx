import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Palette, Link2, Save, X } from 'lucide-react';
import { FunnelStep, STEP_CONFIG } from './types';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface FunnelStepConfigProps {
  step: FunnelStep | null;
  products: Product[];
  allSteps: FunnelStep[];
  onSave: (step: FunnelStep) => void;
  onClose: () => void;
}

export function FunnelStepConfig({
  step,
  products,
  allSteps,
  onSave,
  onClose,
}: FunnelStepConfigProps) {
  const [formData, setFormData] = useState<Partial<FunnelStep>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (step) {
      setFormData({
        ...step,
      });
      setHasChanges(false);
    }
  }, [step]);

  if (!step) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Selecione uma etapa para configurar</p>
        </CardContent>
      </Card>
    );
  }

  const config = STEP_CONFIG[step.step_type];
  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  const handleChange = (field: keyof FunnelStep, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData((prev) => ({
        ...prev,
        offer_product_id: productId,
        offer_price: product.price,
        original_price: product.price,
        title: product.name,
      }));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (step) {
      onSave({ ...step, ...formData } as FunnelStep);
      setHasChanges(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${config.color}`}>
              <Settings className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base">Configurar {config.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="general" className="h-full">
          <TabsList className="w-full justify-start rounded-none border-b px-4 pt-2">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="visual" className="gap-2">
              <Palette className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="redirect" className="gap-2">
              <Link2 className="h-4 w-4" />
              Redirecionamento
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-4">
              <TabsContent value="general" className="m-0 space-y-4">
                {step.step_type !== 'thankyou' && (
                  <>
                    {/* Product Selection */}
                    <div className="space-y-2">
                      <Label>Produto da Oferta</Label>
                      <Select
                        value={formData.offer_product_id || ''}
                        onValueChange={handleProductChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Original</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.original_price || ''}
                          onChange={(e) => handleChange('original_price', parseFloat(e.target.value))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço da Oferta</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.offer_price || ''}
                          onChange={(e) => handleChange('offer_price', parseFloat(e.target.value))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="space-y-2">
                      <Label>Timer (segundos)</Label>
                      <Input
                        type="number"
                        value={formData.timer_seconds || 300}
                        onChange={(e) => handleChange('timer_seconds', parseInt(e.target.value))}
                        placeholder="300"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tempo em segundos (300 = 5 minutos)
                      </p>
                    </div>
                  </>
                )}

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Etapa Ativa</Label>
                    <p className="text-xs text-muted-foreground">
                      Desative para pular esta etapa no funil
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active !== false}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="visual" className="m-0 space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Oferta Especial"
                  />
                </div>

                {/* Headline */}
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    value={formData.headline || ''}
                    onChange={(e) => handleChange('headline', e.target.value)}
                    placeholder="Uma oportunidade única!"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descreva sua oferta..."
                    rows={3}
                  />
                </div>

                {step.step_type !== 'thankyou' && (
                  <>
                    {/* Button Texts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Texto do Botão Aceitar</Label>
                        <Input
                          value={formData.button_accept_text || ''}
                          onChange={(e) => handleChange('button_accept_text', e.target.value)}
                          placeholder="SIM! Quero aproveitar"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Texto do Botão Recusar</Label>
                        <Input
                          value={formData.button_decline_text || ''}
                          onChange={(e) => handleChange('button_decline_text', e.target.value)}
                          placeholder="Não, obrigado"
                        />
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cor de Fundo</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.background_color || '#ffffff'}
                            onChange={(e) => handleChange('background_color', e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            value={formData.background_color || '#ffffff'}
                            onChange={(e) => handleChange('background_color', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Botão</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.button_color || '#22c55e'}
                            onChange={(e) => handleChange('button_color', e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            value={formData.button_color || '#22c55e'}
                            onChange={(e) => handleChange('button_color', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Media */}
                    <div className="space-y-2">
                      <Label>URL da Imagem</Label>
                      <Input
                        value={formData.image_url || ''}
                        onChange={(e) => handleChange('image_url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL do Vídeo (opcional)</Label>
                      <Input
                        value={formData.video_url || ''}
                        onChange={(e) => handleChange('video_url', e.target.value)}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="redirect" className="m-0 space-y-4">
                {step.step_type !== 'thankyou' ? (
                  <>
                    {/* Accept Redirect */}
                    <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                      <h4 className="font-medium text-emerald-700 dark:text-emerald-400">
                        Se ACEITAR a oferta
                      </h4>
                      <div className="space-y-2">
                        <Label>Próxima etapa do funil</Label>
                        <Select
                          value={formData.next_step_on_accept || 'none'}
                          onValueChange={(value) => handleChange('next_step_on_accept', value === 'none' ? null : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Continuar para..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Usar URL abaixo</SelectItem>
                            {otherSteps.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {STEP_CONFIG[s.step_type].label}: {s.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ou URL de redirecionamento</Label>
                        <Input
                          value={formData.accept_url || ''}
                          onChange={(e) => handleChange('accept_url', e.target.value)}
                          placeholder="https://..."
                          disabled={!!formData.next_step_on_accept}
                        />
                      </div>
                    </div>

                    {/* Decline Redirect */}
                    <div className="space-y-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <h4 className="font-medium text-red-700 dark:text-red-400">
                        Se RECUSAR a oferta
                      </h4>
                      <div className="space-y-2">
                        <Label>Próxima etapa do funil</Label>
                        <Select
                          value={formData.next_step_on_decline || 'none'}
                          onValueChange={(value) => handleChange('next_step_on_decline', value === 'none' ? null : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Continuar para..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Usar URL abaixo</SelectItem>
                            {otherSteps.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {STEP_CONFIG[s.step_type].label}: {s.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ou URL de redirecionamento</Label>
                        <Input
                          value={formData.decline_url || ''}
                          onChange={(e) => handleChange('decline_url', e.target.value)}
                          placeholder="https://..."
                          disabled={!!formData.next_step_on_decline}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Página de obrigado é o fim do funil</p>
                    <p className="text-xs mt-2">
                      Configure a URL de obrigado nas configurações do funil
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
