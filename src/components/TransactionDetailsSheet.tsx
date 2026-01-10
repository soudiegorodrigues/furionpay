import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Calendar, User, Package, TrendingUp, Check, CreditCard, Mail, Phone, ShoppingBag, Globe, Ban, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getUtmValue as getUtmValueHelper, hasUtmData as hasUtmDataHelper, getCustomerEmail, getTrafficSource, UTMData } from "@/lib/utmHelpers";

// Ícone Facebook
const FacebookIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
    <circle cx="24" cy="24" r="24" fill="#1877F2" />
    <path d="M32.5 24.5H27V33H22V24.5H18V20H22V17C22 13.7 24.2 11 28 11H32V15.5H29C27.6 15.5 27 16.3 27 17.5V20H32L32.5 24.5Z" fill="white" />
  </svg>
);

// Ícone TikTok
const TiktokIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
    <circle cx="24" cy="24" r="24" fill="#000000" />
    <path d="M33.5 17.5V21.5C31.3 21.5 29.3 20.8 27.7 19.6V28.5C27.7 32.9 24.1 36.5 19.7 36.5C15.3 36.5 11.7 32.9 11.7 28.5C11.7 24.1 15.3 20.5 19.7 20.5C20.2 20.5 20.7 20.6 21.2 20.7V24.8C20.7 24.6 20.2 24.5 19.7 24.5C17.5 24.5 15.7 26.3 15.7 28.5C15.7 30.7 17.5 32.5 19.7 32.5C21.9 32.5 23.7 30.7 23.7 28.5V11.5H27.7C27.7 11.5 27.7 11.7 27.7 12C28 14.7 30.5 16.9 33.5 17.5Z" fill="white" />
  </svg>
);

// Ícone Google
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  status: 'generated' | 'paid' | 'expired' | 'refunded';
  txid: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  fee_percentage: number | null;
  fee_fixed: number | null;
  utm_data: UTMData | null;
  popup_model: string | null;
  acquirer?: string;
  order_bumps?: OrderBumpItem[] | null;
  client_ip?: string | null;
  offer_code?: string | null;
  offer_domain?: string | null;
}

// Mapeamento de nomes amigáveis dos popup models
const POPUP_MODEL_NAMES: Record<string, string> = {
  boost: "Boost",
  simple: "Simples",
  clean: "Clean",
  direct: "Direto",
  hot: "Hot",
  landing: "Modelo Vakinha",
  instituto: "Borboleta",
  instituto2: "Instituto 2",
  vakinha2: "Vakinha 2",
  vakinha3: "Vakinha 3",
  api: "API",
  checkout: "Checkout"
};

