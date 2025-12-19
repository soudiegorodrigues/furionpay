import { AcquirerConfigSection } from "./AcquirerConfigSection";
import { RetryConfigSection } from "./RetryConfigSection";
import { RetryDashboardSection } from "./RetryDashboardSection";
import { GatewayConfigSection } from "./GatewayConfigSection";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const MultiAcquirersSection = () => {
  const { isAdmin } = useAdminAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* 1. Configuração de Adquirente Principal por Método de Pagamento */}
      <AcquirerConfigSection isAdmin={isAdmin} />

      {/* 2. Configuração de Retentativas (máximo 3 adquirentes) */}
      <RetryConfigSection />

      {/* 3. Dashboard de Retentativas - Monitoramento em tempo real */}
      <RetryDashboardSection />

      {/* 4. Configurações de Gateways (API Keys, Taxas, Testar conexão) */}
      <GatewayConfigSection />
    </div>
  );
};
