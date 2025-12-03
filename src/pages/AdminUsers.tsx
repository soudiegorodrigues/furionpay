import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Shield, ShieldOff, Users, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const USERS_PER_PAGE = 10;

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkAdminAndLoadUsers();
    }
  }, [isAuthenticated, user]);

  const checkAdminAndLoadUsers = async () => {
    try {
      setLoading(true);
      // Check if current user is admin
      const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', { 
        _user_id: user?.id, 
        _role: 'admin' 
      });
      
      if (roleError) throw roleError;
      
      if (!hasAdminRole) {
        setIsAdmin(false);
        toast({
          title: 'Acesso Negado',
          description: 'Você não tem permissão para acessar esta página',
          variant: 'destructive'
        });
        navigate('/admin/dashboard');
        return;
      }
      
      setIsAdmin(true);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao verificar permissões',
        variant: 'destructive'
      });
      navigate('/admin/dashboard');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users_auth');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('grant_admin_role', { target_user_id: userId });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Permissão de admin concedida'
      });
      
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao conceder permissão',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('revoke_admin_role', { target_user_id: userId });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Permissão de admin revogada'
      });
      
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao revogar permissão',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Gerenciar Usuários</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Cadastrados ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{formatDate(u.created_at)}</TableCell>
                        <TableCell>{formatDate(u.last_sign_in_at)}</TableCell>
                        <TableCell>
                          {u.is_admin ? (
                            <Badge className="bg-primary">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">Usuário</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.id === user?.id ? (
                            <span className="text-sm text-muted-foreground">Você</span>
                          ) : u.is_admin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeAdmin(u.id)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-1" />
                                  Revogar
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleGrantAdmin(u.id)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-1" />
                                  Tornar Admin
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * USERS_PER_PAGE) + 1} - {Math.min(currentPage * USERS_PER_PAGE, users.length)} de {users.length}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
