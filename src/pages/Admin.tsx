import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Globe, 
  CreditCard, 
  Users, 
  FileText, 
  Percent, 
  Palette,
  Loader2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GlobalStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
}

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign },
  { id: "dominios", title: "Domínios", icon: Globe },
  { id: "multi", title: "Multi-adquirência", icon: CreditCard },
  { id: "usuarios", title: "Usuários", icon: Users },
  { id: "documentos", title: "Documentos", icon: FileText },
  { id: "taxas", title: "Taxas", icon: Percent },
  { id: "personalizacao", title: "Personalização", icon: Palette },
];

const Admin = () => {
  const [activeSection, setActiveSection] = useState<string>("faturamento");
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeSection === "faturamento") {
      loadGlobalStats();
    }
  }, [activeSection]);

  const loadGlobalStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_dashboard_auth');
      if (error) throw error;
      setGlobalStats(data as unknown as GlobalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const conversionRate = globalStats && globalStats.total_generated > 0 
    ? ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1) 
    : '0';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        
        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-3">
          {adminSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </Button>
          ))}
        </div>

        {/* Content Sections */}
        {activeSection === "faturamento" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Faturamento Global
              </CardTitle>
              <Button variant="outline" size="sm" onClick={loadGlobalStats} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : globalStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-3xl font-bold text-blue-500">
                      {globalStats.total_generated}
                    </div>
                    <p className="text-sm text-muted-foreground">PIX Gerados</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(globalStats.total_amount_generated)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-3xl font-bold text-green-500">
                      {globalStats.total_paid}
                    </div>
                    <p className="text-sm text-muted-foreground">PIX Pagos</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(globalStats.total_amount_paid)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-500">
                      {conversionRate}%
                    </div>
                    <p className="text-sm text-muted-foreground">Conversão</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-3xl font-bold text-red-500">
                      {globalStats.total_expired}
                    </div>
                    <p className="text-sm text-muted-foreground">Expirados</p>
                  </div>

                  {/* Today Stats */}
                  <div className="col-span-2 lg:col-span-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3">Hoje</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-500">
                          {globalStats.today_generated}
                        </div>
                        <p className="text-sm text-muted-foreground">Gerados Hoje</p>
                      </div>
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                          {globalStats.today_paid}
                        </div>
                        <p className="text-sm text-muted-foreground">Pagos Hoje</p>
                      </div>
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(globalStats.today_amount_paid)}
                        </div>
                        <p className="text-sm text-muted-foreground">Recebido Hoje</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "dominios" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Domínios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "multi" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Multi-adquirência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "usuarios" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "documentos" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "taxas" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taxas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "personalizacao" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Personalização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Admin;
