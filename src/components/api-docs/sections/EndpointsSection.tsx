import { CodeBlock } from '../CodeBlock';
import { MethodBadge } from '../MethodBadge';
import { ParameterTable } from '../ParameterTable';

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
    { name: 'amount', type: 'number', required: true, description: 'Valor do PIX em reais (mínimo: 0.50)' },
    { name: 'description', type: 'string', required: false, description: 'Descrição do pagamento' },
    { name: 'external_reference', type: 'string', required: false, description: 'ID externo para referência no seu sistema' },
    { name: 'customer', type: 'object', required: false, description: 'Dados do cliente (objeto)' },
    { name: 'customer.name', type: 'string', required: false, description: 'Nome completo do cliente' },
    { name: 'customer.email', type: 'string', required: false, description: 'E-mail do cliente' },
    { name: 'customer.document', type: 'string', required: false, description: 'CPF/CNPJ do cliente (apenas números)' },
    { name: 'metadata', type: 'object', required: false, description: 'Dados adicionais em formato chave-valor' },
  ];

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
    <section id="endpoints" className="scroll-mt-20 space-y-12">
      <div>
        <h2 className="text-2xl font-bold mb-4">Endpoints</h2>
        <p className="text-muted-foreground mb-6">
          A API FurionPay oferece endpoints para criar e gerenciar pagamentos PIX.
        </p>
      </div>

      {/* Create PIX */}
      <div id="create-pix" className="scroll-mt-20">
        <div className="flex items-center gap-3 mb-4">
          <MethodBadge method="POST" />
          <code className="text-lg font-mono">/api-v1-pix-create</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Cria uma nova cobrança PIX e retorna o código copia e cola e QR Code.
        </p>

        <ParameterTable parameters={createPixParams} title="Body Parameters" />

        <div className="grid gap-4 lg:grid-cols-2 mt-6">
          <div>
            <h4 className="text-sm font-semibold mb-2">Request</h4>
            <CodeBlock code={createPixRequest} language="json" />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Response</h4>
            <CodeBlock code={createPixResponse} language="json" />
          </div>
        </div>

        <div className="mt-6">
          <ParameterTable parameters={responseParams} title="Response Fields" />
        </div>
      </div>

      {/* Check Status */}
      <div id="check-status" className="scroll-mt-20">
        <div className="flex items-center gap-3 mb-4">
          <MethodBadge method="GET" />
          <code className="text-lg font-mono">/api-v1-pix-status</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Consulta o status de uma transação PIX existente.
        </p>

        <ParameterTable parameters={statusParams} title="Query Parameters" />

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">Response</h4>
          <CodeBlock code={checkStatusResponse} language="json" />
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Status possíveis</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { status: 'pending', label: 'Aguardando', color: 'bg-amber-500/20 text-amber-600' },
              { status: 'paid', label: 'Pago', color: 'bg-emerald-500/20 text-emerald-600' },
              { status: 'expired', label: 'Expirado', color: 'bg-gray-500/20 text-gray-600' },
              { status: 'cancelled', label: 'Cancelado', color: 'bg-red-500/20 text-red-600' },
            ].map((s) => (
              <div key={s.status} className="flex items-center gap-2 p-2 rounded border border-border">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
                  {s.status}
                </span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
