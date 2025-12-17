import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminSidebar, AdminHeader } from '@/components/AdminSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  CheckCheck,
  X
} from 'lucide-react';

interface Collaborator {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  can_view_dashboard: boolean;
  can_manage_checkout: boolean;
  can_manage_products: boolean;
  can_view_financeiro: boolean;
  can_manage_financeiro: boolean;
  can_view_transactions: boolean;
  can_manage_integrations: boolean;
  can_manage_settings: boolean;
  is_active: boolean;
  notes: string | null;
  invited_at: string;
  accepted_at: string | null;
}

interface PermissionsForm {
  can_view_dashboard: boolean;
  can_manage_checkout: boolean;
  can_manage_products: boolean;
  can_view_financeiro: boolean;
  can_manage_financeiro: boolean;
  can_view_transactions: boolean;
  can_manage_integrations: boolean;
  can_manage_settings: boolean;
}

const defaultPermissions: PermissionsForm = {
  can_view_dashboard: false,
  can_manage_checkout: false,
  can_manage_products: false,
  can_view_financeiro: false,
  can_manage_financeiro: false,
  can_view_transactions: false,
  can_manage_integrations: false,
  can_manage_settings: false,
};

const allPermissionsTrue: PermissionsForm = {
  can_view_dashboard: true,
  can_manage_checkout: true,
  can_manage_products: true,
  can_view_financeiro: true,
  can_manage_financeiro: true,
  can_view_transactions: true,
  can_manage_integrations: true,
  can_manage_settings: true,
};

const permissionLabels: Record<keyof PermissionsForm, { label: string; description: string }> = {
  can_view_dashboard: { label: 'Dashboard', description: 'Visualizar estatísticas e gráficos' },
  can_manage_checkout: { label: 'Checkout', description: 'Criar e editar ofertas' },
  can_manage_products: { label: 'Produtos', description: 'Gerenciar produtos' },
  can_view_financeiro: { label: 'Painel Financeiro', description: 'Ver saldo e solicitar saques' },
  can_manage_financeiro: { label: 'Gestão Financeira', description: 'Gerenciar contas e transações' },
  can_view_transactions: { label: 'Transações', description: 'Ver histórico de vendas' },
  can_manage_integrations: { label: 'Integrações', description: 'Configurar SpedPay, Banco Inter, etc' },
  can_manage_settings: { label: 'Configurações', description: 'Pixels, notificações, etc' },
};

// Skeleton component for loading state
const CollaboratorSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36" />
          <div className="flex gap-1.5 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 md:w-20" />
          <Skeleton className="h-8 w-8 md:w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Permissions Grid component for dialogs
