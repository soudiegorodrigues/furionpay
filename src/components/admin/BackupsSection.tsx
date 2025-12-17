import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Clock, Trash2, RotateCcw, Plus, RefreshCw, Package, DollarSign, Settings, Users, ShieldCheck, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";

interface SystemBackup {
  id: string;
  backup_name: string;
  backup_type: string;
  backed_up_at: string;
  backed_up_by_email: string | null;
  total_records: number;
  pix_count: number;
  withdrawal_count: number;
  fee_count: number;
  settings_count: number;
  products_count: number;
  profiles_count: number;
}

export function BackupsSection() {
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<SystemBackup | null>(null);
  const [dialogType, setDialogType] = useState<'restore' | 'delete' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_backups');
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
      const { data, error } = await supabase.rpc('create_full_system_backup');
      if (error) throw error;
      toast.success('Backup completo criado com sucesso!');
      loadBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error('Erro ao criar backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setExportLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_full_backup');
      if (error) throw error;
      
      // Create timestamp for filename
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `furionpay-backup-${timestamp}.json`;
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup exportado com sucesso!');
    } catch (error: any) {
      console.error('Error exporting backup:', error);
      toast.error('Erro ao exportar backup');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // Validate structure
      if (!backupData.tables || !backupData.version) {
        throw new Error('Arquivo de backup inválido');
      }

      const { data, error } = await supabase.rpc('import_full_backup', {
        p_backup_data: backupData
      });
      
      if (error) throw error;
      
      toast.success('Backup importado com sucesso!');
      loadBackups();
    } catch (error: any) {
      console.error('Error importing backup:', error);
      toast.error(error.message || 'Erro ao importar backup');
    } finally {
      setImportLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('restore_full_system_backup', {
        p_backup_id: selectedBackup.id
      });
      if (error) throw error;
      toast.success('Sistema restaurado com sucesso!');
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
      const { error } = await supabase.rpc('delete_system_backup', {
        p_backup_id: selectedBackup.id
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

  const totalRecords = backups.reduce((acc, b) => acc + b.total_records, 0);
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
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros Protegidos</p>
                <p className="text-2xl font-bold">{totalRecords.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manual / Automático</p>
                <p className="text-2xl font-bold">{manualCount} / {automaticCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create backup */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Backup Completo do Sistema</p>
                <p className="text-sm text-muted-foreground">
                  Inclui: transações, saques, taxas, produtos, configurações e mais
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
                variant="outline"
                size="sm" 
                onClick={handleExportBackup}
                disabled={exportLoading}
              >
                <Download className={`h-4 w-4 mr-2 ${exportLoading ? 'animate-pulse' : ''}`} />
                {exportLoading ? 'Exportando...' : 'Exportar'}
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                <Upload className={`h-4 w-4 mr-2 ${importLoading ? 'animate-pulse' : ''}`} />
                {importLoading ? 'Importando...' : 'Importar'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />
              <Button 
                size="sm" 
                onClick={handleCreateBackup}
                disabled={actionLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {actionLoading ? 'Criando...' : 'Criar Backup'}
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
              <p className="text-sm">Crie um backup completo do sistema</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="hidden lg:table-cell">Criado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{backup.backup_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(backup.backed_up_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={backup.backup_type === 'automatic' ? 'default' : 'secondary'}
                          className={backup.backup_type === 'automatic' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                        >
                          {backup.backup_type === 'automatic' ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            {backup.pix_count} PIX
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            {backup.withdrawal_count} Saques
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
                            <Package className="h-3 w-3" />
                            {backup.products_count} Produtos
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1 hidden md:flex">
                            <Settings className="h-3 w-3" />
                            {backup.settings_count} Configs
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1 hidden lg:flex">
                            <Users className="h-3 w-3" />
                            {backup.profiles_count} Perfis
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {backup.total_records.toLocaleString('pt-BR')} registros
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
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
            <AlertDialogTitle>Restaurar Sistema</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Tem certeza que deseja restaurar este backup? O sistema será restaurado para o estado do backup.</p>
                
                {selectedBackup && (
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <p><strong>Backup:</strong> {selectedBackup.backup_name}</p>
                    <p><strong>Data:</strong> {formatDate(selectedBackup.backed_up_at)}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline">{selectedBackup.pix_count} transações PIX</Badge>
                      <Badge variant="outline">{selectedBackup.withdrawal_count} saques</Badge>
                      <Badge variant="outline">{selectedBackup.products_count} produtos</Badge>
                      <Badge variant="outline">{selectedBackup.fee_count} taxas</Badge>
                      <Badge variant="outline">{selectedBackup.settings_count} configs</Badge>
                      <Badge variant="outline">{selectedBackup.profiles_count} perfis</Badge>
                    </div>
                    <p className="pt-1"><strong>Total:</strong> {selectedBackup.total_records.toLocaleString('pt-BR')} registros</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={actionLoading}>
              {actionLoading ? 'Restaurando...' : 'Restaurar Sistema'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={dialogType === 'delete'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Backup</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Tem certeza que deseja deletar este backup? Esta ação não pode ser desfeita.</p>
                
                {selectedBackup && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <p><strong>Backup:</strong> {selectedBackup.backup_name}</p>
                    <p><strong>Data:</strong> {formatDate(selectedBackup.backed_up_at)}</p>
                    <p><strong>Total:</strong> {selectedBackup.total_records.toLocaleString('pt-BR')} registros</p>
                  </div>
                )}
              </div>
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
