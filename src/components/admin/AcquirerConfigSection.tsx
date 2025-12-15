import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AcquirerConfigSectionProps {
  isAdmin: boolean;
}

export const AcquirerConfigSection = ({ isAdmin }: AcquirerConfigSectionProps) => {
  const [pixAcquirer, setPixAcquirer] = useState<string>('');
  const [cardAcquirer, setCardAcquirer] = useState<string>('');
  const [boletoAcquirer, setBoletoAcquirer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isSavingBoleto, setIsSavingBoleto] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [isAdmin]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      
      if (error) throw error;
      
      if (data) {
        const settings = data as { key: string; value: string }[];
        const pixConfig = settings.find(s => s.key === 'pix_acquirer');
        const cardConfig = settings.find(s => s.key === 'card_acquirer');
        const boletoConfig = settings.find(s => s.key === 'boleto_acquirer');
        const defaultAcq = settings.find(s => s.key === 'default_acquirer');
        
        setPixAcquirer(pixConfig?.value || defaultAcq?.value || 'ativus');
        setCardAcquirer(cardConfig?.value || '');
        setBoletoAcquirer(boletoConfig?.value || '');
      }
    } catch (error) {
      console.error('Error loading acquirer config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAcquirerConfig = async (method: 'pix' | 'card' | 'boleto', acquirer: string) => {
    const setSaving = method === 'pix' ? setIsSavingPix : method === 'card' ? setIsSavingCard : setIsSavingBoleto;
    setSaving(true);
    
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: `${method}_acquirer`,
        setting_value: acquirer
      });
      
      if (error) throw error;
      
      // If PIX, also update default_acquirer for backward compatibility
      if (method === 'pix') {
        await supabase.rpc('update_admin_setting_auth', {
          setting_key: 'default_acquirer',
          setting_value: acquirer
        });
      }
      
      const methodNames = { pix: 'PIX', card: 'CARTÃO', boleto: 'BOLETO' };
      const acquirerNames: Record<string, string> = { 
        ativus: 'Ativus Hub', 
        spedpay: 'SpedPay', 
        inter: 'Banco Inter' 
      };
      
      toast({
        title: "Configuração Salva",
        description: `${methodNames[method]} agora usa ${acquirerNames[acquirer] || acquirer}.`
      });
    } catch (error) {
      console.error('Error saving acquirer config:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Configuração de Adquirentes</CardTitle>
        <CardDescription className="text-sm">
          Aqui você pode definir as adquirentes para métodos de pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* PIX Card */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                    <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                    <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                    <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                    <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                  </svg>
                </div>
                <span className="font-semibold text-emerald-600">PIX</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Adquirente</Label>
                {isLoading ? (
                  <div className="h-9 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select value={pixAcquirer} onValueChange={setPixAcquirer}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativus">Ativus Hub</SelectItem>
                      <SelectItem value="spedpay">SpedPay</SelectItem>
                      <SelectItem value="inter">Banco Inter</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => saveAcquirerConfig('pix', pixAcquirer)}
                disabled={isSavingPix || isLoading}
              >
                {isSavingPix ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Aplicar alterações
              </Button>
            </CardContent>
          </Card>

          {/* CARTÃO Card */}
          <Card className="border-dashed opacity-60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <span className="font-semibold text-blue-600">CARTÃO</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Adquirente</Label>
                <Select disabled value={cardAcquirer} onValueChange={setCardAcquirer}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Em breve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Em breve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled
              >
                Aplicar alterações
              </Button>
            </CardContent>
          </Card>

          {/* BOLETO Card */}
          <Card className="border-dashed opacity-60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <span className="font-semibold text-amber-600">BOLETO</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Adquirente</Label>
                <Select disabled value={boletoAcquirer} onValueChange={setBoletoAcquirer}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Em breve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Em breve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled
              >
                Aplicar alterações
              </Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
