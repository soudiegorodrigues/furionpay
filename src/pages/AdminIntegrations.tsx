import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Puzzle, Check, Plus, ExternalLink } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "coming_soon";
  icon?: string;
  methods?: string[];
}

const integrations: Integration[] = [
  {
    id: "spedpay",
    name: "SpedPay",
    description: "Gateway de pagamento PIX integrado",
    status: "connected",
    methods: ["PIX"]
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Plataforma completa de cobranças",
    status: "coming_soon",
    methods: ["PIX", "Cartão", "Boleto"]
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description: "Soluções de pagamento digital",
    status: "coming_soon",
    methods: ["PIX", "Cartão"]
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Pagamentos internacionais",
    status: "coming_soon",
    methods: ["Cartão"]
  }
];

const AdminIntegrations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conecte gateways de pagamento e serviços externos</p>
          </div>
        </div>

        {/* Active Integrations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Integrações Ativas</h2>
            <Badge variant="secondary">1</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.status === "connected").map((integration) => (
              <Card key={integration.id} className="border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-primary">
                      {integration.name.toUpperCase()}
                    </CardTitle>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-600/10">
                      <Check className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métodos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.methods?.map((method) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Available Integrations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Disponível em Breve</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.status === "coming_soon").map((integration) => (
              <Card key={integration.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-muted-foreground">
                      {integration.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground">
                      Em breve
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métodos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.methods?.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs text-muted-foreground">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <Plus className="w-4 h-4 mr-2" />
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Novas integrações serão disponibilizadas em futuras atualizações. 
              Entre em contato com o suporte para solicitar integrações específicas.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrations;
