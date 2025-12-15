import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Calendar
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
  is_recurring: boolean;
  recurring_frequency: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

const ITEMS_PER_PAGE = 10;

export const FinanceTransactions = () => {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    type: 'expense' as string,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    is_recurring: false,
    recurring_frequency: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('finance_categories')
          .select('*')
          .eq('user_id', user!.id)
      ]);

      if (transactionsRes.data) setTransactions(transactionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
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
      
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType, categories]);

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
        is_recurring: transaction.is_recurring,
        recurring_frequency: transaction.recurring_frequency || ''
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        is_recurring: false,
        recurring_frequency: ''
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

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user!.id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: formData.date,
        category_id: formData.category_id || null,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null
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

  const getCategoryById = (id: string | null) => {
    return categories.find(c => c.id === id);
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
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
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map(transaction => {
                    const category = getCategoryById(transaction.category_id);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(transaction.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(transaction.type)}
                          </div>
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="max-w-[200px] truncate">
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
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
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
                <span className="text-sm">
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
        <DialogContent className="sm:max-w-md">
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
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da transação..."
                rows={2}
              />
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
