import { CodeBlock } from '../CodeBlock';

export const IntroductionSection = () => {
  const quickStartCode = `curl -X POST https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1/api-v1-pix-create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100.00,
    "customer_name": "João Silva",
    "customer_email": "joao@email.com",
    "customer_document": "12345678900"
  }'`;

  return (
    <section id="introduction" className="scroll-mt-20">
      <h1 className="text-3xl font-bold mb-4">Documentação da API FurionPay</h1>
      <p className="text-lg text-muted-foreground mb-6">
        A API FurionPay permite integrar pagamentos PIX em sua aplicação de forma simples e segura.
        Com nossa API REST, você pode criar cobranças, consultar status de transações e receber
        notificações em tempo real via webhooks.
      </p>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl mb-2">🚀</div>
          <h3 className="font-semibold mb-1">Rápido</h3>
          <p className="text-sm text-muted-foreground">
            Integração em minutos com documentação clara e exemplos práticos.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl mb-2">🔒</div>
          <h3 className="font-semibold mb-1">Seguro</h3>
          <p className="text-sm text-muted-foreground">
            Autenticação via API Key com assinatura HMAC para webhooks.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-semibold mb-1">Confiável</h3>
          <p className="text-sm text-muted-foreground">
            Alta disponibilidade com múltiplos adquirentes e retry automático.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Início Rápido</h2>
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</div>
          <div>
            <h4 className="font-medium">Crie sua conta</h4>
            <p className="text-sm text-muted-foreground">Acesse o painel FurionPay e crie sua conta de desenvolvedor.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</div>
          <div>
            <h4 className="font-medium">Gere sua API Key</h4>
            <p className="text-sm text-muted-foreground">No painel, acesse Integrações &gt; API Keys e gere sua chave.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</div>
          <div>
            <h4 className="font-medium">Faça sua primeira requisição</h4>
            <p className="text-sm text-muted-foreground">Use o exemplo abaixo para criar seu primeiro PIX.</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CodeBlock code={quickStartCode} language="bash" title="Exemplo de requisição" />
      </div>

      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold text-primary mb-2">Base URL</h4>
        <code className="text-sm bg-muted px-2 py-1 rounded">
          https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1
        </code>
      </div>
    </section>
  );
};
