import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tag, Plus, Copy, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateProductName } from "@/lib/blockedKeywords";

interface ProductOffer {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  price: number;
  type: string;
  domain: string | null;
  offer_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

interface OffersSectionProps {
  productId: string;
  userId: string;
}

export function OffersSection({ productId, userId }: OffersSectionProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ProductOffer | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    type: "checkout",
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["product-offers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ProductOffer[];
    },
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["available-domains-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_domains")
        .select("*")
        .eq("is_active", true)
        .eq("domain_type", "checkout");
      
      if (error) throw error;
      return data as AvailableDomain[];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain);
    }
  }, [domains, selectedDomain]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("product_offers")
        .insert({
          product_id: productId,
          user_id: userId,
          name: data.name,
          price: data.price,
          type: data.type,
          domain: selectedDomain,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
      setIsCreating(false);
      setFormData({ name: "", price: 0, type: "checkout" });
    },
    onError: () => {
      toast.error("Erro ao criar oferta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({
          name: data.name,
          price: data.price,
          type: data.type,
          domain: selectedDomain,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
      setEditingOffer(null);
      setFormData({ name: "", price: 0, type: "checkout" });
    },
    onError: () => {
      toast.error("Erro ao atualizar oferta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
    },
    onError: () => {
      toast.error("Erro ao excluir oferta");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-offers", productId] });
    },
  });

  const generateLink = (offer: ProductOffer) => {
    const baseDomain = offer.domain 
      ? `https://${offer.domain}` 
      : window.location.origin;
    return `${baseDomain}/${offer.offer_code}`;
  };

  const copyLink = (offer: ProductOffer) => {
    navigator.clipboard.writeText(generateLink(offer));
    toast.success("Link copiado!");
  };

  const validateDomain = (domain: string): boolean => {
    const validDomains = domains.map(d => d.domain);
    if (!validDomains.includes(domain)) {
      toast.error("Domínio inválido. Selecione um domínio da lista.");
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Nome da oferta é obrigatório");
      return;
    }
    
    // Validar palavras bloqueadas
    const validation = validateProductName(formData.name);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    if (!validateDomain(selectedDomain)) return;
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingOffer) return;
    if (!formData.name.trim()) {
      toast.error("Nome da oferta é obrigatório");
      return;
    }
    
    // Validar palavras bloqueadas
    const validation = validateProductName(formData.name);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    if (!validateDomain(selectedDomain)) return;
    updateMutation.mutate({ id: editingOffer.id, data: formData });
  };

  const startEditing = (offer: ProductOffer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      price: offer.price,
      type: offer.type,
    });
    setSelectedDomain(offer.domain || domains[0]?.domain || "");
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingOffer(null);
    setIsCreating(false);
    setFormData({ name: "", price: 0, type: "checkout" });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatCurrencyInput = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const parseCurrencyInput = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers || '0') / 100;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-primary">Ofertas</CardTitle>
            <CardDescription>Gerencie links e ofertas do seu produto</CardDescription>
          </div>
          <Button 
            onClick={() => { setIsCreating(true); setEditingOffer(null); }}
            className="gap-2"
            disabled={isCreating || !!editingOffer}
          >
            <Plus className="h-4 w-4" />
            Nova Oferta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domínio</Label>
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum domínio de checkout configurado. Configure em Admin → Domínios.
              </p>
            ) : (
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full md:w-72 h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.domain}>
                    {domain.domain}
                  </option>
                ))}
              </select>
            )}
          </div>

          {(isCreating || editingOffer) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-medium">
                  {editingOffer ? "Editar Oferta" : "Nova Oferta"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da oferta</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome da oferta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="text"
                      value={formatCurrencyInput(formData.price)}
                      onChange={(e) => setFormData({ ...formData, price: parseCurrencyInput(e.target.value) })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="checkout">Checkout</option>
                      <option value="upsell">Upsell</option>
                      <option value="downsell">Downsell</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editingOffer ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? "Salvando..." 
                      : editingOffer ? "Atualizar" : "Criar Oferta"
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {offersLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando ofertas...
            </div>
          ) : offers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma oferta cadastrada</p>
              <p className="text-sm">Clique em "Nova Oferta" para criar sua primeira oferta</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Nome</th>
                    <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Link</th>
                    <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium">Preço</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-medium text-sm">{offer.name}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {generateLink(offer)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyLink(offer)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge variant="outline" className="capitalize">
                          {offer.type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{formatPrice(offer.price)}</span>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={offer.is_active ? "default" : "secondary"}
                          className={cn(
                            "cursor-pointer",
                            offer.is_active ? "bg-green-500 hover:bg-green-600" : ""
                          )}
                          onClick={() => toggleStatusMutation.mutate({ 
                            id: offer.id, 
                            is_active: !offer.is_active 
                          })}
                        >
                          {offer.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 md:hidden"
                            onClick={() => copyLink(offer)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => startEditing(offer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(offer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
