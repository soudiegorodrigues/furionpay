import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  user_email: string | null;
}

type DateFilter = 'all' | 'today' | '7days' | 'month' | 'year';
type StatusFilter = 'all' | 'generated' | 'paid' | 'expired';

const ITEMS_PER_PAGE = 10;

export const TransacoesGlobaisSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailSearch, setEmailSearch] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_transactions_auth', { p_limit: 500 });
      if (error) throw error;
      setTransactions(data as unknown as Transaction[] || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pago</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Gerado</Badge>;
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    if (emailSearch.trim()) {
      const search = emailSearch.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.user_email?.toLowerCase().includes(search)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        switch (dateFilter) {
          case 'today':
            return txDate >= startOfDay;
          case '7days':
            const sevenDaysAgo = new Date(startOfDay);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return txDate >= sevenDaysAgo;
          case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return txDate >= startOfMonth;
          case 'year':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return txDate >= startOfYear;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [transactions, dateFilter, statusFilter, emailSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, emailSearch]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Transações Globais
          <Badge variant="secondary" className="ml-2 text-xs">{filteredTransactions.length}</Badge>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar email..."
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              className="w-[140px] sm:w-[180px] h-8 text-xs sm:text-sm pl-7"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs sm:text-sm">
              <SelectValue>
                {statusFilter === 'all' ? 'Status' : statusFilter === 'paid' ? 'Pago' : statusFilter === 'generated' ? 'Gerado' : 'Expirado'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="generated">Gerado</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue>
                {dateFilter === 'all' ? 'Período' : dateFilter === 'today' ? 'Hoje' : dateFilter === '7days' ? '7 dias' : dateFilter === 'month' ? 'Este mês' : 'Este ano'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada
          </p>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                        {tx.user_email || '-'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[60px] truncate">
                        {tx.donor_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[100px] truncate">
                        {tx.product_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStatusBadge(tx.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline mr-1">Próximo</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
