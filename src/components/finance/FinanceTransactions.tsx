import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Repeat,
  RefreshCw,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
  account_id: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_end_date: string | null;
  person_type: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  bank_name: string | null;
  icon: string | null;
  color: string | null;
}

const RECURRING_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' }
];

const ITEMS_PER_PAGE = 10;

export const FinanceTransactions = ({ userId }: { userId?: string }) => {
  const { user } = useAdminAuth();
  const { toast } = useToast(); const effectiveUserId = userId ?? user?.id;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPersonType, setFilterPersonType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    type: 'expense' as string,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    account_id: '',
    is_recurring: false,
    recurring_frequency: '',
    recurring_end_date: '',
    person_type: 'PF' as string
  });
  const [isGeneratingRecurring, setIsGeneratingRecurring] = useState(false);
  const [isSyncingWithdrawals, setIsSyncingWithdrawals] = useState(false);

  useEffect(() => {
    if (effectiveUserId) {
      fetchData();
    }
  }, [effectiveUserId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transactionsRes, categoriesRes, accountsRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', effectiveUserId!)
          .order('date', { ascending: false }),
        supabase
          .from('finance_categories')
          .select('*')
          .eq('user_id', effectiveUserId!),
        supabase
          .from('finance_accounts')
          .select('id, name, bank_name, icon, color')
          .eq('user_id', effectiveUserId!)
          .eq('is_active', true)
      ]);

      if (transactionsRes.data) setTransactions(transactionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (accountsRes.data) setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !searchTerm || 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categories.find(c => c.id === t.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesPersonType = filterPersonType === 'all' || t.person_type === filterPersonType;
      
      return matchesSearch && matchesType && matchesPersonType;
    });
  }, [transactions, searchTerm, filterType, filterPersonType, categories]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        date: transaction.date,
        category_id: transaction.category_id || '',
        account_id: transaction.account_id || '',
        is_recurring: transaction.is_recurring,
        recurring_frequency: transaction.recurring_frequency || '',
        recurring_end_date: transaction.recurring_end_date || '',
        person_type: transaction.person_type || 'PF'
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        account_id: '',
        is_recurring: false,
        recurring_frequency: '',
        recurring_end_date: '',
        person_type: 'PF'
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero",
        variant: "destructive"
      });
      return;
    }

    if (!effectiveUserId) return; setIsSubmitting(true);
    try {
      const payload = {
        user_id: effectiveUserId!,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: formData.date,
        category_id: formData.category_id || null,
        account_id: formData.account_id || null,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null,
        recurring_end_date: formData.is_recurring && formData.recurring_end_date ? formData.recurring_end_date : null,
        person_type: formData.person_type
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('finance_transactions')
          .update(payload)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        toast({ title: "Transação atualizada!" });
      } else {
        const { error } = await supabase
          .from('finance_transactions')
          .insert(payload);

        if (error) throw error;
        toast({ title: "Transação registrada!" });
      }

      setShowDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Erro ao salvar transação",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Transação excluída!" });
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Erro ao excluir transação",
        variant: "destructive"
      });
    }
  };

  // Generate recurring transactions
  const generateRecurringTransactions = useCallback(async () => {
    if (!effectiveUserId) return;
    
    setIsGeneratingRecurring(true);
    try {
      // Get all recurring transactions
      const { data: recurringTxs, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .eq('is_recurring', true);

      if (error) throw error;
      if (!recurringTxs || recurringTxs.length === 0) {
        toast({ title: "Nenhuma transação recorrente encontrada" });
        setIsGeneratingRecurring(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const transactionsToCreate: any[] = [];

      for (const tx of recurringTxs) {
        const startDate = new Date(tx.date + 'T00:00:00');
        const endDate = tx.recurring_end_date ? new Date(tx.recurring_end_date + 'T00:00:00') : today;
        
        if (!tx.recurring_frequency) continue;

        // Calculate all dates based on frequency
        let currentDate = new Date(startDate);
        const generatedDates: string[] = [];

        while (currentDate <= endDate && currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Skip the original transaction date
          if (dateStr !== tx.date) {
            generatedDates.push(dateStr);
          }

          // Increment based on frequency
          switch (tx.recurring_frequency) {
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'biweekly':
              currentDate.setDate(currentDate.getDate() + 14);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case 'quarterly':
              currentDate.setMonth(currentDate.getMonth() + 3);
              break;
            case 'yearly':
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
            default:
              currentDate = new Date(endDate.getTime() + 86400000); // exit loop
          }
        }

        // Check which dates already exist
        const { data: existingTxs } = await supabase
          .from('finance_transactions')
          .select('date')
          .eq('user_id', effectiveUserId!)
          .eq('type', tx.type)
          .eq('amount', tx.amount)
          .eq('category_id', tx.category_id)
          .in('date', generatedDates);

        const existingDates = new Set(existingTxs?.map(t => t.date) || []);

        // Create transactions for missing dates
        for (const date of generatedDates) {
          if (!existingDates.has(date)) {
            transactionsToCreate.push({
              user_id: effectiveUserId!,
              type: tx.type,
              amount: tx.amount,
              description: tx.description ? `${tx.description} (recorrente)` : 'Transação recorrente',
              date: date,
              category_id: tx.category_id,
              is_recurring: false, // Generated transactions are not marked as recurring
              recurring_frequency: null,
              recurring_end_date: null
            });
          }
        }
      }

      if (transactionsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('finance_transactions')
          .insert(transactionsToCreate);

        if (insertError) throw insertError;

        toast({
          title: "Transações geradas!",
          description: `${transactionsToCreate.length} transação(ões) recorrente(s) criada(s)`
        });
        fetchData();
      } else {
        toast({ title: "Todas as transações recorrentes já estão em dia" });
      }
    } catch (error) {
      console.error('Error generating recurring transactions:', error);
      toast({
        title: "Erro ao gerar transações recorrentes",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingRecurring(false);
    }
  }, [effectiveUserId, toast]);

  // Sync approved withdrawals as income
  const syncWithdrawals = useCallback(async () => {
    if (!effectiveUserId) return;
    
    setIsSyncingWithdrawals(true);
    try {
      // Fetch approved withdrawals for this user
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .eq('status', 'approved');

      if (wError) throw wError;
      if (!withdrawals || withdrawals.length === 0) {
        toast({ title: "Nenhum saque aprovado encontrado" });
        setIsSyncingWithdrawals(false);
        return;
      }

      // Get or create "Saques" category
      let saquesCategory = categories.find(c => c.name === 'Saques' && c.type === 'income');
      
      if (!saquesCategory) {
        const { data: newCategory, error: catError } = await supabase
          .from('finance_categories')
          .insert({
            user_id: effectiveUserId!,
            name: 'Saques',
            type: 'income',
            color: '#10b981',
            icon: 'wallet',
            is_default: false
          })
          .select()
          .single();

        if (catError) throw catError;
        saquesCategory = newCategory;
      }

      // Get existing synced transactions to avoid duplicates
      const { data: existingTxs } = await supabase
        .from('finance_transactions')
        .select('description')
        .eq('user_id', effectiveUserId!)
        .eq('type', 'income')
        .eq('category_id', saquesCategory.id);

      const existingWithdrawalIds = new Set(
        existingTxs?.map(t => {
          const match = t.description?.match(/\[ID: ([^\]]+)\]/);
          return match ? match[1] : null;
        }).filter(Boolean) || []
      );

      // Create transactions for non-synced withdrawals
      const transactionsToCreate = withdrawals
        .filter(w => !existingWithdrawalIds.has(w.id))
        .map(w => ({
          user_id: effectiveUserId!,
          type: 'income',
          amount: w.amount,
          description: `Saque aprovado - ${w.bank_name} [ID: ${w.id}]`,
          date: w.processed_at ? new Date(w.processed_at).toISOString().split('T')[0] : new Date(w.created_at).toISOString().split('T')[0],
          category_id: saquesCategory!.id,
          is_recurring: false,
          recurring_frequency: null,
          recurring_end_date: null
        }));

      if (transactionsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('finance_transactions')
          .insert(transactionsToCreate);

        if (insertError) throw insertError;

        toast({
          title: "Saques sincronizados!",
          description: `${transactionsToCreate.length} saque(s) importado(s) como receita`
        });
        fetchData();
      } else {
        toast({ title: "Todos os saques já estão sincronizados" });
      }
    } catch (error) {
      console.error('Error syncing withdrawals:', error);
      toast({
        title: "Erro ao sincronizar saques",
        variant: "destructive"
      });
    } finally {
      setIsSyncingWithdrawals(false);
    }
  }, [effectiveUserId, categories, toast]);

  const getCategoryById = (id: string | null) => {
    return categories.find(c => c.id === id);
  };

  const getAccountById = (id: string | null) => {
    return accounts.find(a => a.id === id);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'investment': return <PiggyBank className="h-4 w-4 text-purple-600" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-red-600';
      case 'investment': return 'text-purple-600';
      default: return '';
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-96 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {/* Busca e filtro */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="investment">Investimentos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPersonType} onValueChange={setFilterPersonType}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="PF/PJ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PF">Pessoa Física</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Botões de ação */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={syncWithdrawals}
            disabled={isSyncingWithdrawals}
            className="w-full sm:w-auto gap-2"
          >
            {isSyncingWithdrawals ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Sincronizar Saques
          </Button>
          <Button 
            variant="outline" 
            onClick={generateRecurringTransactions}
            disabled={isGeneratingRecurring}
            className="w-full sm:w-auto gap-2"
          >
            {isGeneratingRecurring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Gerar Recorrentes
          </Button>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">PF/PJ</TableHead>
                  <TableHead className="hidden lg:table-cell">Conta</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map(transaction => {
                    const category = getCategoryById(transaction.category_id);
                    const account = getAccountById(transaction.account_id);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span>{formatDate(transaction.date)}</span>
                              {transaction.is_recurring && (
                                <Badge variant="outline" className="text-xs gap-1 hidden sm:inline-flex">
                                  <Repeat className="h-3 w-3" />
                                  {RECURRING_OPTIONS.find(o => o.value === transaction.recurring_frequency)?.label || 'Recorrente'}
                                </Badge>
                              )}
                              {/* Mobile: show type icon inline */}
                              <span className="md:hidden flex items-center gap-1">
                                {getTypeIcon(transaction.type)}
                                {category && (
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(transaction.type)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={transaction.person_type === 'PJ' ? 'secondary' : 'outline'} className="text-xs">
                            {transaction.person_type || 'PF'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {account ? (
                            <div className="flex items-center gap-2">
                              <span>{account.icon || '🏦'}</span>
                              <span className="text-sm">{account.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {category ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-sm">{category.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getTypeColor(transaction.type)}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(transaction)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(transaction.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {filteredTransactions.length} transação(ões)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs sm:text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction 
                ? 'Atualize as informações da transação'
                : 'Registre uma nova transação financeira'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense' | 'investment') => 
                  setFormData({ ...formData, type: value, category_id: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Receita
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Despesa
                    </div>
                  </SelectItem>
                  <SelectItem value="investment">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-purple-600" />
                      Investimento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <Select
                value={formData.person_type}
                onValueChange={(value) => setFormData({ ...formData, person_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta</Label>
              <Select
                value={formData.account_id}
                onValueChange={(value) => setFormData({ ...formData, account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon || '🏦'}</span>
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da transação..."
                rows={2}
              />
            </div>

            {/* Recurring Transaction Options */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Transação Recorrente</Label>
                  <p className="text-xs text-muted-foreground">
                    Repetir automaticamente
                  </p>
                </div>
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    is_recurring: checked,
                    recurring_frequency: checked ? 'monthly' : ''
                  })}
                />
              </div>

              {formData.is_recurring && (
                <>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={formData.recurring_frequency}
                      onValueChange={(value) => setFormData({ ...formData, recurring_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de término (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.recurring_end_date}
                      onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                      min={formData.date}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para repetir indefinidamente
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTransaction ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
