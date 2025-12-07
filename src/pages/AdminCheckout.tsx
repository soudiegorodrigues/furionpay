import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, CreditCard, TrendingUp, Link, Copy, Check, Globe, Save, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";

interface PopupModelStats {
  popup_model: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

const popupModels = [
  { id: "boost", name: "Boost", description: "Modelo com animações e destaque visual" },
  { id: "simple", name: "Simples", description: "Modelo minimalista e direto" },
  { id: "clean", name: "Clean", description: "Design limpo e moderno" },
  { id: "direct", name: "Direto", description: "Foco no pagamento rápido" },
  { id: "hot", name: "Hot", description: "Design com urgência e destaque" },
  { id: "landing", name: "Landing", description: "Estilo página de vendas" },
  { id: "instituto", name: "Instituto", description: "Modelo institucional" },
];

const AdminCheckout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [popupStats, setPopupStats] = useState<PopupModelStats[]>([]);
  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("boost");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadData = async () => {
    try {
      // Load popup stats
      const { data: statsData } = await supabase.rpc('get_popup_model_stats');
      setPopupStats(statsData || []);

      // Load available domains
      const { data: domainsData } = await supabase
        .from('available_domains')
        .select('id, domain, name')
        .eq('is_active', true)
        .order('domain');
      setAvailableDomains(domainsData || []);

      // Load user settings
      const { data: settingsData } = await supabase.rpc('get_user_settings');
      if (settingsData) {
        const settings = settingsData as { key: string; value: string }[];
        const popupSetting = settings.find(s => s.key === 'popup_model');
        const domainSetting = settings.find(s => s.key === 'selected_domain');
        if (popupSetting?.value) setSelectedModel(popupSetting.value);
        if (domainSetting?.value) setSelectedDomain(domainSetting.value);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        supabase.rpc('update_user_setting', {
          setting_key: 'popup_model',
          setting_value: selectedModel
        }),
        supabase.rpc('update_user_setting', {
          setting_key: 'selected_domain',
          setting_value: selectedDomain
        })
      ]);
      toast({
        title: "Sucesso",
        description: "Configurações de checkout salvas!"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const copyLink = () => {
    const link = selectedDomain 
      ? `https://www.${selectedDomain}/?u=${user?.id || ''}&m=${selectedModel}` 
      : `${window.location.origin}/?u=${user?.id || ''}&m=${selectedModel}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para sua área de transferência"
    });
  };

  const getStatsForModel = (modelId: string) => {
    return popupStats.find(s => s.popup_model === modelId);
  };

  const generatedLink = selectedDomain 
    ? `https://www.${selectedDomain}/?u=${user?.id || ''}&m=${selectedModel}` 
    : `${window.location.origin}/?u=${user?.id || ''}&m=${selectedModel}`;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Modelos de Checkout</h1>
            <p className="text-sm text-muted-foreground">Selecione e personalize seu modelo de checkout</p>
          </div>
        </div>

        {/* Checkout Link Card */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Seu Link de Checkout
            </CardTitle>
            <CardDescription>
              Escolha o domínio e modelo, depois copie o link para compartilhar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Domain Selector */}
              {availableDomains.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Domínio
                  </Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um domínio" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDomains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          {domain.name ? `${domain.name} (${domain.domain})` : domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Model Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Modelo Selecionado
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {popupModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Generated Link */}
            <div className="space-y-2">
              <Label>Seu link</Label>
              <div className="flex gap-2">
                <Input 
                  value={generatedLink} 
                  readOnly 
                  className="font-mono text-sm" 
                />
                <Button variant="outline" onClick={copyLink}>
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popupModels.map((model) => {
            const stats = getStatsForModel(model.id);
            const isSelected = selectedModel === model.id;
            return (
              <Card 
                key={model.id} 
                className={`transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectModel(model.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {stats && stats.total_paid > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {stats.conversion_rate}%
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <div className="font-semibold text-blue-500">{stats.total_generated}</div>
                        <div className="text-xs text-muted-foreground">Gerados</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <div className="font-semibold text-green-500">{stats.total_paid}</div>
                        <div className="text-xs text-muted-foreground">Pagos</div>
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModel(model.id);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Popup Previews */}
      {previewModel === 'boost' && (
        <DonationPopup 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'simple' && (
        <DonationPopupSimple 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'clean' && (
        <DonationPopupClean 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'direct' && (
        <DonationPopupDirect 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'hot' && (
        <DonationPopupHot 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'landing' && (
        <DonationPopupLanding 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {previewModel === 'instituto' && (
        <DonationPopupInstituto 
          isOpen={true} 
          onClose={() => setPreviewModel(null)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCheckout;
