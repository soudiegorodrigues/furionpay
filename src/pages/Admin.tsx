import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, 
  Globe, 
  CreditCard, 
  Users, 
  FileText, 
  Percent, 
  Palette,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GlobalStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Domain {
  id: string;
  domain: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;
type DateFilter = 'all' | 'today' | '7days' | 'month' | 'year';

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign },
  { id: "dominios", title: "Domínios", icon: Globe },
  { id: "multi", title: "Multi-adquirência", icon: CreditCard },
  { id: "usuarios", title: "Usuários", icon: Users },
  { id: "documentos", title: "Documentos", icon: FileText },
  { id: "taxas", title: "Taxas", icon: Percent },
  { id: "personalizacao", title: "Personalização", icon: Palette },
];

const Admin = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("faturamento");
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  
  // Domain states
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainName, setNewDomainName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (activeSection === "faturamento") {
      loadGlobalStats();
      loadTransactions();
    } else if (activeSection === "dominios") {
      loadDomains();
    }
  }, [activeSection]);

  const loadGlobalStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_dashboard_auth');
      if (error) throw error;
      setGlobalStats(data as unknown as GlobalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_transactions_auth', { p_limit: 500 });
      if (error) throw error;
      setTransactions(data as unknown as Transaction[] || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const loadDomains = async () => {
    setIsLoadingDomains(true);
    try {
      const { data, error } = await supabase
        .from('available_domains')
        .select('*')
        .order('domain');
      
      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar domínios",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Erro",
        description: "Digite um domínio válido",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('available_domains')
        .insert({
          domain: newDomain.trim().toLowerCase(),
          name: newDomainName.trim() || null
        });
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este domínio já existe",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Domínio adicionado com sucesso!"
        });
        setNewDomain("");
        setNewDomainName("");
        loadDomains();
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar domínio",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleDomainStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('available_domains')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setDomains(domains.map(d => 
        d.id === id ? { ...d, is_active: !currentStatus } : d
      ));
      
      toast({
        title: "Sucesso",
        description: `Domínio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error) {
      console.error('Error toggling domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar domínio",
        variant: "destructive"
      });
    }
  };

  const deleteDomain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('available_domains')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setDomains(domains.filter(d => d.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Domínio removido com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover domínio",
        variant: "destructive"
      });
    }
  };

  const startEditing = (domain: Domain) => {
    setEditingId(domain.id);
    setEditDomain(domain.domain);
    setEditName(domain.name || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDomain("");
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    if (!editDomain.trim()) {
      toast({
        title: "Erro",
        description: "Digite um domínio válido",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('available_domains')
        .update({
          domain: editDomain.trim().toLowerCase(),
          name: editName.trim() || null
        })
        .eq('id', id);
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este domínio já existe",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        setDomains(domains.map(d => 
          d.id === id 
            ? { ...d, domain: editDomain.trim().toLowerCase(), name: editName.trim() || null }
            : d
        ));
        cancelEditing();
        toast({
          title: "Sucesso",
          description: "Domínio atualizado com sucesso!"
        });
      }
    } catch (error) {
      console.error('Error updating domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar domínio",
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

  const formatDate = (dateString: string) => {
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

  const conversionRate = globalStats && globalStats.total_generated > 0 
    ? ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1) 
    : '0';

  // Filter transactions by date
  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'all') return transactions;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return transactions.filter(tx => {
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
  }, [transactions, dateFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        
        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-3">
          {adminSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </Button>
          ))}
        </div>

        {/* Content Sections */}
        {activeSection === "faturamento" && (
          <>
            {/* Stats Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Faturamento Global
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => { loadGlobalStats(); loadTransactions(); }} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : globalStats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl font-bold text-blue-500">
                        {globalStats.total_generated}
                      </div>
                      <p className="text-sm text-muted-foreground">PIX Gerados</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(globalStats.total_amount_generated)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl font-bold text-green-500">
                        {globalStats.total_paid}
                      </div>
                      <p className="text-sm text-muted-foreground">PIX Pagos</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(globalStats.total_amount_paid)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-500">
                        {conversionRate}%
                      </div>
                      <p className="text-sm text-muted-foreground">Conversão</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl font-bold text-red-500">
                        {globalStats.total_expired}
                      </div>
                      <p className="text-sm text-muted-foreground">Expirados</p>
                    </div>

                    {/* Today Stats */}
                    <div className="col-span-2 lg:col-span-4 mt-4">
                      <h3 className="text-lg font-semibold mb-3">Hoje</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-blue-500">
                            {globalStats.today_generated}
                          </div>
                          <p className="text-sm text-muted-foreground">Gerados Hoje</p>
                        </div>
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-green-500">
                            {globalStats.today_paid}
                          </div>
                          <p className="text-sm text-muted-foreground">Pagos Hoje</p>
                        </div>
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(globalStats.today_amount_paid)}
                          </div>
                          <p className="text-sm text-muted-foreground">Recebido Hoje</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Transações Globais
                  <Badge variant="secondary" className="ml-2">{filteredTransactions.length}</Badge>
                </CardTitle>
                <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                  <SelectTrigger className="w-[150px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma transação encontrada
                  </p>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pago em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm">
                                {formatDate(tx.created_at)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tx.donor_name || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.product_name || '-'}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(tx.amount)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(tx.status)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.paid_at ? formatDate(tx.paid_at) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Próximo
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === "dominios" && (
          <div className="space-y-6">
            {/* Add Domain */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Domínio
                </CardTitle>
                <CardDescription>
                  Adicione um novo domínio disponível para os usuários escolherem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio</Label>
                    <Input
                      id="domain"
                      placeholder="exemplo.com.br"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      placeholder="Nome amigável"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={addDomain} disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Domínio
                </Button>
              </CardContent>
            </Card>

            {/* Domains List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Domínios Cadastrados
                </CardTitle>
                <CardDescription>
                  {domains.length} domínio(s) cadastrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDomains ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : domains.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum domínio cadastrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {domains.map((domain) => (
                      <div 
                        key={domain.id} 
                        className={`p-4 rounded-lg border ${
                          domain.is_active ? 'bg-card' : 'bg-muted/50'
                        }`}
                      >
                        {editingId === domain.id ? (
                          /* Editing Mode */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Domínio</Label>
                                <Input
                                  value={editDomain}
                                  onChange={(e) => setEditDomain(e.target.value)}
                                  placeholder="exemplo.com.br"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Nome (opcional)</Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Nome amigável"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(domain.id)}>
                                <Check className="w-4 h-4 mr-1" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                domain.is_active ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <div>
                                <p className="font-medium">{domain.domain}</p>
                                {domain.name && (
                                  <p className="text-sm text-muted-foreground">{domain.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => startEditing(domain)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Switch
                                checked={domain.is_active}
                                onCheckedChange={() => toggleDomainStatus(domain.id, domain.is_active)}
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover domínio?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O domínio "{domain.domain}" será removido permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteDomain(domain.id)}>
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "multi" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Multi-adquirência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "usuarios" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "documentos" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "taxas" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taxas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "personalizacao" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Personalização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Admin;
