import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, CheckCircle, AlertTriangle, TrendingUp, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Transaction {
  id: string;
  created_at: string;
  product_name: string | null;
  status: string;
  amount: number;
  utm_data: Record<string, string> | null;
}

interface UTMStats {
  total: number;
  withUtm: number;
  withoutUtm: number;
  successRate: number;
  sourceBreakdown: Record<string, number>;
  trafficTypeBreakdown: Record<string, number>;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const ITEMS_PER_PAGE = 10;

export function UTMDebugSection() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<UTMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("7");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTransactions();
    setCurrentPage(1);
  }, [periodFilter, statusFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(periodFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('pix_transactions')
        .select('id, created_at, product_name, status, amount, utm_data')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const typedData = (data || []) as Transaction[];
      
      // Filter by UTM status
      let filtered = typedData;
      if (statusFilter === "with") {
        filtered = typedData.filter(t => t.utm_data && Object.keys(t.utm_data).length > 0);
      } else if (statusFilter === "without") {
        filtered = typedData.filter(t => !t.utm_data || Object.keys(t.utm_data).length === 0);
      }

      setTransactions(filtered);
      calculateStats(typedData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Transaction[]) => {
    const total = data.length;
    const withUtm = data.filter(t => t.utm_data && Object.keys(t.utm_data).length > 0).length;
    const withoutUtm = total - withUtm;
    const successRate = total > 0 ? (withUtm / total) * 100 : 0;

    const sourceBreakdown: Record<string, number> = {};
    const trafficTypeBreakdown: Record<string, number> = {};

    data.forEach(t => {
      if (t.utm_data && Object.keys(t.utm_data).length > 0) {
        const source = t.utm_data.utm_source || 'unknown';
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;

        const trafficType = t.utm_data.traffic_type || 'unknown';
        trafficTypeBreakdown[trafficType] = (trafficTypeBreakdown[trafficType] || 0) + 1;
      } else {
        sourceBreakdown['sem_utm'] = (sourceBreakdown['sem_utm'] || 0) + 1;
        trafficTypeBreakdown['sem_utm'] = (trafficTypeBreakdown['sem_utm'] || 0) + 1;
      }
    });

    setStats({ total, withUtm, withoutUtm, successRate, sourceBreakdown, trafficTypeBreakdown });
  };

  // Simplify pie data: show Sem UTM, Facebook, and group others
  const pieData = (() => {
    if (!stats) return [];
    
    const result: { name: string; value: number }[] = [];
    let outrosValue = 0;
    
    Object.entries(stats.sourceBreakdown).forEach(([name, value]) => {
      const lowerName = name.toLowerCase();
      
      if (name === 'sem_utm') {
        result.push({ name: 'Sem UTM', value });
      } else if (lowerName === 'facebook' || lowerName === 'fb' || lowerName.includes('facebook')) {
        // Find existing Facebook entry or create new
        const fbEntry = result.find(r => r.name === 'Facebook');
        if (fbEntry) {
          fbEntry.value += value;
        } else {
          result.push({ name: 'Facebook', value });
        }
      } else {
        outrosValue += value;
      }
    });
    
    if (outrosValue > 0) {
      result.push({ name: 'Outros', value: outrosValue });
    }
    
    return result.sort((a, b) => b.value - a.value);
  })();

  // Pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasUtm = (t: Transaction) => t.utm_data && Object.keys(t.utm_data).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          UTM Debug
        </h2>
        <Button variant="outline" size="sm" onClick={fetchTransactions}>
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Com UTM
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats?.withUtm || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Sem UTM
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats?.withoutUtm || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Taxa Captura
            </div>
            <p className="text-2xl font-bold">{stats?.successRate.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Filters Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fontes de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Período</label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Este mês</SelectItem>
                  <SelectItem value="365">Este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status UTM</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com UTM</SelectItem>
                  <SelectItem value="without">Sem UTM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Traffic Type Breakdown */}
            {stats && Object.keys(stats.trafficTypeBreakdown).length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Tipo de Tráfego</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.trafficTypeBreakdown).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Transações Recentes</CardTitle>
            {transactions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {transactions.length} transações
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Medium</TableHead>
                      <TableHead className="text-xs">Campaign</TableHead>
                      <TableHead className="text-xs">Traffic</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((t) => (
                      <TableRow 
                        key={t.id} 
                        className={`cursor-pointer ${selectedTransaction?.id === t.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedTransaction(t)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{t.product_name || '-'}</TableCell>
                        <TableCell className="text-xs">{t.utm_data?.utm_source || '-'}</TableCell>
                        <TableCell className="text-xs">{t.utm_data?.utm_medium || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{t.utm_data?.utm_campaign || '-'}</TableCell>
                        <TableCell className="text-xs">{t.utm_data?.traffic_type || '-'}</TableCell>
                        <TableCell>
                          {hasUtm(t) ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">✓</Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 text-xs">⚠</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* UTM Details Panel */}
      {selectedTransaction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Detalhes UTM</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>
                Fechar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transação ID</p>
                <p className="text-sm font-mono">{selectedTransaction.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data</p>
                <p className="text-sm">{formatDate(selectedTransaction.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Produto</p>
                <p className="text-sm">{selectedTransaction.product_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor</p>
                <p className="text-sm">R$ {selectedTransaction.amount.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">UTM Data (JSON)</p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                {selectedTransaction.utm_data && Object.keys(selectedTransaction.utm_data).length > 0
                  ? JSON.stringify(selectedTransaction.utm_data, null, 2)
                  : '{ }  // Nenhum UTM capturado'}
              </pre>
            </div>

            {selectedTransaction.utm_data && Object.keys(selectedTransaction.utm_data).length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(selectedTransaction.utm_data).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="text-sm truncate" title={String(value)}>{String(value) || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
