import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function UTMScriptSection() {
  const [copied, setCopied] = useState(false);
  
  // Usa o domínio atual ou um domínio padrão
  const scriptDomain = window.location.hostname.includes('localhost') 
    ? 'vakinha-doar.shop' 
    : window.location.hostname;
  
  const scriptCode = `<script src="https://${scriptDomain}/utm-tracker.js"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      toast.success("Script copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Script de Rastreamento UTM
        </CardTitle>
        <CardDescription>
          Adicione este script nas suas páginas de vendas para preservar UTMs automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">
          <code>{scriptCode}</code>
        </div>
        
        <Button onClick={handleCopy} className="w-full" variant="outline">
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Script
            </>
          )}
        </Button>

        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-medium">Como usar:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Copie o código acima</li>
            <li>Cole no <code className="bg-muted px-1 rounded">&lt;head&gt;</code> da sua página de vendas</li>
            <li>Todos os links de checkout terão UTMs automaticamente</li>
          </ol>
        </div>

        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-2">
          <h4 className="font-medium text-primary">O que o script faz:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Captura UTMs da URL (utm_source, utm_medium, utm_campaign, etc.)</li>
            <li>Captura fbclid, gclid e ttclid automaticamente</li>
            <li>Detecta origem pelo referrer (Facebook, Google, TikTok, etc.)</li>
            <li>Adiciona UTMs em todos os links de checkout automaticamente</li>
            <li>Funciona em qualquer plataforma (WordPress, ClickFunnels, etc.)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
