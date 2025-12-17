import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Database, Clock, Trash2, RotateCcw, Plus, RefreshCw, Package, DollarSign, Settings, Users, ShieldCheck, Download, Upload, HardDrive, FileArchive, Image, Music, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

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

interface StorageFile {
  bucket_id: string;
  file_name: string;
  file_path: string;
  size_bytes: number;
  mimetype: string;
  created_at: string;
  public_url: string;
}

interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  buckets: Array<{
    bucket_id: string;
    file_count: number;
    size_bytes: number;
  }>;
}

export function BackupsSection() {
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
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

  const loadStorageStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_storage_stats_for_backup');
      if (error) throw error;
      setStorageStats(data as unknown as StorageStats);
    } catch (error: any) {
      console.error('Error loading storage stats:', error);
    }
  };

  const [lastStorageUpdate, setLastStorageUpdate] = useState<Date | null>(null);

  const loadStorageStatsWithTimestamp = async () => {
    await loadStorageStats();
    setLastStorageUpdate(new Date());
  };

  useEffect(() => {
    loadBackups();
    loadStorageStatsWithTimestamp();
    
    // Polling every 30 seconds
    const interval = setInterval(() => {
      loadStorageStatsWithTimestamp();
    }, 30000);
    
    // Update on tab focus
    const handleFocus = () => loadStorageStatsWithTimestamp();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
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
    setExportProgress(0);
    
    try {
      // Step 1: Export database (20%)
      setExportProgress(5);
      const { data: dbData, error: dbError } = await supabase.rpc('export_full_backup');
      if (dbError) throw dbError;
      setExportProgress(20);

      // Step 2: Get storage files list (30%)
      const { data: storageFiles, error: storageError } = await supabase.rpc('get_storage_files_for_backup');
      if (storageError) throw storageError;
      setExportProgress(30);

      // Create ZIP file
      const zip = new JSZip();
      
      // Add database backup to ZIP
      zip.file('backup-data.json', JSON.stringify(dbData, null, 2));

      // Step 3: Download and add storage files (30-90%)
      const files = (storageFiles || []) as StorageFile[];
      const totalFiles = files.length;
      
      if (totalFiles > 0) {
        const storageFolder = zip.folder('storage');
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            // Download file
            const response = await fetch(file.public_url);
            if (response.ok) {
              const blob = await response.blob();
              // Add to ZIP with folder structure
              const bucketFolder = storageFolder?.folder(file.bucket_id);
              bucketFolder?.file(file.file_name, blob);
            }
          } catch (fileError) {
            console.warn(`Failed to download ${file.file_path}:`, fileError);
          }
          
          // Update progress
          const fileProgress = Math.round(30 + (60 * (i + 1) / totalFiles));
          setExportProgress(fileProgress);
        }
      }

      // Step 4: Generate ZIP (90-100%)
      setExportProgress(92);
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      setExportProgress(98);

      // Create timestamp for filename
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `furionpay-backup-completo-${timestamp}.zip`;
      
      // Download ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      
      const sizeInMB = (zipBlob.size / (1024 * 1024)).toFixed(2);
      toast.success(`Backup completo exportado! (${sizeInMB} MB, ${totalFiles} arquivos)`);
    } catch (error: any) {
      console.error('Error exporting backup:', error);
      toast.error('Erro ao exportar backup');
    } finally {
      setExportLoading(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportProgress(0);

    try {
      const isZip = file.name.endsWith('.zip');
      
      if (isZip) {
        // Handle ZIP backup (complete with storage)
        setImportProgress(5);
        const zip = await JSZip.loadAsync(file);
        setImportProgress(15);
        
        // Extract database JSON
        const jsonFile = zip.file('backup-data.json');
        if (!jsonFile) {
          throw new Error('Arquivo de backup inválido: backup-data.json não encontrado');
        }
        
        const jsonText = await jsonFile.async('string');
        const backupData = JSON.parse(jsonText);
        setImportProgress(25);
        
        // Validate structure
        if (!backupData.tables || !backupData.version) {
          throw new Error('Arquivo de backup inválido');
        }

        // Import database
        const { error: dbError } = await supabase.rpc('import_full_backup', {
          p_backup_data: backupData
        });
        if (dbError) throw dbError;
        setImportProgress(40);

        // Upload storage files
        const storageFolder = zip.folder('storage');
        if (storageFolder) {
          const storageFiles: { path: string; file: JSZip.JSZipObject }[] = [];
          
          storageFolder.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
              storageFiles.push({ path: relativePath, file: zipEntry });
            }
          });

          const totalFiles = storageFiles.length;
          
          for (let i = 0; i < storageFiles.length; i++) {
            const { path, file: zipFile } = storageFiles[i];
            try {
              const blob = await zipFile.async('blob');
              const pathParts = path.split('/');
              const bucketId = pathParts[0];
              const fileName = pathParts.slice(1).join('/');
              
              // Upload to storage
              await supabase.storage
                .from(bucketId)
                .upload(fileName, blob, { upsert: true });
            } catch (uploadError) {
              console.warn(`Failed to upload ${path}:`, uploadError);
            }
            
            // Update progress (40% to 95%)
            const fileProgress = Math.round(40 + (55 * (i + 1) / totalFiles));
            setImportProgress(fileProgress);
          }
        }
        
        setImportProgress(100);
        toast.success('Backup completo importado com sucesso! (Banco + Storage)');
      } else {
        // Handle JSON backup (database only - legacy)
        setImportProgress(10);
        const text = await file.text();
        const backupData = JSON.parse(text);
        setImportProgress(30);
        
        // Validate structure
        if (!backupData.tables || !backupData.version) {
          throw new Error('Arquivo de backup inválido');
        }

        const { error } = await supabase.rpc('import_full_backup', {
          p_backup_data: backupData
        });
        
        if (error) throw error;
        
        setImportProgress(100);
        toast.success('Backup importado com sucesso! (apenas banco de dados)');
      }
      
      loadBackups();
      loadStorageStats();
    } catch (error: any) {
      console.error('Error importing backup:', error);
      toast.error(error.message || 'Erro ao importar backup');
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportProgress(0), 1000);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBucketIcon = (bucketId: string) => {
    switch (bucketId) {
      case 'banners':
      case 'product-images':
      case 'rewards':
        return <Image className="h-3 w-3" />;
      case 'notification-sounds':
        return <Music className="h-3 w-3" />;
      case 'user-documents':
        return <FileText className="h-3 w-3" />;
      default:
        return <HardDrive className="h-3 w-3" />;
    }
  };

  const totalRecords = backups.reduce((acc, b) => acc + b.total_records, 0);
  const automaticCount = backups.filter(b => b.backup_type === 'automatic').length;
  const manualCount = backups.filter(b => b.backup_type === 'manual').length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <HardDrive className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Storage</p>
                <p className="text-2xl font-bold">
                  {storageStats?.total_files || 0} <span className="text-sm font-normal text-muted-foreground">arquivos</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(storageStats?.total_size_bytes || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage buckets detail */}
      {storageStats && storageStats.buckets && storageStats.buckets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Buckets de Storage incluídos no backup
              </CardTitle>
              {lastStorageUpdate && (
                <span className="text-xs text-muted-foreground">
                  Atualizado: {lastStorageUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {storageStats.buckets.map((bucket) => (
                <Badge key={bucket.bucket_id} variant="outline" className="text-xs gap-1.5 py-1">
                  {getBucketIcon(bucket.bucket_id)}
                  <span className="font-medium">{bucket.bucket_id}</span>
                  <span className="text-muted-foreground">
                    ({bucket.file_count} arquivos, {formatFileSize(bucket.size_bytes)})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create backup */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileArchive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Backup Completo do Sistema</p>
                  <p className="text-sm text-muted-foreground">
                    Inclui: banco de dados (30 tabelas) + Storage ({storageStats?.total_files || 0} arquivos)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { loadBackups(); loadStorageStatsWithTimestamp(); }}
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
                  {exportLoading ? 'Exportando...' : 'Exportar ZIP'}
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
                  accept=".json,.zip"
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

            {/* Progress bars */}
            {exportProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Exportando backup completo...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </div>
            )}

            {importProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importando backup...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
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
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
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
              {actionLoading ? 'Deletando...' : 'Deletar Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
