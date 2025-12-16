import { CodeBlock } from '../CodeBlock';
import { ParameterTable } from '../ParameterTable';

export const WebhooksSection = () => {
  const webhookPayload = `{
  "event": "payment.paid",
  "created_at": "2024-01-15T10:25:30Z",
  "data": {
    "txid": "PIX123456789",
    "external_reference": "pedido-123",
    "amount": 150.00,
    "status": "paid",
    "paid_at": "2024-01-15T10:25:30Z",
    "created_at": "2024-01-15T10:00:00Z",
    "metadata": {}
  }
}`;

  const signatureVerification = `import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// No seu endpoint de webhook
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-furionpay-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Processar o evento
  const { event, data } = req.body;
  
  if (event === 'payment.paid') {
    // Atualizar pedido como pago
    // Use data.txid para identificar a transação
    // Use data.external_reference para mapear ao seu pedido
  }
  
  res.status(200).json({ received: true });
});`;

  const webhookParams = [
    { name: 'event', type: 'string', required: true, description: 'Tipo do evento (ex: payment.paid)' },
    { name: 'created_at', type: 'string', required: true, description: 'Data/hora do evento em ISO 8601' },
    { name: 'data', type: 'object', required: true, description: 'Dados da transação' },
  ];

  const dataParams = [
    { name: 'data.txid', type: 'string', required: true, description: 'Identificador único da transação' },
    { name: 'data.external_reference', type: 'string', required: false, description: 'Referência externa enviada na criação' },
    { name: 'data.amount', type: 'number', required: true, description: 'Valor da transação em reais' },
    { name: 'data.status', type: 'string', required: true, description: 'Status atual da transação' },
    { name: 'data.paid_at', type: 'string', required: false, description: 'Data de pagamento (se pago)' },
    { name: 'data.created_at', type: 'string', required: true, description: 'Data de criação da transação' },
    { name: 'data.metadata', type: 'object', required: false, description: 'Dados adicionais enviados na criação' },
  ];

  const events = [
    { event: 'payment.created', description: 'PIX foi criado e está aguardando pagamento' },
    { event: 'payment.paid', description: 'PIX foi pago com sucesso' },
    { event: 'payment.expired', description: 'PIX expirou sem pagamento' },
    { event: 'payment.cancelled', description: 'PIX foi cancelado' },
  ];

  return (
    <section id="webhooks" className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
      <p className="text-muted-foreground mb-6">
        Webhooks permitem que você receba notificações em tempo real sobre eventos
        de pagamento. Configure sua URL de webhook no painel FurionPay.
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">Configurando Webhooks</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Acesse <strong className="text-foreground">Integrações → API Keys</strong></li>
            <li>Selecione sua API Key e clique em <strong className="text-foreground">"Configurar Webhook"</strong></li>
            <li>Insira sua URL de webhook (deve ser HTTPS)</li>
            <li>Copie o Webhook Secret para validar as assinaturas</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Eventos Disponíveis</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Evento</th>
                  <th className="text-left px-4 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.event} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-2 font-mono text-xs">{e.event}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Payload do Webhook</h3>
          <ParameterTable parameters={webhookParams} />
          <div className="mt-4">
            <ParameterTable parameters={dataParams} title="Campos do objeto data" />
          </div>
          <div className="mt-4">
            <CodeBlock code={webhookPayload} language="json" title="Exemplo de payload" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Validando a Assinatura</h3>
          <p className="text-muted-foreground mb-4">
            Sempre valide a assinatura HMAC-SHA256 no header <code className="bg-muted px-1.5 py-0.5 rounded text-sm">X-FurionPay-Signature</code> 
            para garantir que o webhook foi enviado pela FurionPay.
          </p>
          <CodeBlock code={signatureVerification} language="javascript" title="Node.js" />
        </div>

        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 Boas Práticas</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Responda rapidamente (HTTP 200) e processe em background</li>
            <li>• Implemente idempotência usando o txid</li>
            <li>• Use external_reference para mapear transações ao seu sistema</li>
            <li>• Retentativas automáticas são feitas por até 24h em caso de falha</li>
            <li>• Use HTTPS com certificado válido</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
