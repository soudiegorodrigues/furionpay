import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TrendingUp, Eye, BarChart3 } from "lucide-react";
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
  {
    id: "boost",
    name: "Boost",
    description: "Modelo com animações e destaque visual",
    hasDynamicAmount: false
  },
  {
    id: "simple",
    name: "Simples",
    description: "Modelo minimalista e direto",
    hasDynamicAmount: false
  },
  {
    id: "clean",
    name: "Clean",
    description: "Design limpo e moderno",
    hasDynamicAmount: false
  },
  {
    id: "direct",
    name: "Direto",
    description: "Foco no pagamento rápido",
    hasDynamicAmount: true
  },
  {
    id: "hot",
    name: "Hot",
    description: "Design com urgência e destaque",
    hasDynamicAmount: true
  },
  {
    id: "landing",
    name: "Modelo Vakinha",
    description: "Estilo página de vendas",
    hasDynamicAmount: false
  },
  {
    id: "instituto",
    name: "Instituto",
    description: "Modelo institucional",
    hasDynamicAmount: false
  }
];

export const CheckoutGlobalSection = () => {
  const [popupStats, setPopupStats] = useState<PopupModelStats[]>([]);
  const [previewModel, setPreviewModel] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalStats();
  }, []);

  const loadGlobalStats = async () => {
    try {
      const { data: statsData } = await supabase.rpc('get_popup_model_stats');
      setPopupStats(statsData || []);
    } catch (error) {
      console.error('Error loading global popup stats:', error);
    }
  };

  const getStatsForModel = (modelId: string) => {
    return popupStats.find(s => s.popup_model === modelId);
  };

  // Calculate totals
  const totalGenerated = popupStats.reduce((sum, s) => sum + (s.total_generated || 0), 0);
  const totalPaid = popupStats.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const globalConversionRate = totalGenerated > 0 ? ((totalPaid / totalGenerated) * 100).toFixed(1) : "0";

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Conversão Global de Popups</h2>
            <p className="text-sm text-muted-foreground">Performance de todos os modelos de checkout</p>
          </div>
        </div>

        {/* Global Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-500">{totalGenerated}</div>
              <div className="text-sm text-muted-foreground">Total Gerados</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500">{totalPaid}</div>
              <div className="text-sm text-muted-foreground">Total Pagos</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-500">{globalConversionRate}%</div>
              <div className="text-sm text-muted-foreground">Conversão Global</div>
            </CardContent>
          </Card>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popupModels.map(model => {
            const stats = getStatsForModel(model.id);
            return (
              <Card key={model.id} className="hover:border-primary/50 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    {stats && stats.total_paid > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {stats.conversion_rate}%
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">{model.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="font-semibold text-blue-500 text-sm">{stats?.total_generated || 0}</div>
                      <div className="text-xs text-muted-foreground">Gerados</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="font-semibold text-green-500 text-sm">{stats?.total_paid || 0}</div>
                      <div className="text-xs text-muted-foreground">Pagos</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="font-semibold text-amber-500 text-sm">{stats?.conversion_rate || 0}%</div>
                      <div className="text-xs text-muted-foreground">Conversão</div>
                    </div>
                  </div>

                  {model.hasDynamicAmount && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-sm">💡</span>
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          <strong>Valores dinâmicos:</strong> <code className="bg-muted px-1 rounded">&amount=VALOR</code>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
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
      {previewModel === "boost" && (
        <DonationPopup
          isOpen={true}
          onClose={() => setPreviewModel(null)}
          recipientName="Preview"
          userId=""
          showCloseButton={true}
        />
      )}
      {previewModel === "simple" && (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => setPreviewModel(null)}
          recipientName="Preview"
          userId=""
          showCloseButton={true}
        />
      )}
      {previewModel === "clean" && (
        <DonationPopupClean
          isOpen={true}
          onClose={() => setPreviewModel(null)}
          recipientName="Preview"
          userId=""
          showCloseButton={true}
        />
      )}
      {previewModel === "direct" && (
        <DonationPopupDirect
          isOpen={true}
          onClose={() => setPreviewModel(null)}
          userId=""
          fixedAmount={100}
          showCloseButton={true}
        />
      )}
      {previewModel === "hot" && (
        <DonationPopupHot
          isOpen={true}
          onClose={() => setPreviewModel(null)}
          userId=""
          fixedAmount={100}
          showCloseButton={true}
        />
      )}
      <Dialog open={previewModel === "landing"} onOpenChange={(open) => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <div className="relative">
            <DonationPopupLanding
              isOpen={true}
              onClose={() => setPreviewModel(null)}
              userId=""
              showCloseButton={false}
              isPreview={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewModel === "instituto"} onOpenChange={(open) => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <div className="relative">
            <DonationPopupInstituto
              isOpen={true}
              onClose={() => setPreviewModel(null)}
              userId=""
              showCloseButton={false}
              isPreview={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
