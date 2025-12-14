import { Puzzle } from "lucide-react";
import { UtmifySection } from "@/components/admin/UtmifySection";

const AdminIntegrations = () => {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Puzzle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-sm text-muted-foreground">Conecte gateways de pagamento e serviços externos</p>
        </div>
      </div>

      {/* Utmify Integration */}
      <UtmifySection />
    </>
  );
};

export default AdminIntegrations;
