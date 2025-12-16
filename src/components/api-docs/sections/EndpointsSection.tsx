import { CodeBlock } from '../CodeBlock';
import { MethodBadge } from '../MethodBadge';
import { ParameterTable } from '../ParameterTable';

export const EndpointsSection = () => {
  const createPixRequest = `{
  "amount": 150.00,
  "customer_name": "João Silva",
  "customer_email": "joao@email.com",
  "customer_document": "12345678900",
  "external_id": "pedido-123",
  "description": "Compra de produto XYZ"
}`;

  const createPixResponse = `{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "txid": "PIX123456789",
    "pix_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_base64": "data:image/png;base64,...",
    "amount": 150.00,
    "status": "pending",
    "expires_at": "2024-01-15T10:30:00Z"
  }
}`;

  const checkStatusResponse = `{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "txid": "PIX123456789",
    "status": "paid",
    "amount": 150.00,
    "paid_at": "2024-01-15T10:25:30Z",
    "customer_name": "João Silva"
  }
}`;

  const createPixParams = [
    { name: 'amount', type: 'number', required: true, description: 'Valor do PIX em reais (mínimo: 0.50)' },
    { name: 'customer_name', type: 'string', required: true, description: 'Nome completo do cliente' },
    { name: 'customer_email', type: 'string', required: false, description: 'E-mail do cliente' },
    { name: 'customer_document', type: 'string', required: false, description: 'CPF/CNPJ do cliente (apenas números)' },
    { name: 'external_id', type: 'string', required: false, description: 'ID externo para referência no seu sistema' },
    { name: 'description', type: 'string', required: false, description: 'Descrição do pagamento' },
  ];

  const statusParams = [
    { name: 'txid', type: 'string', required: true, description: 'ID da transação retornado na criação do PIX' },
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
