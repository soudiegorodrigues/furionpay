import { useState } from "react";
import { AcquirerConfigSection } from "./AcquirerConfigSection";
import { RetryConfigSection } from "./RetryConfigSection";
import { GatewayConfigSection } from "./GatewayConfigSection";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Key, Network } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MULTI_KEYWORD = "MELCHIADES";
const MULTI_ACQUIRER_AUTH_KEY = 'multi_acquirer_authenticated';

export const MultiAcquirersSection = () => {
  const { isAdmin } = useAdminAuth();
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(MULTI_ACQUIRER_AUTH_KEY) === 'true';
  });
  const [showKeywordDialog, setShowKeywordDialog] = useState(() => {
    return sessionStorage.getItem(MULTI_ACQUIRER_AUTH_KEY) !== 'true';
  });
  const [keyword, setKeyword] = useState("");

  const handleKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.toUpperCase() === MULTI_KEYWORD) {
      sessionStorage.setItem(MULTI_ACQUIRER_AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setShowKeywordDialog(false);
      setKeyword("");
      toast({
        title: "Acesso autorizado",
        description: "Você agora tem acesso às configurações de multi-adquirência.",
      });
    } else {
      toast({
        title: "Palavra-chave incorreta",
        description: "A palavra-chave informada não corresponde.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Keyword Dialog */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              Esta área contém configurações sensíveis de gateway. Digite a palavra-chave secreta para continuar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleKeywordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input
                id="keyword"
                type="password"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Digite a palavra-chave secreta"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={!keyword}>
                <Lock className="w-4 h-4 mr-2" />
                Verificar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Locked State Card */}
      {!isAuthenticated && !showKeywordDialog && (
        <div className="max-w-5xl mx-auto">
          <Card className="w-full border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Multi-adquirência</CardTitle>
                  <CardDescription>Área protegida - autenticação necessária</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowKeywordDialog(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Desbloquear Acesso
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Only show after authentication */}
      {isAuthenticated && (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 1. Configuração de Adquirente Principal por Método de Pagamento */}
          <AcquirerConfigSection isAdmin={isAdmin} />

          {/* 2. Configuração de Retentativas (máximo 3 adquirentes) */}
          <RetryConfigSection />

          {/* 3. Configurações de Gateways (API Keys, Taxas, Testar conexão) */}
          <GatewayConfigSection />
        </div>
      )}
    </>
  );
};
