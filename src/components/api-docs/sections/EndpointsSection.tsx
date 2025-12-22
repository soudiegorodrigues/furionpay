import { CodeBlock, CodeComparison } from '../CodeBlock';
import { MethodBadge } from '../MethodBadge';
import { ParameterTable } from '../ParameterTable';
import { EndpointCard } from '../EndpointCard';

export const EndpointsSection = () => {
  const createPixRequest = `{
  "amount": 150.00,
  "description": "Compra de produto XYZ",
  "external_reference": "pedido-123",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "document": "12345678900"
  },
  "metadata": {
    "order_id": "123",
    "custom_field": "valor"
  }
}`;

  const createPixResponse = `{
  "success": true,
  "data": {
    "txid": "PIX123456789",
    "pix_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_url": "https://api.qrserver.com/...",
    "amount": 150.00,
    "external_reference": "pedido-123",
    "status": "pending",
    "expires_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
}`;

  const checkStatusResponse = `{
  "success": true,
  "data": {
    "txid": "PIX123456789",
    "external_reference": "pedido-123",
    "amount": 150.00,
    "status": "paid",
    "paid_at": "2024-01-15T10:25:30Z",
    "expired_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "metadata": {}
  }
}`;

  const createPixParams = [
    { name: 'amount', type: 'number', required: true, description: 'Valor do PIX em reais (mínimo: R$ 0,50)' },
    { name: 'description', type: 'string', required: false, description: 'Descrição do pagamento (exibida no PIX)' },
    { name: 'external_reference', type: 'string', required: false, description: 'ID externo para referência no seu sistema' },
    { name: 'customer', type: 'object', required: false, description: 'Dados do cliente (objeto)' },
    { name: 'customer.name', type: 'string', required: false, description: 'Nome completo do cliente' },
    { name: 'customer.email', type: 'string', required: false, description: 'E-mail do cliente' },
    { name: 'customer.document', type: 'string', required: false, description: 'CPF/CNPJ do cliente (apenas números)' },
    { name: 'metadata', type: 'object', required: false, description: 'Dados adicionais em formato chave-valor' },
  ];

  // Note: PIX expires in 30 minutes after creation

  const statusParams = [
    { name: 'txid', type: 'string', required: true, description: 'ID da transação retornado na criação do PIX' },
  ];

  const responseParams = [
    { name: 'txid', type: 'string', required: true, description: 'Identificador único da transação PIX' },
    { name: 'pix_code', type: 'string', required: true, description: 'Código copia e cola do PIX' },
    { name: 'qr_code_url', type: 'string', required: true, description: 'URL da imagem do QR Code' },
    { name: 'amount', type: 'number', required: true, description: 'Valor do PIX em reais' },
    { name: 'external_reference', type: 'string', required: false, description: 'Referência externa enviada na criação' },
    { name: 'status', type: 'string', required: true, description: 'Status da transação' },
    { name: 'expires_at', type: 'string', required: true, description: 'Data de expiração em ISO 8601' },
    { name: 'created_at', type: 'string', required: true, description: 'Data de criação em ISO 8601' },
  ];

  return (
    <section id="endpoints" className="scroll-mt-20 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Endpoints</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            REST API
          </span>
        </div>
        <p className="text-muted-foreground">
          A API FurionPay oferece endpoints RESTful para criar e gerenciar pagamentos PIX.
          Todos os endpoints utilizam JSON para request e response bodies.
        </p>
      </div>

      {/* Quick reference */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h3 className="text-sm font-semibold">Referência Rápida</h3>
        </div>
        <div className="divide-y divide-border">
          <a 
            href="#create-pix" 
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
          >
            <MethodBadge method="POST" size="sm" />
            <code className="text-sm font-mono flex-1">/api-v1-pix-create</code>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Criar PIX
            </span>
          </a>
          <a 
            href="#check-status" 
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
          >
            <MethodBadge method="GET" size="sm" />
            <code className="text-sm font-mono flex-1">/api-v1-pix-status</code>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Consultar Status
            </span>
          </a>
        </div>
      </div>

      {/* Create PIX Endpoint */}
      <EndpointCard
        id="create-pix"
        method="POST"
        endpoint="/api-v1-pix-create"
        title="Criar PIX"
        description="Cria uma nova cobrança PIX e retorna o código copia e cola e QR Code."
      >
        <ParameterTable parameters={createPixParams} title="Body Parameters" />

        <CodeComparison
          request={{ code: createPixRequest, language: 'json' }}
          response={{ code: createPixResponse, language: 'json' }}
        />

        <ParameterTable parameters={responseParams} title="Response Fields" />
      </EndpointCard>

      {/* Check Status Endpoint */}
      <EndpointCard
        id="check-status"
        method="GET"
        endpoint="/api-v1-pix-status"
        title="Consultar Status"
        description="Consulta o status de uma transação PIX existente."
      >
        <ParameterTable parameters={statusParams} title="Query Parameters" />

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">←</span>
            <h4 className="text-sm font-semibold">Response</h4>
          </div>
          <CodeBlock code={checkStatusResponse} language="json" />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Status possíveis</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { status: 'pending', label: 'Aguardando pagamento', color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
              { status: 'paid', label: 'Pagamento confirmado', color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
              { status: 'expired', label: 'PIX expirado (30 min)', color: 'bg-muted text-muted-foreground border-border' },
            ].map((s) => (
              <div key={s.status} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${s.color}`}>
                  {s.status}
                </span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⏱️ O PIX expira automaticamente após <strong>30 minutos</strong> se não for pago.
          </p>
        </div>
      </EndpointCard>
    </section>
  );
};
