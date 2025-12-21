import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Download, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupCodesDisplayProps {
  codes: string[];
  onComplete: () => void;
}

export const BackupCodesDisplay = ({ codes, onComplete }: BackupCodesDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopyAll = async () => {
    const text = codes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copiado!',
      description: 'Códigos copiados para a área de transferência'
    });
  };

  const handleDownload = () => {
    const content = `CÓDIGOS DE BACKUP - 2FA

⚠️ IMPORTANTE: Guarde estes códigos em um local seguro!
Cada código só pode ser usado uma vez.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Gerado em: ${new Date().toLocaleString('pt-BR')}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes-2fa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download iniciado',
      description: 'Arquivo de backup sendo baixado'
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">2FA Ativado com Sucesso!</h2>
        <p className="text-muted-foreground mt-2">
          Salve seus códigos de backup em um local seguro
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-500 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Códigos de Backup
          </CardTitle>
          <CardDescription>
            Use estes códigos se perder acesso ao seu app autenticador. 
            <strong> Cada código só pode ser usado uma vez.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Codes Grid */}
          <div className="grid grid-cols-2 gap-2">
            {codes.map((code, index) => (
              <div
                key={index}
                className="bg-background/50 border rounded-lg p-3 text-center font-mono text-sm tracking-widest"
              >
                {code}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCopyAll}
              className="flex-1"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar Todos'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar TXT
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Checkbox
          id="confirm-saved"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked as boolean)}
        />
        <label
          htmlFor="confirm-saved"
          className="text-sm cursor-pointer leading-relaxed"
        >
          Eu salvei meus códigos de backup em um local seguro e entendo que eles são a única forma de recuperar minha conta se eu perder acesso ao meu app autenticador.
        </label>
      </div>

      <Button
        onClick={onComplete}
        disabled={!confirmed}
        className="w-full"
      >
        Concluir Configuração
      </Button>
    </div>
  );
};
