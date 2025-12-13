import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Calendar, User, Package, DollarSign, TrendingUp, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}
interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  fee_percentage: number | null;
  fee_fixed: number | null;
  utm_data: UTMData | null;
  popup_model: string | null;
}
interface TransactionDetailsSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateNetAmount: (amount: number, feePercentage?: number | null, feeFixed?: number | null) => number;
}
const TransactionDetailsSheet = ({
  transaction,
  open,
  onOpenChange,
  calculateNetAmount
}: TransactionDetailsSheetProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  if (!transaction) return null;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Gerado</Badge>;
    }
  };
  const getSourceIcon = (source?: string) => {
    if (!source) return null;
    const lower = source.toLowerCase();
    if (lower.includes('facebook') || lower.includes('fb')) {
      return <span className="text-blue-500">📘</span>;
    }
    if (lower.includes('google')) {
      return <span>🔍</span>;
    }
    if (lower.includes('instagram') || lower.includes('ig')) {
      return <span className="text-pink-500">📸</span>;
    }
    if (lower.includes('tiktok')) {
      return <span>🎵</span>;
    }
    if (lower.includes('youtube') || lower.includes('yt')) {
      return <span className="text-red-500">▶️</span>;
    }
    if (lower.includes('email') || lower.includes('newsletter')) {
      return <span>📧</span>;
    }
    return <ExternalLink className="h-3 w-3" />;
  };
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const netAmount = calculateNetAmount(transaction.amount, transaction.fee_percentage, transaction.fee_fixed);
  const feeAmount = transaction.amount - netAmount;
  const hasUtmData = transaction.utm_data && Object.values(transaction.utm_data).some(v => v);
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Detalhes da Transação</SheetTitle>
            {getStatusBadge(transaction.status)}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Data e Hora */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Data e Hora</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Criado em:</span>{" "}
                <span className="font-medium">{formatDate(transaction.created_at)}</span>
              </p>
              {transaction.paid_at && <p className="text-sm">
                  <span className="text-muted-foreground">Pago em:</span>{" "}
                  <span className="font-medium text-green-500">{formatDate(transaction.paid_at)}</span>
                </p>}
            </div>
          </div>

          <Separator />

          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Cliente</span>
            </div>
            <p className="pl-6 text-sm font-medium">{transaction.donor_name || 'Não informado'}</p>
          </div>

          <Separator />

          {/* Produto */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Produto</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-sm font-medium">{transaction.product_name || 'Não informado'}</p>
              {transaction.popup_model && <p className="text-xs text-muted-foreground">
                  Modelo: <span className="capitalize">{transaction.popup_model}</span>
                </p>}
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Valores</span>
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor bruto</span>
                <span>{formatCurrency(transaction.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa</span>
                <span className="text-red-400">
                  -{formatCurrency(feeAmount)}
                  {transaction.fee_percentage !== null && <span className="text-xs ml-1">
                      ({transaction.fee_percentage}% + {formatCurrency(transaction.fee_fixed || 0)})
                    </span>}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Valor líquido</span>
                <span className="text-green-500">{formatCurrency(netAmount)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* UTM Tracking */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Rastreamento UTM</span>
            </div>
            {hasUtmData ? <div className="pl-6 space-y-2">
                {transaction.utm_data?.utm_source && <div className="flex items-center gap-2 text-sm">
                    {getSourceIcon(transaction.utm_data.utm_source)}
                    <span className="text-muted-foreground">Origem:</span>
                    <Badge variant="secondary" className="text-xs">{transaction.utm_data.utm_source}</Badge>
                  </div>}
                {transaction.utm_data?.utm_medium && <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Mídia:</span>
                    <Badge variant="outline" className="text-xs">{transaction.utm_data.utm_medium}</Badge>
                  </div>}
                {transaction.utm_data?.utm_campaign && <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Campanha:</span>
                    <span className="text-xs">{transaction.utm_data.utm_campaign}</span>
                  </div>}
                {transaction.utm_data?.utm_content && <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Conteúdo:</span>
                    <span className="text-xs">{transaction.utm_data.utm_content}</span>
                  </div>}
                {transaction.utm_data?.utm_term && <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Termo:</span>
                    <span className="text-xs">{transaction.utm_data.utm_term}</span>
                  </div>}
              </div> : <p className="pl-6 text-sm text-muted-foreground italic">Sem dados de UTM</p>}
          </div>

          <Separator />

          {/* IDs Técnicos */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">IDs Técnicos</div>
            <div className="pl-0 space-y-2">
              <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="text-xs font-mono truncate">{transaction.id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transaction.id, 'id')} className="h-7 w-7 p-0 shrink-0">
                  {copiedId === 'id' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              {transaction.txid && <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">TXID</p>
                    <p className="text-xs font-mono truncate">{transaction.txid}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transaction.txid, 'txid')} className="h-7 w-7 p-0 shrink-0">
                    {copiedId === 'txid' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
};
export default TransactionDetailsSheet;