import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, CreditCard, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [popupStats, setPopupStats] = useState<PopupModelStats[]>([]);
  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadPopupStats();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadPopupStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_popup_model_stats');
      if (error) throw error;
      setPopupStats(data || []);
    } catch (error) {
      console.error('Error loading popup stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatsForModel = (modelId: string) => {
    return popupStats.find(s => s.popup_model === modelId);
  };

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
            <p className="text-sm text-muted-foreground">Visualize e compare todos os modelos de popup disponíveis</p>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popupModels.map((model) => {
            const stats = getStatsForModel(model.id);
            return (
              <Card key={model.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
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
                    onClick={() => setPreviewModel(model.id)}
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