const PermissionsGrid = ({ 
  permissions, 
  setPermissions,
  idPrefix = ''
}: { 
  permissions: PermissionsForm; 
  setPermissions: React.Dispatch<React.SetStateAction<PermissionsForm>>;
  idPrefix?: string;
}) => {
  const activeCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permissões
          <Badge variant="secondary" className="ml-1">
            {activeCount}/{totalCount}
          </Badge>
        </Label>
        <div className="flex gap-2">
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setPermissions(allPermissionsTrue)}
            className="text-xs h-7"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Todas
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setPermissions(defaultPermissions)}
            className="text-xs h-7"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 md:p-4 border rounded-lg bg-muted/30">
        {Object.entries(permissionLabels).map(([key, { label, description }]) => (
          <div key={key} className="flex items-start space-x-3">
            <Checkbox
              id={`${idPrefix}${key}`}
              checked={permissions[key as keyof PermissionsForm]}
              onCheckedChange={(checked) => 
                setPermissions(prev => ({ ...prev, [key]: checked === true }))
              }
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor={`${idPrefix}${key}`} className="cursor-pointer font-medium text-sm">
                {label}
              </Label>
              <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Collaborator Card component
const CollaboratorCard = ({
  collaborator,
  onEdit,
  onDelete
}: {
  collaborator: Collaborator;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const activePermissions = [
    collaborator.can_view_dashboard,
    collaborator.can_manage_checkout,
    collaborator.can_manage_products,
    collaborator.can_view_financeiro,
    collaborator.can_manage_financeiro,
    collaborator.can_view_transactions,
    collaborator.can_manage_integrations,
    collaborator.can_manage_settings,
  ].filter(Boolean).length;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-base md:text-lg font-semibold text-primary">
                {(collaborator.user_name || collaborator.user_email)[0].toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm md:text-base truncate">
                  {collaborator.user_name || 'Sem nome'}
                </h3>
                {collaborator.is_active ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Inativo</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mt-0.5">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{collaborator.user_email}</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{new Date(collaborator.invited_at).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Mobile: Permission count badge */}
              <div className="flex md:hidden mt-2">
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {activePermissions}/8 permissões
                </Badge>
              </div>

              {/* Desktop: Full permission badges */}
              <div className="hidden md:flex flex-wrap gap-1 mt-2">
                {Object.entries(permissionLabels).map(([key, { label }]) => {
                  const hasPermission = collaborator[key as keyof PermissionsForm];
                  return (
                    <Badge 
                      key={key} 
                      variant={hasPermission ? "default" : "outline"}
                      className={hasPermission 
                        ? "bg-primary/10 text-primary border-primary/20 text-xs" 
                        : "text-muted-foreground text-xs opacity-50"
                      }
                    >
                      {hasPermission ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0 md:w-auto md:px-3"
                  >
                    <Pencil className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Editar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="md:hidden">Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0 md:w-auto md:px-3 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Remover</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="md:hidden">Remover</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminColaboradores() {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAdminAuth();
  const { isOwner, loading: permissionsLoading } = usePermissions();
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [permissions, setPermissions] = useState<PermissionsForm>(defaultPermissions);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && !isOwner) {
      toast.error('Apenas o proprietário pode gerenciar colaboradores');
      navigate('/admin/dashboard');
    }
  }, [permissionsLoading, isOwner, navigate]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_collaborators');
      
      if (error) throw error;
      setCollaborators((data as Collaborator[]) || []);
    } catch (error: any) {
      console.error('Error loading collaborators:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isOwner) {
      loadCollaborators();
    }
  }, [user, isOwner]);

  const handleAddCollaborator = async () => {
    if (!email.trim()) {
      toast.error('Digite o email do colaborador');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.rpc('add_collaborator', {
        _collaborator_email: email.trim(),
        _permissions: JSON.parse(JSON.stringify(permissions))
      });

      if (error) throw error;

      toast.success('Colaborador adicionado com sucesso!');
      setIsAddDialogOpen(false);
      resetForm();
      loadCollaborators();
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      toast.error(error.message || 'Erro ao adicionar colaborador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCollaborator = async () => {
    if (!selectedCollaborator) return;

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase.rpc('update_collaborator_permissions', {
        _collaborator_id: selectedCollaborator.id,
        _permissions: JSON.parse(JSON.stringify(permissions))
      });

      if (error) throw error;

      toast.success('Permissões atualizadas com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
      loadCollaborators();
    } catch (error: any) {
      console.error('Error updating collaborator:', error);
      toast.error(error.message || 'Erro ao atualizar colaborador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollaborator = async () => {
    if (!selectedCollaborator) return;

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase.rpc('remove_collaborator', {
        _collaborator_id: selectedCollaborator.id
      });

      if (error) throw error;

      toast.success('Colaborador removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedCollaborator(null);
      loadCollaborators();
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast.error(error.message || 'Erro ao remover colaborador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setPermissions({
      can_view_dashboard: collaborator.can_view_dashboard,
      can_manage_checkout: collaborator.can_manage_checkout,
      can_manage_products: collaborator.can_manage_products,
      can_view_financeiro: collaborator.can_view_financeiro,
      can_manage_financeiro: collaborator.can_manage_financeiro,
      can_view_transactions: collaborator.can_view_transactions,
      can_manage_integrations: collaborator.can_manage_integrations,
      can_manage_settings: collaborator.can_manage_settings,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setEmail('');
    setNotes('');
    setPermissions(defaultPermissions);
    setSelectedCollaborator(null);
  };

  const filteredCollaborators = collaborators.filter(c => 
    c.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.user_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCollaboratorsCount = collaborators.filter(c => c.is_active).length;

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          userEmail={user?.email || ''} 
          userName={user?.user_metadata?.full_name || 'Usuário'}
          onLogout={signOut}
          isAdmin={isAdmin}
          isOwner={isOwner}
        />
        <SidebarInset className="flex-1">
          <AdminHeader title="Colaboradores" />
          
          <main className="flex-1 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">Colaboradores</h1>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {activeCollaboratorsCount} ativo{activeCollaboratorsCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gerencie sua equipe e permissões
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Colaborador
                  </Button>
                </div>

                {/* Search */}
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Collaborators List */}
              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <CollaboratorSkeleton key={i} />
                  ))}
                </div>
              ) : filteredCollaborators.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2 text-center">
                      {searchTerm ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador ainda'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center px-4">
                      {searchTerm 
                        ? 'Tente buscar por outro termo' 
                        : 'Adicione colaboradores para gerenciar sua equipe'
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Colaborador
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredCollaborators.map((collaborator) => (
                    <CollaboratorCard
                      key={collaborator.id}
                      collaborator={collaborator}
                      onEdit={() => openEditDialog(collaborator)}
                      onDelete={() => openDeleteDialog(collaborator)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Add Collaborator Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Plus className="h-5 w-5" />
              Adicionar Colaborador
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              O usuário precisa ter uma conta no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 md:py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email do colaborador</Label>
              <Input
                id="email"
                type="email"
                placeholder="colaborador@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <PermissionsGrid 
              permissions={permissions} 
              setPermissions={setPermissions}
              idPrefix="add-"
            />

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Responsável pelo setor de vendas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setIsAddDialogOpen(false); resetForm(); }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddCollaborator} 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collaborator Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Pencil className="h-5 w-5" />
              Editar Permissões
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm truncate">
              {selectedCollaborator?.user_name || selectedCollaborator?.user_email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 md:py-4">
            <PermissionsGrid 
              permissions={permissions} 
              setPermissions={setPermissions}
              idPrefix="edit-"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setIsEditDialogOpen(false); resetForm(); }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditCollaborator} 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Remover Colaborador</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Tem certeza que deseja remover <strong>{selectedCollaborator?.user_name || selectedCollaborator?.user_email}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCollaborator}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
