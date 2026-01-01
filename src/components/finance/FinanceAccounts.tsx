import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2,
  Wallet,
  PiggyBank,
  CreditCard,
  Loader2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  name: string;
  type: string;
  bank_name: string | null;
  icon: string | null;
  color: string | null;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  currency: string;
}

const BRAZILIAN_BANKS = [
  { value: 'nubank', label: 'Nubank', color: '#820AD1', logo: 'https://www.google.com/s2/favicons?domain=nubank.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'itau', label: 'Itaú', color: '#EC7000', logo: 'https://www.google.com/s2/favicons?domain=itau.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'bradesco', label: 'Bradesco', color: '#CC092F', logo: 'https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'caixa', label: 'Caixa Econômica', color: '#005CA9', logo: 'https://www.google.com/s2/favicons?domain=caixa.gov.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'bb', label: 'Banco do Brasil', color: '#FEDF00', logo: 'https://www.google.com/s2/favicons?domain=bb.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'inter', label: 'Banco Inter', color: '#FF7A00', logo: 'https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'santander', label: 'Santander', color: '#EC0000', logo: 'https://www.google.com/s2/favicons?domain=santander.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'picpay', label: 'PicPay', color: '#21C25E', logo: 'https://www.google.com/s2/favicons?domain=picpay.com&sz=64', defaultCurrency: 'BRL' },
  { value: 'mercadopago', label: 'Mercado Pago', color: '#00B1EA', logo: 'https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'c6', label: 'C6 Bank', color: '#242424', logo: 'https://www.google.com/s2/favicons?domain=c6bank.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'original', label: 'Banco Original', color: '#00A86B', logo: 'https://www.google.com/s2/favicons?domain=original.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'neon', label: 'Neon', color: '#00E5FF', logo: 'https://www.google.com/s2/favicons?domain=neon.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'next', label: 'Next', color: '#00FF87', logo: 'https://www.google.com/s2/favicons?domain=next.me&sz=64', defaultCurrency: 'BRL' },
  { value: 'pagbank', label: 'PagBank', color: '#00A86B', logo: 'https://www.google.com/s2/favicons?domain=pagbank.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'contasimples', label: 'Conta Simples', color: '#00C853', logo: 'https://www.google.com/s2/favicons?domain=contasimples.com.br&sz=64', defaultCurrency: 'BRL' },
  { value: 'avenue', label: 'Avenue', color: '#000000', logo: 'https://www.google.com/s2/favicons?domain=avenue.us&sz=64', defaultCurrency: 'USD' },
  { value: 'wise', label: 'Wise', color: '#00D48B', logo: 'https://www.google.com/s2/favicons?domain=wise.com&sz=64', defaultCurrency: 'USD' },
  { value: 'nomad', label: 'Nomad', color: '#6366F1', logo: 'https://www.google.com/s2/favicons?domain=nomadglobal.com&sz=64', defaultCurrency: 'USD' },
  { value: 'outro', label: 'Outro', color: '#6b7280', logo: null, defaultCurrency: 'BRL' }
];

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)', symbol: 'R$', locale: 'pt-BR' },
  { value: 'USD', label: 'Dólar ($)', symbol: '$', locale: 'en-US' }
];

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: CreditCard },
  { value: 'savings', label: 'Poupança', icon: PiggyBank },
  { value: 'investment', label: 'Investimento', icon: TrendingUp },
  { value: 'wallet', label: 'Carteira Digital', icon: Wallet }
];

