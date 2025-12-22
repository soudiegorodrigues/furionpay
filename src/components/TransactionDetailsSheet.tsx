import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Calendar, User, Package, TrendingUp, Check, CreditCard } from "lucide-react";
import { useState } from "react";
interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  // Estrutura da API - UTMs vêm dentro de metadata
  metadata?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
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
  acquirer?: string;
}
interface TransactionDetailsSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateNetAmount: (amount: number, feePercentage?: number | null, feeFixed?: number | null) => number;
  isAdmin?: boolean;
}
const TransactionDetailsSheet = ({
  transaction,
  open,
  onOpenChange,
  calculateNetAmount,
  isAdmin = false
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
        return {
          label: 'Pago',
          bg: 'bg-emerald-500',
          text: 'text-white'
        };
      case 'expired':
        return {
          label: 'Expirado',
          bg: 'bg-red-500',
          text: 'text-white'
        };
      default:
        return {
          label: 'Gerado',
          bg: 'bg-red-500/70',
          text: 'text-white'
        };
    }
  };

  const getAcquirerDisplay = (acquirer?: string) => {
    switch (acquirer) {
      case 'inter': return 'Banco Inter';
      case 'ativus': return 'Ativus';
      case 'valorion': return 'Valorion';
      default: return '-';
    }
  };
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper para extrair UTM de ambas estruturas (checkout normal e API)
  const getUtmValue = (key: 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term') => {
    return transaction.utm_data?.[key] || transaction.utm_data?.metadata?.[key];
  };

  const netAmount = calculateNetAmount(transaction.amount, transaction.fee_percentage, transaction.fee_fixed);
  const feeAmount = transaction.amount - netAmount;
  
  // Verifica UTMs diretos ou dentro de metadata (API)
  const hasUtmData = transaction.utm_data && (
    Object.entries(transaction.utm_data).some(([k, v]) => k !== 'metadata' && v && typeof v === 'string') ||
    (transaction.utm_data.metadata && Object.values(transaction.utm_data.metadata).some(v => v))
  );
  const statusConfig = getStatusConfig(transaction.status);
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px] sm:w-[380px] p-0 border-l border-border/50 bg-background">
        {/* Header compacto */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className={`w-2 h-2 rounded-full ${statusConfig.bg}`} />
          <span className="font-medium text-sm">Transação</span>
          <Badge className={`${statusConfig.bg} ${statusConfig.text} text-xs px-2 py-0.5`}>
            {statusConfig.label}
          </Badge>
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
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Data</span>
              </div>
              <p className="text-sm font-semibold truncate">{formatDate(transaction.created_at)}</p>
            </div>

            {/* Cliente */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Cliente</span>
              </div>
              <p className="text-sm font-semibold truncate">{transaction.donor_name || '-'}</p>
            </div>

            {/* Adquirente - apenas para admins */}
            {isAdmin && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Adquirente</span>
                </div>
                <p className="text-sm font-bold">{getAcquirerDisplay(transaction.acquirer)}</p>
              </div>
            )}

            {/* Produto */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Produto</span>
              </div>
              <p className="text-sm font-semibold truncate">{transaction.product_name || '-'}</p>
              {transaction.popup_model && <Badge variant="outline" className="mt-1.5 text-[10px] h-5">
                  {transaction.popup_model}
                </Badge>}
            </div>
          </div>

          {/* UTM */}
          {hasUtmData && <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">UTM Tracking</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getUtmValue('utm_source') && <Badge variant="secondary" className="text-xs h-6">{getUtmValue('utm_source')}</Badge>}
                {getUtmValue('utm_medium') && <Badge variant="outline" className="text-xs h-6">{getUtmValue('utm_medium')}</Badge>}
                {getUtmValue('utm_campaign') && <Badge variant="outline" className="text-xs h-6">{getUtmValue('utm_campaign')}</Badge>}
              </div>
            </div>}

          {/* IDs */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">IDs</span>
            
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">ID</p>
                <p className="text-xs font-mono truncate">{transaction.id}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(transaction.id, 'id')} 
                className="h-7 w-7 p-0 shrink-0 hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
              >
                {copiedId === 'id' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>

            {transaction.txid && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">TXID</p>
                  <p className="text-xs font-mono truncate">{transaction.txid}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(transaction.txid, 'txid')} 
                  className="h-7 w-7 p-0 shrink-0 hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                >
                  {copiedId === 'txid' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>;
};
export default TransactionDetailsSheet;