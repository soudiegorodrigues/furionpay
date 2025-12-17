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
}

const BRAZILIAN_BANKS = [
  { value: 'nubank', label: 'Nubank', color: '#820AD1', logo: 'https://www.google.com/s2/favicons?domain=nubank.com.br&sz=64' },
  { value: 'itau', label: 'Itaú', color: '#EC7000', logo: 'https://www.google.com/s2/favicons?domain=itau.com.br&sz=64' },
  { value: 'bradesco', label: 'Bradesco', color: '#CC092F', logo: 'https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=64' },
  { value: 'caixa', label: 'Caixa Econômica', color: '#005CA9', logo: 'https://www.google.com/s2/favicons?domain=caixa.gov.br&sz=64' },
  { value: 'bb', label: 'Banco do Brasil', color: '#FEDF00', logo: 'https://www.google.com/s2/favicons?domain=bb.com.br&sz=64' },
  { value: 'inter', label: 'Banco Inter', color: '#FF7A00', logo: 'https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=64' },
  { value: 'santander', label: 'Santander', color: '#EC0000', logo: 'https://www.google.com/s2/favicons?domain=santander.com.br&sz=64' },
  { value: 'picpay', label: 'PicPay', color: '#21C25E', logo: 'https://www.google.com/s2/favicons?domain=picpay.com&sz=64' },
  { value: 'mercadopago', label: 'Mercado Pago', color: '#00B1EA', logo: 'https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=64' },
  { value: 'c6', label: 'C6 Bank', color: '#242424', logo: 'https://www.google.com/s2/favicons?domain=c6bank.com.br&sz=64' },
  { value: 'original', label: 'Banco Original', color: '#00A86B', logo: 'https://www.google.com/s2/favicons?domain=original.com.br&sz=64' },
  { value: 'neon', label: 'Neon', color: '#00E5FF', logo: 'https://www.google.com/s2/favicons?domain=neon.com.br&sz=64' },
  { value: 'next', label: 'Next', color: '#00FF87', logo: 'https://www.google.com/s2/favicons?domain=next.me&sz=64' },
  { value: 'pagbank', label: 'PagBank', color: '#00A86B', logo: 'https://www.google.com/s2/favicons?domain=pagbank.com.br&sz=64' },
  { value: 'contasimples', label: 'Conta Simples', color: '#00C853', logo: 'https://www.google.com/s2/favicons?domain=contasimples.com.br&sz=64' },
  { value: 'outro', label: 'Outro', color: '#6b7280', logo: null }
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
    initial_balance: ''
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
      setFormData({
        name: account.name,
        type: account.type,
        bank_name: account.bank_name || '',
        color: account.color || '#6b7280',
        initial_balance: account.initial_balance.toString()
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'checking',
        bank_name: '',
        color: '#6b7280',
        initial_balance: ''
      });
    }
    setShowDialog(true);
  };

  const handleBankChange = (bankValue: string) => {
    const bank = BRAZILIAN_BANKS.find(b => b.value === bankValue);
    setFormData(prev => ({
      ...prev,
      bank_name: bankValue,
      color: bank?.color || prev.color
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
      const initialBalance = parseFloat(formData.initial_balance) || 0;
      const bank = BRAZILIAN_BANKS.find(b => b.value === formData.bank_name);
      
      const payload = {
        user_id: effectiveUserId!,
        name: formData.name.trim(),
        type: formData.type,
        bank_name: bank?.label || formData.bank_name || null,
        icon: bank?.logo || null,
        color: formData.color,
        initial_balance: initialBalance,
        current_balance: editingAccount ? editingAccount.current_balance : initialBalance,
        is_active: true
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
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
          <p className="text-sm text-muted-foreground">
            Saldo total: <span className={`font-semibold ${getTotalBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(getTotalBalance())}
            </span>
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma conta cadastrada.<br />
              Adicione sua primeira conta bancária.
            </p>
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
                  <Badge variant="outline" className="text-xs">
                    {getAccountTypeLabel(account.type)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                  <p className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(account.current_balance)}
                  </p>
                  {account.current_balance !== account.initial_balance && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      {account.current_balance > account.initial_balance ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      Inicial: {formatCurrency(account.initial_balance)}
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
              <Label>Saldo Inicial</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.initial_balance}
                onChange={(e) => setFormData(prev => ({ ...prev, initial_balance: e.target.value }))}
              />
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
