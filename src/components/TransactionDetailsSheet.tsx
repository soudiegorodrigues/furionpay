import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Calendar, User, Package, DollarSign, TrendingUp, Check, X } from "lucide-react";
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Pago', bg: 'bg-emerald-500', text: 'text-white' };
      case 'expired':
        return { label: 'Expirado', bg: 'bg-red-500', text: 'text-white' };
      default:
        return { label: 'Gerado', bg: 'bg-amber-500', text: 'text-white' };
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const netAmount = calculateNetAmount(transaction.amount, transaction.fee_percentage, transaction.fee_fixed);
  const feeAmount = transaction.amount - netAmount;
  const hasUtmData = transaction.utm_data && Object.values(transaction.utm_data).some(v => v);
  const statusConfig = getStatusConfig(transaction.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px] sm:w-[380px] p-0 border-l border-border/50 bg-background">
        {/* Header compacto */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${statusConfig.bg}`} />
            <span className="font-medium text-sm">Transação</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.bg} ${statusConfig.text} text-xs px-2 py-0.5`}>
              {statusConfig.label}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content scrollable */}
        <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-4">
          {/* Valor em destaque */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(netAmount)}</p>
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-2 gap-3">
            {/* Data */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</span>
              </div>
              <p className="text-xs font-medium truncate">{formatDate(transaction.created_at)}</p>
            </div>

            {/* Cliente */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Cliente</span>
              </div>
              <p className="text-xs font-medium truncate">{transaction.donor_name || '-'}</p>
            </div>

            {/* Produto */}
            <div className="bg-muted/30 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Produto</span>
              </div>
              <p className="text-xs font-medium">{transaction.product_name || '-'}</p>
              {transaction.popup_model && (
                <Badge variant="outline" className="mt-1.5 text-[10px] h-5">
                  {transaction.popup_model}
                </Badge>
              )}
            </div>
          </div>

          {/* UTM */}
          {hasUtmData && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">UTM</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {transaction.utm_data?.utm_source && (
                  <Badge variant="secondary" className="text-[10px] h-5">{transaction.utm_data.utm_source}</Badge>
                )}
                {transaction.utm_data?.utm_medium && (
                  <Badge variant="outline" className="text-[10px] h-5">{transaction.utm_data.utm_medium}</Badge>
                )}
                {transaction.utm_data?.utm_campaign && (
                  <Badge variant="outline" className="text-[10px] h-5">{transaction.utm_data.utm_campaign}</Badge>
                )}
              </div>
            </div>
          )}

          {/* IDs */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">IDs</span>
            
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">ID</p>
                <p className="text-[11px] font-mono truncate">{transaction.id}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(transaction.id, 'id')} 
                className="h-6 w-6 p-0 shrink-0"
              >
                {copiedId === 'id' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            {transaction.txid && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">TXID</p>
                  <p className="text-[11px] font-mono truncate">{transaction.txid}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(transaction.txid, 'txid')} 
                  className="h-6 w-6 p-0 shrink-0"
                >
                  {copiedId === 'txid' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TransactionDetailsSheet;
