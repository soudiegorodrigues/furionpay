import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  RefreshCw, 
  DollarSign, 
  TrendingDown, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText
} from "lucide-react";

type ChargebackStatus = 'pending' | 'confirmed' | 'disputed' | 'resolved';

interface Chargeback {
  id: string;
  pix_transaction_id: string | null;
  external_id: string;
  acquirer: string;
  amount: number;
  original_amount: number | null;
  client_name: string | null;
  client_document: string | null;
  client_email: string | null;
  reason: string | null;
  status: ChargebackStatus;
  source: string;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  user_id: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: AlertCircle },
  disputed: { label: "Disputado", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: AlertTriangle },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: CheckCircle },
};

const acquirerColors: Record<string, string> = {
  valorion: "bg-purple-500/10 text-purple-600",
  ativus: "bg-blue-500/10 text-blue-600",
  efi: "bg-orange-500/10 text-orange-600",
  inter: "bg-green-500/10 text-green-600",
  unknown: "bg-gray-500/10 text-gray-600",
};

export function ChargebacksSection() {
  const { isAdmin, user } = useAdminAuth();
  const queryClient = useQueryClient();
  
  const effectiveUserId = user?.id;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [acquirerFilter, setAcquirerFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedChargeback, setSelectedChargeback] = useState<Chargeback | null>(null);
  
  // Form state for new chargeback
  const [newChargeback, setNewChargeback] = useState({
    external_id: "",
    acquirer: "valorion",
    amount: "",
    client_name: "",
    client_document: "",
    client_email: "",
    reason: "",
    notes: "",
    user_id: ""
  });

  // Fetch chargebacks
  const { data: chargebacks, isLoading } = useQuery({
    queryKey: ["chargebacks", effectiveUserId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("chargebacks")
        .select("*")
        .order("detected_at", { ascending: false });
      
      if (!isAdmin && effectiveUserId) {
        query = query.eq("user_id", effectiveUserId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Chargeback[];
    },
    enabled: !!effectiveUserId
  });

  // Fetch users for admin dropdown
  const { data: users } = useQuery({
    queryKey: ["users-for-chargebacks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_users_auth");
      if (error) throw error;
      return data as Array<{ id: string; email: string; full_name: string | null }>;
    },
    enabled: isAdmin
  });

  // Add chargeback mutation
  const addChargebackMutation = useMutation({
    mutationFn: async (data: typeof newChargeback) => {
      const { error } = await supabase.from("chargebacks").insert({
        external_id: data.external_id,
        acquirer: data.acquirer,
        amount: parseFloat(data.amount),
        original_amount: parseFloat(data.amount),
        client_name: data.client_name || null,
        client_document: data.client_document || null,
        client_email: data.client_email || null,
        reason: data.reason || null,
        notes: data.notes || null,
        user_id: data.user_id || effectiveUserId,
        source: "manual"
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chargeback registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["chargebacks"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao registrar chargeback: " + error.message);
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ChargebackStatus; notes?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
      if (notes) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from("chargebacks")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["chargebacks"] });
      setSelectedChargeback(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  const resetForm = () => {
    setNewChargeback({
      external_id: "",
      acquirer: "valorion",
      amount: "",
      client_name: "",
      client_document: "",
      client_email: "",
      reason: "",
      notes: "",
      user_id: ""
    });
  };

  // Filter chargebacks
  const filteredChargebacks = useMemo(() => {
    if (!chargebacks) return [];
    
    return chargebacks.filter(cb => {
      const matchesSearch = 
        cb.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cb.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cb.client_document?.includes(searchTerm) ||
        cb.client_email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || cb.status === statusFilter;
      const matchesAcquirer = acquirerFilter === "all" || cb.acquirer === acquirerFilter;
      
      return matchesSearch && matchesStatus && matchesAcquirer;
    });
  }, [chargebacks, searchTerm, statusFilter, acquirerFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!chargebacks) return { total: 0, totalAmount: 0, pending: 0, thisMonth: 0 };
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      total: chargebacks.length,
      totalAmount: chargebacks.reduce((sum, cb) => sum + cb.amount, 0),
      pending: chargebacks.filter(cb => cb.status === "pending").length,
      thisMonth: chargebacks.filter(cb => new Date(cb.detected_at) >= startOfMonth).length
    };
  }, [chargebacks]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Chargebacks / Estornos
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Controle e gestão de estornos e chargebacks
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Chargeback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Chargeback Manual</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Externo *</Label>
                  <Input 
                    placeholder="ID na adquirente"
                    value={newChargeback.external_id}
                    onChange={(e) => setNewChargeback(prev => ({ ...prev, external_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adquirente *</Label>
                  <Select 
                    value={newChargeback.acquirer}
                    onValueChange={(v) => setNewChargeback(prev => ({ ...prev, acquirer: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valorion">Valorion</SelectItem>
                      <SelectItem value="ativus">Ativus</SelectItem>
                      <SelectItem value="efi">EFI</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Valor Estornado *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newChargeback.amount}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              
              {isAdmin && users && Array.isArray(users) && (
                <div className="space-y-2">
                  <Label>Seller Afetado *</Label>
                  <Select 
                    value={newChargeback.user_id}
                    onValueChange={(v) => setNewChargeback(prev => ({ ...prev, user_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input 
                    placeholder="Nome"
                    value={newChargeback.client_name}
                    onChange={(e) => setNewChargeback(prev => ({ ...prev, client_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input 
                    placeholder="Documento"
                    value={newChargeback.client_document}
                    onChange={(e) => setNewChargeback(prev => ({ ...prev, client_document: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Email do Cliente</Label>
                <Input 
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newChargeback.client_email}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, client_email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Motivo do Estorno</Label>
                <Input 
                  placeholder="Ex: Cliente solicitou reembolso"
                  value={newChargeback.reason}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  placeholder="Notas adicionais..."
                  value={newChargeback.notes}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => addChargebackMutation.mutate(newChargeback)}
                disabled={!newChargeback.external_id || !newChargeback.amount || addChargebackMutation.isPending}
              >
                {addChargebackMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este Mês</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por ID, nome, CPF ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="disputed">Disputado</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={acquirerFilter} onValueChange={setAcquirerFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Adquirente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Adquirentes</SelectItem>
                <SelectItem value="valorion">Valorion</SelectItem>
                <SelectItem value="ativus">Ativus</SelectItem>
                <SelectItem value="efi">EFI</SelectItem>
                <SelectItem value="inter">Inter</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["chargebacks"] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredChargebacks.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhum chargeback encontrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm || statusFilter !== "all" || acquirerFilter !== "all" 
                  ? "Tente ajustar os filtros de busca" 
                  : "Os chargebacks registrados aparecerão aqui"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Externo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Adquirente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Detectado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChargebacks.map((cb) => {
                    const StatusIcon = statusConfig[cb.status].icon;
                    return (
                      <TableRow key={cb.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {cb.external_id.slice(0, 12)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{cb.client_name || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">{cb.client_email || cb.client_document || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-destructive">
                            {formatCurrency(cb.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={acquirerColors[cb.acquirer] || acquirerColors.unknown}>
                            {cb.acquirer.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig[cb.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[cb.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {cb.source === "manual" ? "Manual" : cb.source === "webhook" ? "Webhook" : "Reconciliação"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(cb.detected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedChargeback(cb)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && cb.status !== "resolved" && (
                              <Select
                                value={cb.status}
                                onValueChange={(v) => updateStatusMutation.mutate({ id: cb.id, status: v as ChargebackStatus })}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendente</SelectItem>
                                  <SelectItem value="confirmed">Confirmado</SelectItem>
                                  <SelectItem value="disputed">Disputado</SelectItem>
                                  <SelectItem value="resolved">Resolvido</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedChargeback} onOpenChange={() => setSelectedChargeback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Chargeback
            </DialogTitle>
          </DialogHeader>
          {selectedChargeback && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">ID Externo</Label>
                  <p className="font-mono text-sm break-all">{selectedChargeback.external_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Adquirente</Label>
                  <Badge variant="outline" className={acquirerColors[selectedChargeback.acquirer]}>
                    {selectedChargeback.acquirer.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Valor Estornado</Label>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(selectedChargeback.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Badge variant="outline" className={statusConfig[selectedChargeback.status].color}>
                    {statusConfig[selectedChargeback.status].label}
                  </Badge>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-muted-foreground text-xs">Dados do Cliente</Label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm"><strong>Nome:</strong> {selectedChargeback.client_name || "N/A"}</p>
                  <p className="text-sm"><strong>Documento:</strong> {selectedChargeback.client_document || "N/A"}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedChargeback.client_email || "N/A"}</p>
                </div>
              </div>
              
              {selectedChargeback.reason && (
                <div>
                  <Label className="text-muted-foreground text-xs">Motivo</Label>
                  <p className="text-sm mt-1">{selectedChargeback.reason}</p>
                </div>
              )}
              
              {selectedChargeback.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="text-sm mt-1 bg-muted p-2 rounded">{selectedChargeback.notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm text-muted-foreground">
                <div>
                  <span className="block text-xs">Detectado em</span>
                  {format(new Date(selectedChargeback.detected_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {selectedChargeback.resolved_at && (
                  <div>
                    <span className="block text-xs">Resolvido em</span>
                    {format(new Date(selectedChargeback.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
              </div>
              
              {selectedChargeback.pix_transaction_id && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Transação Vinculada</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                    {selectedChargeback.pix_transaction_id}
                  </code>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
