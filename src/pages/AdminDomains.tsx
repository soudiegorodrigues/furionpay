import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Globe, Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Domain {
  id: string;
  domain: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminDomains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainName, setNewDomainName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState("");
  const [editName, setEditName] = useState("");
  
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, isBlocked } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      checkAdminRole();
      loadDomains();
    }
  }, [isAuthenticated, loading, navigate]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      if (error) throw error;
      setIsAdmin(data === true);
      if (!data) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem acessar esta página",
          variant: "destructive"
        });
        navigate('/admin/settings');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      navigate('/admin/settings');
    }
  };

  const loadDomains = async () => {
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
      setIsLoading(false);
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
          name: newDomainName.trim() || null,
          created_by: user?.id
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="Domínios" icon={Globe}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Domínios Disponíveis</h1>
            <p className="text-sm text-muted-foreground">Gerenciar domínios para os usuários</p>
          </div>
        </div>

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
            <CardTitle>Domínios Cadastrados</CardTitle>
            <CardDescription>
              {domains.length} domínio(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domains.length === 0 ? (
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
    </AdminLayout>
  );
};

export default AdminDomains;
