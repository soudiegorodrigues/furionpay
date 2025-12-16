import { CodeBlock } from '../CodeBlock';

export const AuthenticationSection = () => {
  const authExample = `curl -X POST https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1/api-v1-pix-create \\
  -H "Authorization: Bearer fp_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 100.00}'`;

  return (
    <section id="authentication" className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4">Autenticação</h2>
      <p className="text-muted-foreground mb-6">
        Todas as requisições à API devem incluir sua API Key no header de autorização.
        Suas API Keys são secretas - não compartilhe em código público.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Obtendo sua API Key</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Acesse o painel FurionPay</li>
            <li>Navegue até <strong className="text-foreground">Integrações → API Keys</strong></li>
            <li>Clique em <strong className="text-foreground">"Criar nova API Key"</strong></li>
            <li>Copie e guarde sua chave em local seguro</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Usando a API Key</h3>
          <p className="text-muted-foreground mb-4">
            Inclua sua API Key no header <code className="bg-muted px-1.5 py-0.5 rounded text-sm">Authorization</code> 
            usando o esquema Bearer:
          </p>
          <CodeBlock code={authExample} language="bash" title="Exemplo de autenticação" />
        </div>

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Segurança</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Nunca exponha sua API Key em código frontend ou repositórios públicos</li>
            <li>• Use variáveis de ambiente para armazenar suas chaves</li>
            <li>• Revogue imediatamente chaves comprometidas</li>
            <li>• Cada API Key tem um prefixo único para identificação (ex: fp_live_...)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Formato da API Key</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">Prefixo</th>
                  <th className="text-left px-4 py-2">Ambiente</th>
                  <th className="text-left px-4 py-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2 font-mono">fp_live_</td>
                  <td className="px-4 py-2">Produção</td>
                  <td className="px-4 py-2 text-muted-foreground">Transações reais</td>
                </tr>
                <tr className="border-t border-border bg-muted/20">
                  <td className="px-4 py-2 font-mono">fp_test_</td>
                  <td className="px-4 py-2">Teste</td>
                  <td className="px-4 py-2 text-muted-foreground">Ambiente de sandbox</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