const getPopupModelName = (model: string): string => {
  return POPUP_MODEL_NAMES[model] || model;
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
  const [addingToBlacklist, setAddingToBlacklist] = useState(false);
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [isAlreadyBlacklisted, setIsAlreadyBlacklisted] = useState(false);

  const checkIfBlacklisted = async (ip: string) => {
    const { data } = await supabase
      .from('ip_blacklist')
      .select('id')
      .eq('ip_address', ip)
      .eq('is_active', true)
      .maybeSingle();
    return !!data;
  };

  const addToBlacklist = async () => {
    if (!transaction?.client_ip) return;
    
    setAddingToBlacklist(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ip_blacklist')
        .insert({
          ip_address: transaction.client_ip,
          reason: blacklistReason || 'Bloqueado via detalhes da transação',
          blocked_by: user?.id || null,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este IP já está na blacklist');
        } else {
          throw error;
        }
      } else {
        toast.success('IP adicionado à blacklist com sucesso');
        setIsAlreadyBlacklisted(true);
        setShowBlacklistDialog(false);
        setBlacklistReason("");
      }
    } catch (error) {
      console.error('Erro ao adicionar à blacklist:', error);
      toast.error('Erro ao adicionar IP à blacklist');
    } finally {
      setAddingToBlacklist(false);
    }
  };

  useEffect(() => {
    if (transaction?.client_ip && open) {
      checkIfBlacklisted(transaction.client_ip).then(setIsAlreadyBlacklisted);
    } else {
      setIsAlreadyBlacklisted(false);
    }
  }, [transaction?.client_ip, open]);

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

  // Função para obter o ícone baseado na plataforma
  const getPlatformIcon = () => {
    const source = getTrafficSource(transaction.utm_data);
    switch (source) {
      case 'facebook': return <FacebookIcon />;
      case 'google': return <GoogleIcon />;
      case 'tiktok': return <TiktokIcon />;
      default: return null;
    }
  };
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

            {/* Telefone */}
            {transaction.donor_phone && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Telefone</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(transaction.donor_phone || '', 'phone')} 
                      className="h-8 w-8 sm:h-6 sm:w-6 p-0 shrink-0 hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                    >
                      {copiedId === 'phone' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                    <p className="text-sm font-semibold truncate flex-1 min-w-0">{transaction.donor_phone}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const phone = (transaction.donor_phone || '').replace(/\D/g, '');
                        const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;
                        
                        // Gerar link do checkout
                        const baseDomain = transaction.offer_domain 
                          ? `https://${transaction.offer_domain}` 
                          : window.location.origin;
                        const checkoutLink = transaction.offer_code 
                          ? `${baseDomain}/${transaction.offer_code}` 
                          : null;
                        
                        // Mensagem baseada no status com urgência
                        let message = '';
                        const productName = transaction.product_name || 'nosso produto';
                        const clientName = transaction.donor_name || 'cliente';
                        
                        if (transaction.status === 'generated') {
                          if (checkoutLink) {
                            message = `Olá ${clientName}! 👋\n\nVi que você iniciou a compra do *${productName}* mas ainda não finalizou o pagamento.\n\n⚠️ *ATENÇÃO:* O PIX tem validade limitada e pode expirar a qualquer momento!\n\n🔗 *Finalize agora sua compra:*\n${checkoutLink}\n\n✅ Após o pagamento, envie o comprovante aqui para liberarmos seu acesso imediatamente!\n\n⏰ Não perca essa oportunidade!`;
                          } else {
                            message = `Olá ${clientName}! 👋\n\nVi que você iniciou a compra do *${productName}* mas ainda não finalizou o pagamento.\n\n⚠️ *ATENÇÃO:* O PIX tem validade limitada e pode expirar a qualquer momento!\n\n✅ Após o pagamento, envie o comprovante aqui para liberarmos seu acesso imediatamente!\n\n⏰ Não perca essa oportunidade! Posso ajudar com algo?`;
                          }
                        } else if (transaction.status === 'paid') {
                          message = `Olá ${clientName}! 🎉\n\nMuito obrigado pela sua compra do *${productName}*!\n\n✅ Seu pagamento foi confirmado com sucesso!\n\nSe precisar de qualquer suporte ou tiver dúvidas, estou à disposição!\n\nAbraço! 😊`;
                        } else if (transaction.status === 'expired') {
                          if (checkoutLink) {
                            message = `Olá ${clientName}! 👋\n\nVi que seu PIX para o *${productName}* expirou, mas ainda dá tempo de garantir o seu!\n\n🔥 *Aproveite antes que acabe!*\n\n🔗 *Gere um novo PIX aqui:*\n${checkoutLink}\n\n✅ Após o pagamento, envie o comprovante aqui para liberarmos seu acesso imediatamente!\n\n⏰ Corra, as vagas são limitadas!`;
                          } else {
                            message = `Olá ${clientName}! 👋\n\nVi que seu PIX para o *${productName}* expirou, mas ainda dá tempo de garantir o seu!\n\n🔥 Quer que eu gere um novo código para você finalizar a compra?\n\n✅ Após o pagamento, envie o comprovante aqui para liberarmos seu acesso imediatamente!`;
                          }
                        } else {
                          message = `Olá ${clientName}! 👋\n\nEstou entrando em contato sobre o *${productName}*.\n\nPosso ajudar com algo?`;
                        }
                        
                        const encodedMessage = encodeURIComponent(message);
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        
                        if (isMobile) {
                          window.open(`https://wa.me/${phoneWithCountry}?text=${encodedMessage}`, '_blank');
                        } else {
                          window.open(`https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedMessage}`, '_blank');
                        }
                      }}
                      className="h-8 w-8 sm:h-6 sm:w-6 p-0 shrink-0 hover:bg-green-100 dark:hover:bg-green-900/30 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                      title="Abrir WhatsApp com mensagem"
                    >
                      <svg className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </Button>
                  </div>
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
                  {getPopupModelName(transaction.popup_model)}
                </Badge>}
            </div>
          </div>

          {/* UTM */}
          {hasUtm && <div className="bg-red-50/50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">UTM Tracking</span>
              </div>
              <div className="space-y-2">
                {getUtmValue('utm_source') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 font-semibold">Plataforma</span>
                    <Badge variant="secondary" className="text-xs h-6 max-w-[180px] gap-1.5 dark:bg-red-900/30 dark:text-red-200" title={getUtmValue('utm_source')}>
                      {getPlatformIcon()}
                      <span className="truncate">{getUtmValue('utm_source')}</span>
                    </Badge>
                  </div>
                )}
                {getUtmValue('utm_campaign') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 font-semibold">Campanha</span>
                    <Badge variant="outline" className="text-xs h-6 max-w-[180px] dark:border-red-700/50 dark:text-red-200 dark:bg-red-900/20" title={getUtmValue('utm_campaign')}>
                      <span className="truncate">{getUtmValue('utm_campaign')}</span>
                    </Badge>
                  </div>
                )}
                {getUtmValue('utm_medium') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 font-semibold">Conjunto</span>
                    <Badge variant="outline" className="text-xs h-6 max-w-[180px] dark:border-red-700/50 dark:text-red-200 dark:bg-red-900/20" title={getUtmValue('utm_medium')}>
                      <span className="truncate">{getUtmValue('utm_medium')}</span>
                    </Badge>
                  </div>
                )}
                {getUtmValue('utm_content') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 font-semibold">Anúncios</span>
                    <Badge variant="outline" className="text-xs h-6 max-w-[180px] dark:border-red-700/50 dark:text-red-200 dark:bg-red-900/20" title={getUtmValue('utm_content')}>
                      <span className="truncate">{getUtmValue('utm_content')}</span>
                    </Badge>
                  </div>
                )}
                {getUtmValue('utm_term') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 font-semibold">Posicionamento</span>
                    <Badge variant="outline" className="text-xs h-6 max-w-[180px] dark:border-red-700/50 dark:text-red-200 dark:bg-red-900/20" title={getUtmValue('utm_term')}>
                      <span className="truncate">{getUtmValue('utm_term')}</span>
                    </Badge>
                  </div>
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

          <div className="space-y-2 bg-red-50/50 dark:bg-red-950/20 rounded-lg p-3">
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

            {transaction.client_ip && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">IP</p>
                    {isAlreadyBlacklisted && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Bloqueado</Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono truncate break-all">{transaction.client_ip}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(transaction.client_ip || '', 'ip')} 
                  className="h-7 w-7 p-0 shrink-0 hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                >
                  {copiedId === 'ip' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
                {isAdmin && !isAlreadyBlacklisted && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowBlacklistDialog(true)}
                    className="h-7 w-7 p-0 shrink-0 hover:bg-destructive/10"
                    title="Adicionar à Blacklist"
                  >
                    <Ban className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialog de Blacklist */}
        <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Bloquear IP
              </DialogTitle>
              <DialogDescription>
                O IP <span className="font-mono font-semibold">{transaction.client_ip}</span> será adicionado à blacklist permanente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="blacklist-reason">Motivo (opcional)</Label>
                <Input 
                  id="blacklist-reason"
                  placeholder="Ex: Tentativas de fraude, comportamento suspeito..."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowBlacklistDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={addToBlacklist}
                disabled={addingToBlacklist}
                className="gap-2"
              >
                {addingToBlacklist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Bloquear IP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>;
};
export default TransactionDetailsSheet;