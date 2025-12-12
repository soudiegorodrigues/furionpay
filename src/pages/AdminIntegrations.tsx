import { Puzzle } from "lucide-react";

const AdminIntegrations = () => {
  return (
    <>
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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Puzzle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma integração disponível</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configure seus adquirentes de pagamento na seção "Multi-adquirentes" no painel Admin.
        </p>
      </div>
    </>
  );
};

export default AdminIntegrations;
