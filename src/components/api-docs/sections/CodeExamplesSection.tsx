import { useState } from 'react';
import { CodeBlock } from '../CodeBlock';
import { cn } from '@/lib/utils';

const languages = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
];

const codeExamples = {
  curl: `# Criar PIX
curl -X POST https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1/api-v1-pix-create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 150.00,
    "customer_name": "João Silva",
    "customer_email": "joao@email.com",
    "customer_document": "12345678900"
  }'

# Consultar Status
curl -X GET "https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1/api-v1-pix-status?txid=PIX123456789" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

  node: `const axios = require('axios');

const API_KEY = process.env.FURIONPAY_API_KEY;
const BASE_URL = 'https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1';

// Criar PIX
async function createPix(data) {
  const response = await axios.post(\`\${BASE_URL}/api-v1-pix-create\`, {
    amount: data.amount,
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_document: data.customerDocument,
  }, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.data;
}

// Consultar Status
async function checkStatus(txid) {
  const response = await axios.get(\`\${BASE_URL}/api-v1-pix-status\`, {
    params: { txid },
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
    },
  });
  
  return response.data;
}

// Exemplo de uso
async function main() {
  const pix = await createPix({
    amount: 150.00,
    customerName: 'João Silva',
    customerEmail: 'joao@email.com',
    customerDocument: '12345678900',
  });
  
  console.log('PIX criado:', pix.data.txid);
  console.log('Código copia e cola:', pix.data.pix_code);
}

main();`,

  python: `import requests
import os

API_KEY = os.environ.get('FURIONPAY_API_KEY')
BASE_URL = 'https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Criar PIX
def create_pix(amount, customer_name, customer_email=None, customer_document=None):
    payload = {
        'amount': amount,
        'customer_name': customer_name,
        'customer_email': customer_email,
        'customer_document': customer_document
    }
    
    response = requests.post(
        f'{BASE_URL}/api-v1-pix-create',
        json=payload,
        headers=headers
    )
    
    return response.json()

# Consultar Status
def check_status(txid):
    response = requests.get(
        f'{BASE_URL}/api-v1-pix-status',
        params={'txid': txid},
        headers=headers
    )
    
    return response.json()

# Exemplo de uso
if __name__ == '__main__':
    pix = create_pix(
        amount=150.00,
        customer_name='João Silva',
        customer_email='joao@email.com',
        customer_document='12345678900'
    )
    
    print(f"PIX criado: {pix['data']['txid']}")
    print(f"Código copia e cola: {pix['data']['pix_code']}")`,

  php: `<?php

$apiKey = getenv('FURIONPAY_API_KEY');
$baseUrl = 'https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1';

// Criar PIX
function createPix($amount, $customerName, $customerEmail = null, $customerDocument = null) {
    global $apiKey, $baseUrl;
    
    $payload = json_encode([
        'amount' => $amount,
        'customer_name' => $customerName,
        'customer_email' => $customerEmail,
        'customer_document' => $customerDocument
    ]);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "$baseUrl/api-v1-pix-create",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $apiKey",
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Consultar Status
function checkStatus($txid) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "$baseUrl/api-v1-pix-status?txid=$txid",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $apiKey"
        ]
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Exemplo de uso
$pix = createPix(150.00, 'João Silva', 'joao@email.com', '12345678900');

echo "PIX criado: " . $pix['data']['txid'] . "\\n";
echo "Código copia e cola: " . $pix['data']['pix_code'] . "\\n";

?>`,
};

export const CodeExamplesSection = () => {
  const [activeLanguage, setActiveLanguage] = useState('curl');

  return (
    <section id="code-examples" className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4">Exemplos de Código</h2>
      <p className="text-muted-foreground mb-6">
        Exemplos completos em diferentes linguagens para integrar a API FurionPay.
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border bg-muted/30">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setActiveLanguage(lang.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeLanguage === lang.id
                  ? 'bg-background text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <div className="p-0">
          <CodeBlock 
            code={codeExamples[activeLanguage as keyof typeof codeExamples]} 
            language={activeLanguage === 'node' ? 'javascript' : activeLanguage}
          />
        </div>
      </div>
    </section>
  );
};
