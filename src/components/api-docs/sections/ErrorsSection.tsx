export const ErrorsSection = () => {
  const errors = [
    { code: 400, name: 'Bad Request', description: 'Requisição inválida. Verifique os parâmetros enviados.' },
    { code: 401, name: 'Unauthorized', description: 'API Key inválida ou não fornecida.' },
    { code: 403, name: 'Forbidden', description: 'API Key não tem permissão para este recurso.' },
    { code: 404, name: 'Not Found', description: 'Transação não encontrada.' },
    { code: 422, name: 'Unprocessable Entity', description: 'Dados válidos mas não processáveis (ex: valor mínimo).' },
    { code: 429, name: 'Too Many Requests', description: 'Limite de requisições excedido. Aguarde antes de tentar novamente.' },
    { code: 500, name: 'Internal Server Error', description: 'Erro interno. Entre em contato com o suporte.' },
    { code: 503, name: 'Service Unavailable', description: 'Serviço temporariamente indisponível.' },
  ];

  const errorCodes = [
    { code: 'UNAUTHORIZED', description: 'API Key não fornecida ou inválida' },
    { code: 'INVALID_API_KEY', description: 'API Key não encontrada ou desativada' },
    { code: 'INVALID_REQUEST', description: 'Corpo da requisição inválido ou mal formatado' },
    { code: 'AMOUNT_TOO_LOW', description: 'Valor mínimo para PIX é R$ 0,50' },
    { code: 'MISSING_TXID', description: 'ID da transação (txid) não fornecido' },
    { code: 'TRANSACTION_NOT_FOUND', description: 'Transação não encontrada ou não pertence à sua conta' },
    { code: 'PIX_GENERATION_FAILED', description: 'Falha ao gerar PIX no processador de pagamento' },
    { code: 'RATE_LIMIT_EXCEEDED', description: 'Limite de requisições excedido' },
    { code: 'INTERNAL_ERROR', description: 'Erro interno do servidor' },
  ];

  return (
    <section id="errors" className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4">Códigos de Erro</h2>
      <p className="text-muted-foreground mb-6">
        A API usa códigos HTTP padrão para indicar sucesso ou falha das requisições.
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">Códigos HTTP</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium w-20">Código</th>
                  <th className="text-left px-4 py-2 font-medium w-40">Nome</th>
                  <th className="text-left px-4 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error, i) => (
                  <tr key={error.code} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        error.code < 400 ? 'bg-emerald-500/20 text-emerald-600' :
                        error.code < 500 ? 'bg-amber-500/20 text-amber-600' :
                        'bg-red-500/20 text-red-600'
                      }`}>
                        {error.code}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">{error.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{error.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Códigos de Erro Específicos</h3>
          <p className="text-muted-foreground mb-4">
            Além dos códigos HTTP, a resposta inclui um campo <code className="bg-muted px-1.5 py-0.5 rounded text-sm">error_code</code> 
            para identificar erros específicos.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Código</th>
                  <th className="text-left px-4 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((error, i) => (
                  <tr key={error.code} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-2 font-mono text-xs">{error.code}</td>
                    <td className="px-4 py-2 text-muted-foreground">{error.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <h4 className="font-semibold mb-2">Formato da Resposta de Erro</h4>
          <pre className="text-sm overflow-x-auto">
            <code>{`{
  "success": false,
  "error": {
    "code": "AMOUNT_TOO_LOW",
    "message": "O valor mínimo para PIX é R$ 0,50"
  }
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};