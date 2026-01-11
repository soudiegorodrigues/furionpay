import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Settings2,
  Calendar,
  RefreshCw,
  Filter,
  X,
  Pencil,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceProductMetricsProps {
  userId?: string;
}

interface BusinessManager {
  id: string;
  name: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  product_code: string | null;
}

interface DailyMetric {
  id: string;
  date: string;
  product_id: string | null;
  bm_id: string | null;
  budget: number;
  spent: number;
  revenue: number;
  link: string | null;
  notes: string | null;
}

interface RevenueData {
  gross: number;
  net: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const BMManager = memo(({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [bms, setBms] = useState<BusinessManager[]>([]);
  const [newBmName, setNewBmName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingBmId, setEditingBmId] = useState<string | null>(null);
  const [editingBmName, setEditingBmName] = useState("");

  const fetchBMs = useCallback(async () => {
    const { data, error } = await supabase
      .from('business_managers')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (!error && data) {
      setBms(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBMs();
  }, [fetchBMs]);

  const handleAddBM = async () => {
    if (!newBmName.trim()) return;
    
    const { error } = await supabase
      .from('business_managers')
      .insert({ user_id: userId, name: newBmName.trim() });
    
    if (error) {
      toast.error("Erro ao adicionar BM");
    } else {
      toast.success("BM adicionado!");
      setNewBmName("");
      fetchBMs();
    }
  };

  const handleEditBM = async (id: string) => {
    if (!editingBmName.trim()) return;
    
    const { error } = await supabase
      .from('business_managers')
      .update({ name: editingBmName.trim() })
      .eq('id', id);
    
    if (error) {
      toast.error("Erro ao editar BM");
    } else {
      toast.success("BM atualizado!");
      setEditingBmId(null);
      setEditingBmName("");
      fetchBMs();
    }
  };

  const handleDeleteBM = async (id: string) => {
    const { error } = await supabase
      .from('business_managers')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error("Erro ao excluir BM");
    } else {
      toast.success("BM excluído!");
      fetchBMs();
    }
  };

  if (loading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nome do BM (ex: BM 3 -CT1)"
          value={newBmName}
          onChange={(e) => setNewBmName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddBM()}
        />
        <Button onClick={handleAddBM} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {bms.map((bm) => (
          <div key={bm.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
            {editingBmId === bm.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editingBmName}
                  onChange={(e) => setEditingBmName(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditBM(bm.id);
                    if (e.key === 'Escape') setEditingBmId(null);
                  }}
                />
                <Button size="icon" className="h-7 w-7" onClick={() => handleEditBM(bm.id)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingBmId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-sm">{bm.name}</span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingBmId(bm.id);
                      setEditingBmName(bm.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteBM(bm.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        {bms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum BM cadastrado
          </p>
        )}
      </div>
      
      <Button variant="outline" className="w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
});

BMManager.displayName = 'BMManager';

export const FinanceProductMetrics = memo(({ userId }: FinanceProductMetricsProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bms, setBms] = useState<BusinessManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [bmDialogOpen, setBmDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string; field: string} | null>(null);
  
  // Filters
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterBm, setFilterBm] = useState<string>('all');
  
  // Calculated revenue from pix_transactions
  const [calculatedRevenue, setCalculatedRevenue] = useState<Record<string, RevenueData>>({});
  const [revenueLoading, setRevenueLoading] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Use string representations to avoid infinite re-renders
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [metricsRes, productsRes, bmsRes] = await Promise.all([
      supabase
        .from('product_daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .order('date'),
      supabase
        .from('products')
        .select('id, name, product_code')
        .eq('user_id', userId)
        .order('name'),
      supabase
        .from('business_managers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name')
    ]);

    if (metricsRes.data) setMetrics(metricsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (bmsRes.data) setBms(bmsRes.data);
    
    setLoading(false);
  }, [userId, monthStartStr, monthEndStr]);

  // Fetch revenue from pix_transactions
  const fetchRevenueForMonth = useCallback(async () => {
    if (!userId || !products.length || !metrics.length) return;
    
    setRevenueLoading(true);
    
    // Get all product_codes from products
    const productCodes = products
      .map(p => p.product_code)
      .filter((code): code is string => Boolean(code));
    
    if (!productCodes.length) {
      setRevenueLoading(false);
      return;
    }
    
    // Fetch all paid transactions for the month
    const { data: transactions, error } = await supabase
      .from('pix_transactions')
      .select('product_code, paid_date_brazil, amount, fee_percentage, fee_fixed')
      .eq('status', 'paid')
      .in('product_code', productCodes)
      .gte('paid_date_brazil', monthStartStr)
      .lte('paid_date_brazil', monthEndStr);
    
    if (error) {
      console.error('Error fetching revenue:', error);
      setRevenueLoading(false);
      return;
    }
    
    // Calculate gross and net revenue per metric
    const revenueMap: Record<string, RevenueData> = {};
    
    metrics.forEach(metric => {
      const product = products.find(p => p.id === metric.product_id);
      
      if (!product?.product_code) {
        revenueMap[metric.id] = { gross: 0, net: 0 };
        return;
      }
      
      const dayTransactions = transactions?.filter(tx => 
        tx.product_code === product.product_code && 
        tx.paid_date_brazil === metric.date
      ) || [];
      
      let gross = 0;
      let net = 0;
      
      dayTransactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        const feePercent = Number(tx.fee_percentage) || 0;
        const feeFixed = Number(tx.fee_fixed) || 0;
        
        gross += amount;
        net += amount - (amount * feePercent / 100) - feeFixed;
      });
      
      revenueMap[metric.id] = { gross, net };
    });
    
    setCalculatedRevenue(revenueMap);
    setRevenueLoading(false);
  }, [userId, products, metrics, monthStartStr, monthEndStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch revenue when metrics or products change
  useEffect(() => {
    if (metrics.length > 0 && products.length > 0) {
      fetchRevenueForMonth();
    }
  }, [metrics, products, fetchRevenueForMonth]);

  // Filtered metrics
  const filteredMetrics = useMemo(() => {
    return metrics.filter(metric => {
      // Filter by date
      if (filterDate && metric.date !== format(filterDate, 'yyyy-MM-dd')) return false;
      // Filter by product
      if (filterProduct !== 'all' && metric.product_id !== filterProduct) return false;
      // Filter by BM
      if (filterBm !== 'all' && metric.bm_id !== filterBm) return false;
      return true;
    });
  }, [metrics, filterDate, filterProduct, filterBm]);

  const handleAddRow = async (date: Date) => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('product_daily_metrics')
      .insert({
        user_id: userId,
        date: format(date, 'yyyy-MM-dd'),
        budget: 0,
        spent: 0,
        revenue: 0
      })
      .select()
      .single();
    
    if (error) {
      toast.error("Erro ao adicionar linha");
    } else if (data) {
      setMetrics(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success("Linha adicionada!");
    }
  };

  const handleUpdateMetric = async (id: string, field: string, value: any) => {
    const updateData: any = { [field]: value };
    
    const { error } = await supabase
      .from('product_daily_metrics')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      setMetrics(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    }
    setEditingCell(null);
  };

  const handleDeleteRow = async (id: string) => {
    const { error } = await supabase
      .from('product_daily_metrics')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      setMetrics(prev => prev.filter(m => m.id !== id));
      toast.success("Linha excluída!");
    }
  };

  const clearFilters = () => {
    setFilterDate(undefined);
    setFilterProduct('all');
    setFilterBm('all');
  };

  const hasActiveFilters = filterDate || filterProduct !== 'all' || filterBm !== 'all';

  // Calculate totals based on filtered metrics and calculated revenue
  const totals = useMemo(() => {
    return filteredMetrics.reduce((acc, m) => {
      const revenue = calculatedRevenue[m.id] || { gross: 0, net: 0 };
      return {
        budget: acc.budget + Number(m.budget || 0),
        spent: acc.spent + Number(m.spent || 0),
        gross: acc.gross + revenue.gross,
        net: acc.net + revenue.net
      };
    }, { budget: 0, spent: 0, gross: 0, net: 0 });
  }, [filteredMetrics, calculatedRevenue]);

  const roi = totals.spent > 0 ? ((totals.net - totals.spent) / totals.spent * 100) : 0;
  const balance = totals.budget - totals.spent;

  const getProductName = (productId: string | null) => {
    if (!productId) return "-";
    return products.find(p => p.id === productId)?.name || "-";
  };

  const getBmName = (bmId: string | null) => {
    if (!bmId) return "-";
    return bms.find(b => b.id === bmId)?.name || "-";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Orçamento</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totals.budget)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Gasto</span>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totals.spent)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Fat. Bruto</span>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.gross)}</p>
              {revenueLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Fat. Líquido</span>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-lg font-bold text-green-700">{formatCurrency(totals.net)}</p>
              {revenueLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {balance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-xs">Saldo Orçam.</span>
            </div>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-xs">ROI (Líq.)</span>
            </div>
            <p className={`text-lg font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {roi.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={bmDialogOpen} onOpenChange={setBmDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Gerenciar BMs
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gerenciar Business Managers</DialogTitle>
                  </DialogHeader>
                  {userId && (
                    <BMManager 
                      userId={userId} 
                      onClose={() => {
                        setBmDialogOpen(false);
                        fetchData();
                      }} 
                    />
                  )}
                </DialogContent>
              </Dialog>
              
              <Button size="sm" onClick={() => handleAddRow(new Date())}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Linha
              </Button>
            </div>
          </div>
          
          {/* Filters Section */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  {filterDate ? format(filterDate, 'dd/MM/yy') : 'Todos os dias'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  locale={ptBR}
                  disabled={(date) => 
                    date < monthStart || date > monthEnd
                  }
                />
                {filterDate && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setFilterDate(undefined)}
                    >
                      Limpar data
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
            {/* Product Filter */}
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* BM Filter */}
            <Select value={filterBm} onValueChange={setFilterBm}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Todos os BMs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os BMs</SelectItem>
                {bms.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Data</TableHead>
                  <TableHead className="min-w-[150px]">Produto</TableHead>
                  <TableHead className="min-w-[120px]">BM</TableHead>
                  <TableHead className="w-28 text-right">Orçamento</TableHead>
                  <TableHead className="w-28 text-right">Gasto</TableHead>
                  <TableHead className="w-28 text-right">Fat. Bruto</TableHead>
                  <TableHead className="w-28 text-right">Fat. Líquido</TableHead>
                  <TableHead className="w-20 text-right">ROI</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters 
                        ? 'Nenhum registro encontrado com os filtros aplicados.'
                        : 'Nenhum registro neste mês. Clique em "Nova Linha" para começar.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetrics.map((metric) => {
                    const revenue = calculatedRevenue[metric.id] || { gross: 0, net: 0 };
                    const metricRoi = Number(metric.spent) > 0 
                      ? ((revenue.net - Number(metric.spent)) / Number(metric.spent) * 100) 
                      : 0;
                    
                    return (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">
                          {format(new Date(metric.date + 'T12:00:00'), 'dd/MM/yy')}
                        </TableCell>
                        
                        <TableCell>
                          <Select
                            value={metric.product_id || "none"}
                            onValueChange={(value) => handleUpdateMetric(metric.id, 'product_id', value === "none" ? null : value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        
                        <TableCell>
                          <Select
                            value={metric.bm_id || "none"}
                            onValueChange={(value) => handleUpdateMetric(metric.id, 'bm_id', value === "none" ? null : value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {bms.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {editingCell?.id === metric.id && editingCell?.field === 'budget' ? (
                            <Input
                              type="number"
                              className="h-8 w-24 text-right text-xs"
                              defaultValue={metric.budget}
                              autoFocus
                              onBlur={(e) => handleUpdateMetric(metric.id, 'budget', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateMetric(metric.id, 'budget', parseFloat((e.target as HTMLInputElement).value) || 0);
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="cursor-pointer hover:bg-muted px-2 py-1 rounded text-xs"
                              onClick={() => setEditingCell({ id: metric.id, field: 'budget' })}
                            >
                              {formatCurrency(Number(metric.budget))}
                            </span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {editingCell?.id === metric.id && editingCell?.field === 'spent' ? (
                            <Input
                              type="number"
                              className="h-8 w-24 text-right text-xs"
                              defaultValue={metric.spent}
                              autoFocus
                              onBlur={(e) => handleUpdateMetric(metric.id, 'spent', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateMetric(metric.id, 'spent', parseFloat((e.target as HTMLInputElement).value) || 0);
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="cursor-pointer hover:bg-muted px-2 py-1 rounded text-xs text-destructive"
                              onClick={() => setEditingCell({ id: metric.id, field: 'spent' })}
                            >
                              {formatCurrency(Number(metric.spent))}
                            </span>
                          )}
                        </TableCell>
                        
                        {/* Fat. Bruto - Read-only calculated */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-xs text-emerald-600">
                            {formatCurrency(revenue.gross)}
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TableCell>
                        
                        {/* Fat. Líquido - Read-only calculated */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-xs text-green-700 font-medium">
                            {formatCurrency(revenue.net)}
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <Badge variant={metricRoi >= 0 ? "default" : "destructive"} className="text-xs">
                            {metricRoi.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRow(metric.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                
                {/* Totals Row */}
                {filteredMetrics.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.budget)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(totals.spent)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(totals.gross)}</TableCell>
                    <TableCell className="text-right text-green-700">{formatCurrency(totals.net)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={roi >= 0 ? "default" : "destructive"}>
                        {roi.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

FinanceProductMetrics.displayName = 'FinanceProductMetrics';

export default FinanceProductMetrics;