export const FinanceAccounts = ({ userId }: { userId?: string }) => {
  const { user } = useAdminAuth(); const effectiveUserId = userId ?? user?.id;
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    bank_name: '',
    color: '#6b7280',
    initial_balance: '',
    currency: 'BRL'
  });

  useEffect(() => {
    if (effectiveUserId) {
      fetchAccounts();
    }
  }, [effectiveUserId]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Erro ao carregar contas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      // Formatar valor inicial para exibição no input
      const currencyConfig = CURRENCIES.find(c => c.value === account.currency) || CURRENCIES[0];
      const formattedBalance = account.initial_balance > 0
        ? new Intl.NumberFormat(currencyConfig.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(account.initial_balance)
        : '';
      setFormData({
        name: account.name,
        type: account.type,
        bank_name: account.bank_name || '',
        color: account.color || '#6b7280',
        initial_balance: formattedBalance,
        currency: account.currency || 'BRL'
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'checking',
        bank_name: '',
        color: '#6b7280',
        initial_balance: '',
        currency: 'BRL'
      });
    }
    setShowDialog(true);
  };

  const handleBankChange = (bankValue: string) => {
    const bank = BRAZILIAN_BANKS.find(b => b.value === bankValue);
    setFormData(prev => ({
      ...prev,
      bank_name: bankValue,
      color: bank?.color || prev.color,
      currency: bank?.defaultCurrency || prev.currency
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome da conta é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse do valor formatado para número
      const initialBalance = formData.initial_balance 
        ? parseFloat(formData.initial_balance.replace(/\./g, '').replace(',', '.')) || 0 
        : 0;
      const bank = BRAZILIAN_BANKS.find(b => b.value === formData.bank_name);
      
      // Calcular novo current_balance quando editando
      let newCurrentBalance = initialBalance;
      if (editingAccount) {
        // Verificar se existem transações vinculadas a esta conta
        const { count: transactionCount } = await supabase
          .from('finance_transactions')
          .select('*', { head: true, count: 'exact' })
          .eq('account_id', editingAccount.id);
        
        console.log('[FinanceAccounts] Editando conta:', {
          accountId: editingAccount.id,
          oldInitialBalance: editingAccount.initial_balance,
          oldCurrentBalance: editingAccount.current_balance,
          newInitialBalance: initialBalance,
          transactionCount
        });
        
        if (transactionCount === 0 || transactionCount === null) {
          // Sem transações: current_balance deve ser igual ao initial_balance
          newCurrentBalance = initialBalance;
        } else {
          // Com transações: ajustar proporcionalmente à mudança do saldo inicial
          const initialBalanceDiff = initialBalance - editingAccount.initial_balance;
          newCurrentBalance = editingAccount.current_balance + initialBalanceDiff;
        }
        
        console.log('[FinanceAccounts] Novo current_balance calculado:', newCurrentBalance);
      }
      
      const payload = {
        user_id: effectiveUserId!,
        name: formData.name.trim(),
        type: formData.type,
        bank_name: bank?.label || formData.bank_name || null,
        icon: bank?.logo || null,
        color: formData.color,
        initial_balance: initialBalance,
        current_balance: newCurrentBalance,
        is_active: true,
        currency: formData.currency
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('finance_accounts')
          .update(payload)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast({ title: "Conta atualizada!" });
      } else {
        const { error } = await supabase
          .from('finance_accounts')
          .insert(payload);

        if (error) throw error;
        toast({ title: "Conta criada!" });
      }

      setShowDialog(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Erro ao salvar conta",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if there are transactions linked to this account
      const { data: transactions } = await supabase
        .from('finance_transactions')
        .select('id')
        .eq('account_id', id)
        .limit(1);

      if (transactions && transactions.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta conta possui transações vinculadas",
          variant: "destructive"
        });
        setDeleteConfirm(null);
        return;
      }

      const { error } = await supabase
        .from('finance_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Conta excluída!" });
      setDeleteConfirm(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro ao excluir conta",
        variant: "destructive"
      });
    }
  };

  const formatCurrencyValue = (value: number, currency: string = 'BRL') => {
    const currencyConfig = CURRENCIES.find(c => c.value === currency) || CURRENCIES[0];
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  // Formatar número para exibição no input baseado na moeda
  const formatCurrencyInput = (value: string, currency: string = 'BRL'): string => {
    // Detecta se já está formatado (tem vírgula ou ponto como separador decimal)
    const currencyConfig = CURRENCIES.find(c => c.value === currency) || CURRENCIES[0];
    
    // Remove caracteres não numéricos exceto ponto e vírgula
    let cleanValue = value.replace(/[^\d.,]/g, '');
    
    // Se vazio ou só pontos/vírgulas, retorna vazio
    if (!cleanValue || cleanValue.replace(/[.,]/g, '') === '') return '';
    
    // Detecta formato brasileiro (vírgula como decimal) vs americano (ponto como decimal)
    const lastComma = cleanValue.lastIndexOf(',');
    const lastDot = cleanValue.lastIndexOf('.');
    
    let numericValue: number;
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56 ou 279,79
      numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
    } else if (lastDot > lastComma) {
      // Formato americano: 1,234.56 ou 279.79
      numericValue = parseFloat(cleanValue.replace(/,/g, '')) || 0;
    } else {
      // Só números, sem separador decimal
      numericValue = parseFloat(cleanValue) || 0;
    }
    
    if (numericValue === 0) return '';
    
    return new Intl.NumberFormat(currencyConfig.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  };

  // Parse de exibição para número
  const parseCurrencyInput = (value: string): number => {
    if (!value) return 0;
    
    // Remove caracteres não numéricos exceto ponto e vírgula
    const cleanValue = value.replace(/[^\d.,]/g, '');
    if (!cleanValue) return 0;
    
    const lastComma = cleanValue.lastIndexOf(',');
    const lastDot = cleanValue.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Formato americano: 1,234.56
      return parseFloat(cleanValue.replace(/,/g, '')) || 0;
    }
  };

  const getTotalBalanceByCurrency = (currency: string) => {
    return accounts
      .filter(acc => acc.currency === currency)
      .reduce((sum, acc) => sum + acc.current_balance, 0);
  };

  const getCurrenciesInUse = () => {
    const currencies = new Set(accounts.map(acc => acc.currency || 'BRL'));
    return Array.from(currencies);
  };

  const getAccountTypeLabel = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getAccountTypeIcon = (type: string) => {
    const Icon = ACCOUNT_TYPES.find(t => t.value === type)?.icon || Wallet;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Total */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Minhas Contas</h2>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {getCurrenciesInUse().map(currency => {
              const total = getTotalBalanceByCurrency(currency);
              return (
                <span key={currency}>
                  Saldo {currency}: <span className={`font-semibold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyValue(total, currency)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Saldo por Conta Card */}
      {accounts.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Saldo por Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map(account => {
                const totalAccounts = accounts.reduce((sum, a) => sum + Math.max(0, a.current_balance), 0);
                const percentage = totalAccounts > 0 ? (Math.max(0, account.current_balance) / totalAccounts) * 100 : 0;
                
                return (
                  <div key={account.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {account.icon ? (
                          <img 
                            src={account.icon} 
                            alt={account.bank_name || 'Banco'} 
                            className="h-6 w-6 rounded-full object-contain bg-white p-0.5 border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        <span className={`text-lg ${account.icon ? 'hidden' : ''}`}>🏦</span>
                        <div>
                          <span className="text-sm font-medium">{account.name}</span>
                          {account.bank_name && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({account.bank_name})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.currency || 'BRL'}
                        </Badge>
                        <span className={`text-sm font-semibold ${account.current_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrencyValue(account.current_balance, account.currency || 'BRL')}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: account.color || '#6b7280'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Totals by currency */}
              <div className="pt-3 border-t mt-3 space-y-2">
                {getCurrenciesInUse().map(currency => {
                  const total = getTotalBalanceByCurrency(currency);
                  return (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total {currency}</span>
                      <span className={`text-base font-bold ${total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrencyValue(total, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 md:py-20">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">
              Nenhuma conta cadastrada
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Adicione sua primeira conta bancária para começar a controlar suas finanças
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Card 
              key={account.id} 
              className="relative overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: account.color || '#6b7280' }}
              />
              
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {account.icon ? (
                      <img 
                        src={account.icon} 
                        alt={account.bank_name || 'Banco'} 
                        className="h-10 w-10 rounded-full object-contain bg-white p-1 border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl ${account.icon ? 'hidden' : ''}`}>🏦</span>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {account.bank_name || 'Sem banco'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {getAccountTypeLabel(account.type)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {account.currency || 'BRL'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                  <p className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyValue(account.current_balance, account.currency || 'BRL')}
                  </p>
                  {account.current_balance !== account.initial_balance && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      {account.current_balance > account.initial_balance ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      Inicial: {formatCurrencyValue(account.initial_balance, account.currency || 'BRL')}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenDialog(account)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(account.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Conta' : 'Nova Conta'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount 
                ? 'Atualize os dados da conta bancária'
                : 'Adicione uma nova conta bancária para controle'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Conta *</Label>
              <Input
                placeholder="Ex: Nubank Principal"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Banco</Label>
              <Select 
                value={formData.bank_name} 
                onValueChange={handleBankChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_BANKS.map(bank => (
                    <SelectItem key={bank.value} value={bank.value}>
                      <span className="flex items-center gap-2">
                        {bank.logo ? (
                          <img src={bank.logo} alt={bank.label} className="h-5 w-5 rounded" />
                        ) : (
                          <span>🏦</span>
                        )}
                        <span>{bank.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Saldo Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {CURRENCIES.find(c => c.value === formData.currency)?.symbol || 'R$'}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={formData.currency === 'USD' ? '0.00' : '0,00'}
                  className="pl-10"
                  value={formData.initial_balance}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value, formData.currency);
                    setFormData(prev => ({ ...prev, initial_balance: formatted }));
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingAccount ? 'Atualizar' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
