import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, FileText, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  full_name: string | null;
  is_approved: boolean;
  available_balance?: number;
  total_paid?: number;
}

interface FeeConfig {
  id: string;
  name: string;
  pix_percentage: number;
  pix_fixed: number;
  is_default: boolean;
}

interface VerificationData {
  user_id: string;
  status: string;
  person_type: string;
}

const USERS_PER_PAGE = 10;

export const UsuariosSection = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userFeeConfigs, setUserFeeConfigs] = useState<Record<string, string>>({});
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [verificationsMap, setVerificationsMap] = useState<Record<string, VerificationData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState<string>("all");
  const [goToPage, setGoToPage] = useState("");

  useEffect(() => {
    loadUsers();
    loadFeeConfigs();
    loadVerifications();
  }, []);

  const loadFeeConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_configs')
        .select('id, name, pix_percentage, pix_fixed, is_default')
        .order('name');
      if (error) throw error;
      setFeeConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading fee configs:', error);
    }
  };

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('user_verification')
        .select('user_id, status, person_type');
      if (error) throw error;
      
      const map: Record<string, VerificationData> = {};
      (data || []).forEach(v => {
        map[v.user_id] = v;
      });
      setVerificationsMap(map);
    } catch (error: any) {
      console.error('Error loading verifications:', error);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_auth');
      if (error) throw error;

      // Load balances and total paid for all users in parallel
      const usersWithData = await Promise.all(
        (data || []).map(async (user: User) => {
          try {
            const [{ data: balanceData }, { data: totalPaidData }] = await Promise.all([
              supabase.rpc('get_user_available_balance_admin', { p_user_id: user.id }),
              supabase.rpc('get_user_total_paid', { p_user_id: user.id })
            ]);
            return { 
              ...user, 
              available_balance: balanceData || 0,
              total_paid: totalPaidData || 0
            };
          } catch {
            return { ...user, available_balance: 0, total_paid: 0 };
          }
        })
      );

      setUsers(usersWithData);

      const { data: feeConfigData, error: feeError } = await supabase
        .from('admin_settings')
        .select('user_id, value')
        .eq('key', 'user_fee_config');
      
      if (feeError) throw feeError;

      const feeConfigsMap: Record<string, string> = {};
      (feeConfigData || []).forEach((item) => {
        if (item.user_id) {
          feeConfigsMap[item.user_id] = item.value || '';
        }
      });
      setUserFeeConfigs(feeConfigsMap);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFeeConfigName = (userId: string) => {
    const feeConfigId = userFeeConfigs[userId];
    if (!feeConfigId) {
      const defaultConfig = feeConfigs.find(fc => fc.is_default);
      return defaultConfig ? defaultConfig.name : 'Padrão';
    }
    const config = feeConfigs.find(fc => fc.id === feeConfigId);
    return config ? config.name : 'Padrão';
  };

  const getDocStatus = (userId: string): string => {
    const v = verificationsMap[userId];
    if (!v) return 'none';
    return v.status;
  };

  const getDocBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px]">Aprovado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px]">Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px]">Rejeitado</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Sem docs</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Filter by search
    if (userSearch.trim()) {
      const search = userSearch.toLowerCase().trim();
      result = result.filter(u => 
        u.email.toLowerCase().includes(search) || 
        (u.full_name && u.full_name.toLowerCase().includes(search))
      );
    }

    // Filter by document status
    if (docStatusFilter !== 'all') {
      result = result.filter(u => getDocStatus(u.id) === docStatusFilter);
    }
    
    // Sort: current user first, then admins, then by creation date (newest)
    return [...result].sort((a, b) => {
      if (currentUser?.id === a.id) return -1;
      if (currentUser?.id === b.id) return 1;
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [users, userSearch, currentUser?.id, docStatusFilter, verificationsMap]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  const handleRowClick = (userId: string) => {
    navigate(`/admin/usuarios/${userId}`);
  };

  const handleGoToPage = () => {
    const page = parseInt(goToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setGoToPage("");
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {filteredUsers.length} de {users.length} usuário(s) • Clique em uma linha para ver detalhes
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={docStatusFilter} onValueChange={(v) => { setDocStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Status do Documento" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="none">Sem documentos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold text-center">Nome</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell text-center">Email</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Documento</TableHead>
                      <TableHead className="text-xs font-semibold hidden xl:table-cell">Total Faturado</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">Taxa</TableHead>
                      <TableHead className="text-xs font-semibold">Aprovação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => (
                        <TableRow 
                          key={u.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(u.id)}
                        >
                          <TableCell className="text-xs max-w-[200px]">
                            <div className="truncate font-medium">{u.full_name || '-'}</div>
                            <div className="text-muted-foreground text-[10px] md:hidden truncate">
                              {u.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden md:table-cell max-w-[150px]">
                            <span className="truncate block">{u.email}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {getDocBadge(getDocStatus(u.id))}
                          </TableCell>
                          <TableCell className="text-xs hidden xl:table-cell whitespace-nowrap">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              R$ {(u.total_paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs hidden sm:table-cell">
                            <span className="text-muted-foreground">{getFeeConfigName(u.id)}</span>
                          </TableCell>
                          <TableCell>
                          {u.is_blocked ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5">Bloqueado</Badge>
                            ) : u.is_admin ? (
                              <Badge className="bg-primary text-[10px] px-1.5">Administrador</Badge>
                            ) : u.is_approved ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px] px-1.5">Aprovado</Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5">Pendente</Badge>
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Exibindo {((currentPage - 1) * USERS_PER_PAGE) + 1}-{Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {getPageNumbers().map((page, idx) => (
                      typeof page === 'number' ? (
                        <Button
                          key={idx}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={idx} className="px-1 text-muted-foreground">...</span>
                      )
                    ))}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-xs text-muted-foreground">Ir para:</span>
                      <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={goToPage}
                        onChange={(e) => setGoToPage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                        className="h-8 w-14 text-xs text-center"
                        placeholder={String(currentPage)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
