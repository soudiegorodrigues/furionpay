import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Plus, Loader2, Check, X, ShoppingCart, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Domain {
  id: string;
  domain: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  domain_type: "popup" | "checkout";
}

type DomainType = "popup" | "checkout";

export const DominiosSection = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Popup domain form
  const [newPopupDomain, setNewPopupDomain] = useState("");
  const [newPopupDomainName, setNewPopupDomainName] = useState("");
  const [isAddingPopup, setIsAddingPopup] = useState(false);

  // Checkout domain form
  const [newCheckoutDomain, setNewCheckoutDomain] = useState("");
  const [newCheckoutDomainName, setNewCheckoutDomainName] = useState("");
  const [isAddingCheckout, setIsAddingCheckout] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState("");
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('available_domains')
        .select('*')
        .order('domain');
      if (error) throw error;
      setDomains((data || []) as Domain[]);
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

  const addDomain = async (domainType: DomainType) => {
    const domain = domainType === "popup" ? newPopupDomain : newCheckoutDomain;
    const name = domainType === "popup" ? newPopupDomainName : newCheckoutDomainName;
    const setIsAdding = domainType === "popup" ? setIsAddingPopup : setIsAddingCheckout;
    const clearForm = () => {
      if (domainType === "popup") {
        setNewPopupDomain("");
        setNewPopupDomainName("");
      } else {
        setNewCheckoutDomain("");
        setNewCheckoutDomainName("");
      }
    };

    if (!domain.trim()) {
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
          domain: domain.trim().toLowerCase(),
          name: name.trim() || null,
          domain_type: domainType
        });

      if (error) {
        if (error.code === '23505') {
          const tipoLabel = domainType === 'popup' ? 'Popup' : 'Checkout';
          toast({
            title: "Erro",
            description: `Este domínio já existe para ${tipoLabel}`,
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
        clearForm();
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
            description: "Este domínio já existe para este tipo",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        setDomains(domains.map(d => d.id === id ? {
          ...d,
          domain: editDomain.trim().toLowerCase(),
          name: editName.trim() || null
        } : d));
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

  const deleteDomain = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('available_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDomains(domains.filter(d => d.id !== id));
      toast({
        title: "Sucesso",
        description: "Domínio excluído com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir domínio",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const popupDomains = domains.filter(d => d.domain_type === "popup");
  const checkoutDomains = domains.filter(d => d.domain_type === "checkout");

  const renderDomainList = (filteredDomains: Domain[]) => {
    if (filteredDomains.length === 0) {
      return (
        <p className="text-muted-foreground text-center text-sm py-4">
          Nenhum domínio cadastrado
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {filteredDomains.map(domain => (
          <div
            key={domain.id}
            className={`p-3 rounded-lg border ${domain.is_active ? 'bg-card' : 'bg-muted/50'}`}
          >
            {editingId === domain.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Domínio</Label>
                    <Input
                      value={editDomain}
                      onChange={e => setEditDomain(e.target.value)}
                      placeholder="exemplo.com.br"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome (opcional)</Label>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nome amigável"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs" onClick={() => saveEdit(domain.id)}>
                    <Check className="w-3 h-3 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={cancelEditing}>
                    <X className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${domain.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{domain.domain}</p>
                    {domain.name && <p className="text-xs text-muted-foreground truncate">{domain.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => startEditing(domain)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteDomain(domain.id)}
                    disabled={deletingId === domain.id}
                  >
                    {deletingId === domain.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="w-full">
          <CardHeader className="pb-4">
            <Skeleton className="h-7 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Skeleton Popup Section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-36" />
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>

            <div className="border-t" />

            {/* Skeleton Checkout Section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-56" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-36" />
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Gerenciamento de Domínios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção Popup */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Domínios para Popup
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="popup-domain" className="text-sm">Domínio</Label>
                <Input
                  id="popup-domain"
                  placeholder="exemplo.com.br"
                  value={newPopupDomain}
                  onChange={e => setNewPopupDomain(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="popup-name" className="text-sm">Nome (opcional)</Label>
                <Input
                  id="popup-name"
                  placeholder="Nome amigável"
                  value={newPopupDomainName}
                  onChange={e => setNewPopupDomainName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <Button onClick={() => addDomain("popup")} disabled={isAddingPopup} size="sm">
              {isAddingPopup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar Domínio
            </Button>
            {renderDomainList(popupDomains)}
          </div>

          {/* Separador */}
          <div className="border-t" />

          {/* Seção Checkout */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5" />
              Domínios para Produtos e Checkout
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="checkout-domain" className="text-sm">Domínio</Label>
                <Input
                  id="checkout-domain"
                  placeholder="exemplo.com.br"
                  value={newCheckoutDomain}
                  onChange={e => setNewCheckoutDomain(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkout-name" className="text-sm">Nome (opcional)</Label>
                <Input
                  id="checkout-name"
                  placeholder="Nome amigável"
                  value={newCheckoutDomainName}
                  onChange={e => setNewCheckoutDomainName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <Button onClick={() => addDomain("checkout")} disabled={isAddingCheckout} size="sm">
              {isAddingCheckout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar Domínio
            </Button>
            {renderDomainList(checkoutDomains)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
