import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, CheckCircle, AlertTriangle, TrendingUp, Eye, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getUtmValue, hasUtmData, getAllUtmValues, UTMData } from "@/lib/utmHelpers";

interface Transaction {
  id: string;
  created_at: string;
  product_name: string | null;
  status: string;
  amount: number;
  utm_data: UTMData | null;
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
      
      // Filter by UTM status using helper
      let filtered = typedData;
      if (statusFilter === "with") {
        filtered = typedData.filter(t => hasUtmData(t.utm_data));
      } else if (statusFilter === "without") {
        filtered = typedData.filter(t => !hasUtmData(t.utm_data));
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
    const withUtm = data.filter(t => hasUtmData(t.utm_data)).length;
    const withoutUtm = total - withUtm;
    const successRate = total > 0 ? (withUtm / total) * 100 : 0;

    const sourceBreakdown: Record<string, number> = {};
    const trafficTypeBreakdown: Record<string, number> = {};

    data.forEach(t => {
      if (hasUtmData(t.utm_data)) {
        // Use helper to get utm_source from either structure
        const source = getUtmValue(t.utm_data, 'utm_source') || 'unknown';
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;

        // Traffic type might be at root level or in metadata
        const trafficType = (t.utm_data as any)?.traffic_type || (t.utm_data as any)?.metadata?.traffic_type || 'unknown';
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

  const txHasUtm = (t: Transaction) => hasUtmData(t.utm_data);

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">UTM Debug</CardTitle>
                <CardDescription>Monitore e analise os parâmetros UTM das transações</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com UTM</p>
                <p className="text-2xl font-bold text-emerald-600">{stats?.withUtm || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem UTM</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.withoutUtm || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Captura</p>
                <p className="text-2xl font-bold">{stats?.successRate.toFixed(1) || 0}%</p>
              </div>
            </div>
          </div>

          {/* Chart and Filters Row */}
          <div className="border-t" />
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="space-y-3">
              <h3 className="font-medium">Fontes de Tráfego</h3>
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
                <div className="h-[200px] flex items-center justify-center text-muted-foreground border rounded-lg">
                  Sem dados
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <h3 className="font-medium">Filtros</h3>
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
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border-t" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Transações Recentes</h3>
              {transactions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {transactions.length} transações
                </span>
              )}
            </div>
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
                          <TableCell className="text-xs">{getUtmValue(t.utm_data, 'utm_source') || '-'}</TableCell>
                          <TableCell className="text-xs">{getUtmValue(t.utm_data, 'utm_medium') || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{getUtmValue(t.utm_data, 'utm_campaign') || '-'}</TableCell>
                          <TableCell className="text-xs">{(t.utm_data as any)?.traffic_type || (t.utm_data as any)?.metadata?.traffic_type || '-'}</TableCell>
                          <TableCell>
                            {txHasUtm(t) ? (
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
          </div>

          {/* UTM Details Panel */}
          {selectedTransaction && (
            <>
              <div className="border-t" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Detalhes UTM</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>
                    Fechar
                  </Button>
                </div>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
