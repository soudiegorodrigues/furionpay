export const RateLimitsSection = () => {
  return (
    <section id="rate-limits" className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
      <p className="text-muted-foreground mb-6">
        Para garantir a estabilidade da plataforma, aplicamos limites de requisições por API Key.
      </p>

      <div className="space-y-6">
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Plano</th>
                <th className="text-left px-4 py-2 font-medium">Limite</th>
                <th className="text-left px-4 py-2 font-medium">Janela</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-background">
                <td className="px-4 py-2 font-medium">Padrão</td>
                <td className="px-4 py-2">60 requisições</td>
                <td className="px-4 py-2 text-muted-foreground">Por minuto</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2 font-medium">Enterprise</td>
                <td className="px-4 py-2">300 requisições</td>
                <td className="px-4 py-2 text-muted-foreground">Por minuto</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Headers de Rate Limit</h3>
          <p className="text-muted-foreground mb-4">
            Cada resposta inclui headers para monitorar seu uso:
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Header</th>
                  <th className="text-left px-4 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-background">
                  <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Limit</td>
                  <td className="px-4 py-2 text-muted-foreground">Limite total de requisições</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Remaining</td>
                  <td className="px-4 py-2 text-muted-foreground">Requisições restantes na janela atual</td>
                </tr>
                <tr className="bg-background">
                  <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Reset</td>
                  <td className="px-4 py-2 text-muted-foreground">Timestamp Unix de quando o limite reseta</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Ao atingir o limite</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Você receberá resposta HTTP 429 (Too Many Requests)</li>
            <li>• O header <code className="bg-muted px-1 rounded">Retry-After</code> indica quantos segundos aguardar</li>
            <li>• Implemente exponential backoff para retry automático</li>
            <li>• Contate o suporte para aumentar seu limite se necessário</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Boas Práticas</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border border-border">
              <h4 className="font-medium mb-2">✅ Faça</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Cache respostas quando possível</li>
                <li>• Use webhooks ao invés de polling</li>
                <li>• Implemente retry com backoff</li>
                <li>• Monitore os headers de rate limit</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <h4 className="font-medium mb-2">❌ Evite</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Requisições em loop sem delay</li>
                <li>• Polling frequente de status</li>
                <li>• Requisições paralelas excessivas</li>
                <li>• Ignorar erros 429</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
