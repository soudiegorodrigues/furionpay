import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Calendar, User, Package, TrendingUp, Check, CreditCard, Mail, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { getUtmValue as getUtmValueHelper, hasUtmData as hasUtmDataHelper, getCustomerEmail, UTMData } from "@/lib/utmHelpers";

interface OrderBumpItem {
  id: string;
  price: number;
  name?: string;
  title?: string;
  product_name?: string;
}


interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  donor_email?: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  fee_percentage: number | null;
  fee_fixed: number | null;
  utm_data: UTMData | null;
  popup_model: string | null;
  acquirer?: string;
  order_bumps?: OrderBumpItem[] | null;
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

  // Helper para extrair UTM usando o utilitário compartilhado
  const getUtmValue = (key: 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term') => {
    return getUtmValueHelper(transaction.utm_data, key);
  };

  const netAmount = calculateNetAmount(transaction.amount, transaction.fee_percentage, transaction.fee_fixed);
  const feeAmount = transaction.amount - netAmount;
  
  // Verifica UTMs usando o utilitário compartilhado
  const hasUtm = hasUtmDataHelper(transaction.utm_data);
  const statusConfig = getStatusConfig(transaction.status);
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[400px] p-0 border-l border-border/50 bg-background">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Email */}
            {getCustomerEmail(transaction) && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate flex-1 min-w-0">{getCustomerEmail(transaction)}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(getCustomerEmail(transaction) || '', 'email')} 
                    className="h-6 w-6 p-0 shrink-0 hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                  >
                    {copiedId === 'email' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            )}

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
          {hasUtm && <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">UTM Tracking</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getUtmValue('utm_source') && (
                  <Badge variant="secondary" className="text-xs h-6 max-w-full" title={getUtmValue('utm_source')}>
                    <span className="truncate">{(getUtmValue('utm_source') || '').length > 25 ? getUtmValue('utm_source')?.slice(0, 25) + '...' : getUtmValue('utm_source')}</span>
                  </Badge>
                )}
                {getUtmValue('utm_medium') && (
                  <Badge variant="outline" className="text-xs h-6 max-w-full" title={getUtmValue('utm_medium')}>
                    <span className="truncate">{(getUtmValue('utm_medium') || '').length > 25 ? getUtmValue('utm_medium')?.slice(0, 25) + '...' : getUtmValue('utm_medium')}</span>
                  </Badge>
                )}
                {getUtmValue('utm_campaign') && (
                  <Badge variant="outline" className="text-xs h-6 max-w-full" title={getUtmValue('utm_campaign')}>
                    <span className="truncate">{(getUtmValue('utm_campaign') || '').length > 25 ? getUtmValue('utm_campaign')?.slice(0, 25) + '...' : getUtmValue('utm_campaign')}</span>
                  </Badge>
                )}
                {getUtmValue('utm_content') && (
                  <Badge variant="outline" className="text-xs h-6 max-w-full" title={getUtmValue('utm_content')}>
                    <span className="truncate">{(getUtmValue('utm_content') || '').length > 25 ? getUtmValue('utm_content')?.slice(0, 25) + '...' : getUtmValue('utm_content')}</span>
                  </Badge>
                )}
                {getUtmValue('utm_term') && (
                  <Badge variant="outline" className="text-xs h-6 max-w-full" title={getUtmValue('utm_term')}>
                    <span className="truncate">{(getUtmValue('utm_term') || '').length > 25 ? getUtmValue('utm_term')?.slice(0, 25) + '...' : getUtmValue('utm_term')}</span>
                  </Badge>
                )}
              </div>
            </div>}

          {/* Order Bumps */}
          {transaction.order_bumps && transaction.order_bumps.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Order Bumps</span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                  {transaction.order_bumps.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {transaction.order_bumps.map((bump, index) => {
                  const label = bump.title ?? bump.name ?? bump.product_name ?? `Order bump ${index + 1}`;
                  return (
                    <div key={bump.id ?? String(index)} className="flex items-center justify-between bg-background/50 rounded-md p-2">
                      <span className="text-sm truncate flex-1 mr-2">{label}</span>
                      <span className="text-sm font-semibold text-primary shrink-0">{formatCurrency(bump.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">IDs</span>
            
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-xs text-muted-foreground font-medium">ID</p>
                <p className="text-xs font-mono truncate break-all">{transaction.id}</p>
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
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs text-muted-foreground font-medium">TXID</p>
                  <p className="text-xs font-mono truncate break-all">{transaction.txid}</p>
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