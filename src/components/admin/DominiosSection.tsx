import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Globe, Plus, Loader2, Pencil, Trash2, Check, X, ShoppingCart } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  
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

  const popupDomains = domains.filter(d => d.domain_type === "popup");
  const checkoutDomains = domains.filter(d => d.domain_type === "checkout");

  const renderDomainList = (filteredDomains: Domain[], title: string, icon: React.ReactNode) => {
    if (filteredDomains.length === 0) {
      return (
        <Card className="max-w-md">
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              Nenhum domínio cadastrado
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((cardIndex) => {
          const startIndex = cardIndex * 5;
          const cardDomains = filteredDomains.slice(startIndex, startIndex + 5);
          if (cardDomains.length === 0) return null;
          
          return (
            <Card key={cardIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {icon}
                  Domínios {cardIndex === 0 ? '1-5' : '6-10'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {cardDomains.length} domínio(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {cardDomains.map((domain) => (
                    <div 
                      key={domain.id} 
                      className={`p-3 rounded-lg border ${
                        domain.is_active ? 'bg-card' : 'bg-muted/50'
                      }`}
                    >
                      {editingId === domain.id ? (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Domínio</Label>
                              <Input
                                value={editDomain}
                                onChange={(e) => setEditDomain(e.target.value)}
                                placeholder="exemplo.com.br"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Nome (opcional)</Label>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nome amigável"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(domain.id)}>
                              <Check className="w-3 h-3 mr-1" />
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditing}>
                              <X className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              domain.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{domain.domain}</p>
                              {domain.name && (
                                <p className="text-xs text-muted-foreground truncate">{domain.name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditing(domain)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Switch
                              checked={domain.is_active}
                              onCheckedChange={() => toggleDomainStatus(domain.id, domain.is_active)}
                              className="scale-75"
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* POPUP DOMAINS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Domínios para Popup</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Domínios usados nas páginas de doação e popup
        </p>

        {/* Add Popup Domain */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" />
              Adicionar Domínio para Popup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="popup-domain">Domínio</Label>
                <Input
                  id="popup-domain"
                  placeholder="exemplo.com.br"
                  value={newPopupDomain}
                  onChange={(e) => setNewPopupDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popup-name">Nome (opcional)</Label>
                <Input
                  id="popup-name"
                  placeholder="Nome amigável"
                  value={newPopupDomainName}
                  onChange={(e) => setNewPopupDomainName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => addDomain("popup")} disabled={isAddingPopup}>
              {isAddingPopup ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar Domínio
            </Button>
          </CardContent>
        </Card>

        {/* Popup Domains List */}
        {renderDomainList(popupDomains, "Popup", <Globe className="h-4 w-4 text-primary" />)}
      </div>

      {/* CHECKOUT DOMAINS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Domínios para Produtos e Checkout</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Domínios usados nas páginas de checkout de produtos
        </p>

        {/* Add Checkout Domain */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" />
              Adicionar Domínio para Checkout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout-domain">Domínio</Label>
                <Input
                  id="checkout-domain"
                  placeholder="exemplo.com.br"
                  value={newCheckoutDomain}
                  onChange={(e) => setNewCheckoutDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-name">Nome (opcional)</Label>
                <Input
                  id="checkout-name"
                  placeholder="Nome amigável"
                  value={newCheckoutDomainName}
                  onChange={(e) => setNewCheckoutDomainName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => addDomain("checkout")} disabled={isAddingCheckout}>
              {isAddingCheckout ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar Domínio
            </Button>
          </CardContent>
        </Card>

        {/* Checkout Domains List */}
        {renderDomainList(checkoutDomains, "Checkout", <ShoppingCart className="h-4 w-4 text-primary" />)}
      </div>
    </div>
  );
};