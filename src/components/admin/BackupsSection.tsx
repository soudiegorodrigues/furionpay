import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Clock, Download, Trash2, RotateCcw, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Backup {
  backup_id: string;
  backed_up_at: string;
  transaction_count: number;
  backup_type: string;
  backed_up_by_email: string | null;
}

export function BackupsSection() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [dialogType, setDialogType] = useState<'restore' | 'delete' | null>(null);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase.rpc('get_transaction_backups');
      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      console.error('Error loading backups:', error);
      toast.error('Erro ao carregar backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_manual_backup');
      if (error) throw error;
      toast.success('Backup criado com sucesso!');
      loadBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error('Erro ao criar backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('restore_transactions_from_backup', {
        p_backup_id: selectedBackup.backup_id
      });
      if (error) throw error;
      toast.success('Backup restaurado com sucesso!');
      setDialogType(null);
      setSelectedBackup(null);
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('delete_transaction_backup', {
        p_backup_id: selectedBackup.backup_id
      });
      if (error) throw error;
      toast.success('Backup deletado com sucesso!');
      setDialogType(null);
      setSelectedBackup(null);
      loadBackups();
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      toast.error('Erro ao deletar backup');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const automaticCount = backups.filter(b => b.backup_type === 'automatic').length;
  const manualCount = backups.filter(b => b.backup_type === 'manual').length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Backups</p>
                <p className="text-2xl font-bold">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Automáticos</p>
                <p className="text-2xl font-bold">{automaticCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manuais</p>
                <p className="text-2xl font-bold">{manualCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next backup info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Próximo backup automático</p>
                <p className="text-sm text-muted-foreground">Diariamente às 03:00 (horário de Brasília)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadBackups}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button 
                size="sm" 
                onClick={handleCreateBackup}
                disabled={actionLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Backup Manual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Backups Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum backup encontrado</p>
              <p className="text-sm">Crie um backup manual ou aguarde o backup automático</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Transações</TableHead>
                    <TableHead className="hidden sm:table-cell">Criado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.backup_id}>
                      <TableCell className="font-medium">
                        {formatDate(backup.backed_up_at)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={backup.backup_type === 'automatic' ? 'default' : 'secondary'}
                          className={backup.backup_type === 'automatic' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                        >
                          {backup.backup_type === 'automatic' ? 'Automático' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>{backup.transaction_count.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {backup.backed_up_by_email || 'Sistema'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setDialogType('restore');
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Restaurar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setDialogType('delete');
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore confirmation dialog */}
      <AlertDialog open={dialogType === 'restore'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja restaurar este backup? As transações do backup serão adicionadas ao sistema.
              <br /><br />
              <strong>Data:</strong> {selectedBackup && formatDate(selectedBackup.backed_up_at)}<br />
              <strong>Transações:</strong> {selectedBackup?.transaction_count.toLocaleString('pt-BR')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={actionLoading}>
              {actionLoading ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={dialogType === 'delete'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este backup? Esta ação não pode ser desfeita.
              <br /><br />
              <strong>Data:</strong> {selectedBackup && formatDate(selectedBackup.backed_up_at)}<br />
              <strong>Transações:</strong> {selectedBackup?.transaction_count.toLocaleString('pt-BR')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
