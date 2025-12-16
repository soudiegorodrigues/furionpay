import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Book, 
  Code, 
  Copy, 
  Check, 
  Key, 
  Zap, 
  Bell,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = 'https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1';

export function ApiDocsSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('auth');

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      toast.success('Código copiado!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const EndpointCard = ({ 
    method, 
    endpoint, 
    description, 
    children 
  }: { 
    method: 'GET' | 'POST'; 
    endpoint: string; 
    description: string;
    children: React.ReactNode;
  }) => (
    <Card className="p-4 border-border/50">
      <div className="flex items-center gap-3 mb-3">
        <Badge className={method === 'POST' ? 'bg-green-600' : 'bg-blue-600'}>
          {method}
        </Badge>
        <code className="text-sm font-mono text-muted-foreground">{endpoint}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {children}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Book className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Documentação da API</h2>
          <p className="text-sm text-muted-foreground">
            Guia completo para integração com a API de Pagamentos
          </p>
        </div>
      </div>

      {/* Intro */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/30">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Base URL da API</p>
            <code className="text-sm font-mono text-muted-foreground">{API_BASE_URL}</code>
          </div>
        </div>
      </Card>

      {/* Authentication Section */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('auth')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <span className="font-medium">Autenticação</span>
          </div>
          {expandedSection === 'auth' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSection === 'auth' && (
          <div className="p-4 pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Todas as requisições devem incluir sua API key no header <code className="bg-muted px-1 rounded">Authorization</code>:
            </p>
            <CodeBlock 
              id="auth-header"
              language="bash"
              code={`Authorization: Bearer fp_live_sua_chave_aqui`}
            />
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span className="text-yellow-500">⚠️</span>
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Nunca exponha sua API key em código client-side. 
                Use apenas em servidores backend.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Endpoints Section */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('endpoints')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Code className="h-5 w-5 text-primary" />
            <span className="font-medium">Endpoints</span>
          </div>
          {expandedSection === 'endpoints' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSection === 'endpoints' && (
          <div className="p-4 pt-0 space-y-6">
            {/* Create PIX */}
            <EndpointCard
              method="POST"
              endpoint="/api-v1-pix-create"
              description="Cria um novo pagamento PIX"
            >
              <Tabs defaultValue="request">
                <TabsList className="mb-4">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="errors">Erros</TabsTrigger>
                </TabsList>
                
                <TabsContent value="request">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Body (JSON):</p>
                    <CodeBlock
                      id="create-request"
                      language="json"
                      code={`{
  "amount": 99.90,
  "description": "Compra do Produto X",
  "external_reference": "pedido_12345",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "document": "12345678900"
  },
  "metadata": {
    "order_id": "12345",
    "product_sku": "PROD-001"
  }
}`}
                    />
                    <div className="space-y-2 text-sm">
                      <p><strong>amount</strong> <Badge variant="destructive" className="text-xs">obrigatório</Badge> - Valor em reais (mínimo: R$ 0,50)</p>
                      <p><strong>description</strong> - Descrição do pagamento</p>
                      <p><strong>external_reference</strong> - ID externo para rastreamento</p>
                      <p><strong>customer</strong> - Dados do cliente (opcional)</p>
                      <p><strong>metadata</strong> - Dados extras para sua aplicação</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="response">
                  <CodeBlock
                    id="create-response"
                    language="json"
                    code={`{
  "success": true,
  "data": {
    "txid": "PIX123456789",
    "pix_code": "00020126...BR.GOV.BCB.PIX...",
    "qr_code_url": null,
    "amount": 99.90,
    "external_reference": "pedido_12345",
    "expires_at": "2024-01-15T14:30:00.000Z",
    "status": "pending",
    "created_at": "2024-01-15T14:00:00.000Z"
  }
}`}
                  />
                </TabsContent>

                <TabsContent value="errors">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">401</Badge>
                      <span>UNAUTHORIZED - API key não fornecida</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">401</Badge>
                      <span>INVALID_API_KEY - API key inválida ou inativa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">400</Badge>
                      <span>INVALID_AMOUNT - Valor inválido</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">400</Badge>
                      <span>AMOUNT_TOO_LOW - Valor abaixo do mínimo (R$ 0,50)</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </EndpointCard>

            {/* Check Status */}
            <EndpointCard
              method="GET"
              endpoint="/api-v1-pix-status?txid={txid}"
              description="Consulta o status de um pagamento PIX"
            >
              <Tabs defaultValue="request">
                <TabsList className="mb-4">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                
                <TabsContent value="request">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Query Parameters:</p>
                    <div className="space-y-2 text-sm">
                      <p><strong>txid</strong> <Badge variant="destructive" className="text-xs">obrigatório</Badge> - ID da transação retornado na criação</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="response">
                  <CodeBlock
                    id="status-response"
                    language="json"
                    code={`{
  "success": true,
  "data": {
    "txid": "PIX123456789",
    "external_reference": "pedido_12345",
    "amount": 99.90,
    "status": "paid",
    "paid_at": "2024-01-15T14:05:32.000Z",
    "expired_at": null,
    "created_at": "2024-01-15T14:00:00.000Z",
    "metadata": {
      "order_id": "12345",
      "product_sku": "PROD-001"
    }
  }
}`}
                  />
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-medium">Status possíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-yellow-600">pending</Badge>
                      <span className="text-muted-foreground">Aguardando pagamento</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-600">paid</Badge>
                      <span className="text-muted-foreground">Pago com sucesso</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-red-600">expired</Badge>
                      <span className="text-muted-foreground">Expirado (não pago)</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </EndpointCard>
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('webhooks')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-medium">Webhooks</span>
          </div>
          {expandedSection === 'webhooks' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSection === 'webhooks' && (
          <div className="p-4 pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure uma URL de webhook para receber notificações em tempo real sobre pagamentos.
            </p>
            
            <div className="space-y-3">
              <p className="text-sm font-medium">Headers enviados:</p>
              <CodeBlock
                id="webhook-headers"
                language="http"
                code={`X-FurionPay-Signature: sha256=abc123...
X-FurionPay-Event: payment.paid
Content-Type: application/json
User-Agent: FurionPay-Webhook/1.0`}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Payload de exemplo (payment.paid):</p>
              <CodeBlock
                id="webhook-payload"
                language="json"
                code={`{
  "event": "payment.paid",
  "created_at": "2024-01-15T14:05:32.000Z",
  "data": {
    "txid": "PIX123456789",
    "external_reference": "pedido_12345",
    "amount": 99.90,
    "status": "paid",
    "paid_at": "2024-01-15T14:05:32.000Z",
    "created_at": "2024-01-15T14:00:00.000Z",
    "metadata": {
      "order_id": "12345"
    }
  }
}`}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Validando a assinatura (Node.js):</p>
              <CodeBlock
                id="webhook-validation"
                language="javascript"
                code={`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// No seu endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-furionpay-signature'];
  const isValid = verifySignature(
    JSON.stringify(req.body),
    signature,
    'seu_webhook_secret'
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Processar webhook...
  res.status(200).send('OK');
});`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Code Examples */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('examples')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-primary" />
            <span className="font-medium">Exemplos de Código</span>
          </div>
          {expandedSection === 'examples' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSection === 'examples' && (
          <div className="p-4 pt-0 space-y-4">
            <Tabs defaultValue="curl">
              <TabsList className="mb-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
              </TabsList>
              
              <TabsContent value="curl">
                <div className="space-y-4">
                  <p className="text-sm font-medium">Criar PIX:</p>
                  <CodeBlock
                    id="curl-create"
                    language="bash"
                    code={`curl -X POST "${API_BASE_URL}/api-v1-pix-create" \\
  -H "Authorization: Bearer fp_live_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 99.90,
    "description": "Compra do Produto X",
    "external_reference": "pedido_12345"
  }'`}
                  />
                  
                  <p className="text-sm font-medium">Consultar Status:</p>
                  <CodeBlock
                    id="curl-status"
                    language="bash"
                    code={`curl "${API_BASE_URL}/api-v1-pix-status?txid=PIX123456789" \\
  -H "Authorization: Bearer fp_live_sua_chave"`}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="node">
                <CodeBlock
                  id="node-example"
                  language="javascript"
                  code={`const axios = require('axios');

const API_KEY = 'fp_live_sua_chave';
const API_URL = '${API_BASE_URL}';

// Criar PIX
async function createPix(amount, description, externalRef) {
  const response = await axios.post(
    \`\${API_URL}/api-v1-pix-create\`,
    {
      amount,
      description,
      external_reference: externalRef
    },
    {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

// Consultar Status
async function checkStatus(txid) {
  const response = await axios.get(
    \`\${API_URL}/api-v1-pix-status?txid=\${txid}\`,
    {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`
      }
    }
  );
  
  return response.data;
}

// Exemplo de uso
(async () => {
  // Criar novo pagamento
  const pix = await createPix(99.90, 'Produto X', 'pedido_123');
  console.log('PIX criado:', pix.data.txid);
  console.log('Código PIX:', pix.data.pix_code);
  
  // Verificar status
  const status = await checkStatus(pix.data.txid);
  console.log('Status:', status.data.status);
})();`}
                />
              </TabsContent>
              
              <TabsContent value="python">
                <CodeBlock
                  id="python-example"
                  language="python"
                  code={`import requests

API_KEY = 'fp_live_sua_chave'
API_URL = '${API_BASE_URL}'

def create_pix(amount, description, external_ref):
    response = requests.post(
        f'{API_URL}/api-v1-pix-create',
        json={
            'amount': amount,
            'description': description,
            'external_reference': external_ref
        },
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    )
    return response.json()

def check_status(txid):
    response = requests.get(
        f'{API_URL}/api-v1-pix-status',
        params={'txid': txid},
        headers={
            'Authorization': f'Bearer {API_KEY}'
        }
    )
    return response.json()

# Exemplo de uso
if __name__ == '__main__':
    # Criar novo pagamento
    pix = create_pix(99.90, 'Produto X', 'pedido_123')
    print(f"PIX criado: {pix['data']['txid']}")
    print(f"Código PIX: {pix['data']['pix_code']}")
    
    # Verificar status
    status = check_status(pix['data']['txid'])
    print(f"Status: {status['data']['status']}")`}
                />
              </TabsContent>
              
              <TabsContent value="php">
                <CodeBlock
                  id="php-example"
                  language="php"
                  code={`<?php

$API_KEY = 'fp_live_sua_chave';
$API_URL = '${API_BASE_URL}';

function createPix($amount, $description, $externalRef) {
    global $API_KEY, $API_URL;
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "$API_URL/api-v1-pix-create",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $amount,
            'description' => $description,
            'external_reference' => $externalRef
        ]),
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $API_KEY",
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

function checkStatus($txid) {
    global $API_KEY, $API_URL;
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "$API_URL/api-v1-pix-status?txid=$txid",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $API_KEY"
        ]
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Exemplo de uso
$pix = createPix(99.90, 'Produto X', 'pedido_123');
echo "PIX criado: " . $pix['data']['txid'] . "\\n";
echo "Código PIX: " . $pix['data']['pix_code'] . "\\n";

$status = checkStatus($pix['data']['txid']);
echo "Status: " . $status['data']['status'] . "\\n";`}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
