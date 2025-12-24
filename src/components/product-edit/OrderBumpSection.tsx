import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Gift, GripVertical, Zap, Eye, Package, Upload, X, Image as ImageIcon, Pencil } from "lucide-react";
import { OrderBumpCard, OrderBump } from "@/components/checkout/OrderBumpCard";

interface OrderBumpData {
  id: string;
  product_id: string;
  user_id: string;
  bump_product_id: string;
  title: string;
  description: string | null;
  bump_price: number;
  is_active: boolean;
  position: number;
  image_url: string | null;
  created_at: string;
  bump_product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface OrderBumpSectionProps {
  productId: string;
  userId: string;
}

export function OrderBumpSection({ productId, userId }: OrderBumpSectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingBump, setEditingBump] = useState<OrderBumpData | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [newBump, setNewBump] = useState({
    bump_product_id: "",
    title: "🔥 Adicione também!",
    description: "",
    bump_price: 0,
    image_url: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    bump_price: 0,
    image_url: "",
  });
  const [previewBump, setPreviewBump] = useState<OrderBump | null>(null);

  // Fetch existing order bumps
  const { data: orderBumps, isLoading } = useQuery({
    queryKey: ["order-bumps", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_order_bumps")
        .select(`
          *,
          bump_product:products!bump_product_id(id, name, price, image_url)
        `)
        .eq("product_id", productId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as OrderBumpData[];
    },
  });

  // Fetch user's other products for selection
  const { data: availableProducts } = useQuery({
    queryKey: ["available-products-for-bump", userId, productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("user_id", userId)
        .neq("id", productId) // Exclude current product
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Update preview when form changes
  useEffect(() => {
    if (newBump.bump_product_id && availableProducts) {
      const selectedProduct = availableProducts.find(p => p.id === newBump.bump_product_id);
      if (selectedProduct) {
        setPreviewBump({
          id: "preview",
          title: newBump.title,
          description: newBump.description || null,
          bump_price: newBump.bump_price || selectedProduct.price,
          image_url: newBump.image_url || null,
          bump_product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            image_url: selectedProduct.image_url,
          },
        });
      }
    } else {
      setPreviewBump(null);
    }
  }, [newBump, availableProducts]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `order-bump-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("order-bumps")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("order-bumps")
        .getPublicUrl(filePath);

      setNewBump(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setNewBump(prev => ({ ...prev, image_url: "" }));
  };

  // Handle edit image upload
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `order-bump-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("order-bumps")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("order-bumps")
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeEditImage = () => {
    setEditForm(prev => ({ ...prev, image_url: "" }));
  };

  const startEditing = (bump: OrderBumpData) => {
    setEditingBump(bump);
    setEditForm({
      title: bump.title,
      description: bump.description || "",
      bump_price: bump.bump_price,
      image_url: bump.image_url || "",
    });
  };

  const cancelEditing = () => {
    setEditingBump(null);
    setEditForm({
      title: "",
      description: "",
      bump_price: 0,
      image_url: "",
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newBump) => {
      const maxPosition = orderBumps?.reduce((max, b) => Math.max(max, b.position), -1) ?? -1;
      
      const { error } = await supabase
        .from("product_order_bumps")
        .insert({
          product_id: productId,
          user_id: userId,
          bump_product_id: data.bump_product_id,
          title: data.title,
          description: data.description || null,
          bump_price: data.bump_price,
          image_url: data.image_url || null,
          position: maxPosition + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
      setIsAdding(false);
      setNewBump({
        bump_product_id: "",
        title: "🔥 Adicione também!",
        description: "",
        bump_price: 0,
        image_url: "",
      });
    },
    onError: () => {
      toast.error("Erro ao criar Order Bump");
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump removido");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
    },
    onError: () => {
      toast.error("Erro ao remover Order Bump");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .update({
          title: data.title,
          description: data.description || null,
          bump_price: data.bump_price,
          image_url: data.image_url || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
      cancelEditing();
    },
    onError: () => {
      toast.error("Erro ao atualizar Order Bump");
    },
  });

  const handleUpdate = () => {
    if (!editingBump) return;
    if (!editForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (editForm.bump_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    updateMutation.mutate({ id: editingBump.id, data: editForm });
  };

  const handleProductSelect = (productId: string) => {
    const product = availableProducts?.find(p => p.id === productId);
    setNewBump(prev => ({
      ...prev,
      bump_product_id: productId,
      bump_price: product?.price || 0,
    }));
  };

  const handleCreate = () => {
    if (!newBump.bump_product_id) {
      toast.error("Selecione um produto para o Order Bump");
      return;
    }
    if (!newBump.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (newBump.bump_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    createMutation.mutate(newBump);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Gift className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Order Bump</CardTitle>
                <CardDescription>
                  Ofereça produtos complementares durante o checkout para aumentar o ticket médio
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Order Bump
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add New Form */}
      {isAdding && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Criar novo Order Bump
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto para oferecer *</Label>
                  <Select
                    value={newBump.bump_product_id}
                    onValueChange={handleProductSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            {product.image_url && (
                              <img src={product.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                            )}
                            <span>{product.name}</span>
                            <span className="text-muted-foreground">
                              ({formatPrice(product.price)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!availableProducts || availableProducts.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      Você precisa ter outros produtos cadastrados para criar um Order Bump
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Título chamativo *</Label>
                  <Input
                    value={newBump.title}
                    onChange={(e) => setNewBump(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: 🔥 Adicione também!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={newBump.description}
                    onChange={(e) => setNewBump(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Complemento perfeito para seu pedido com 30% OFF!"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço do Order Bump *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newBump.bump_price}
                    onChange={(e) => setNewBump(prev => ({ ...prev, bump_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pode ser diferente do preço original do produto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Imagem do Order Bump (opcional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {newBump.image_url ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={newBump.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full h-24 flex flex-col gap-2 border-dashed"
                    >
                      {uploadingImage ? (
                        <span>Enviando...</span>
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Clique para enviar imagem
                          </span>
                        </>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se não enviar, usará a imagem do produto
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Order Bump"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Preview Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Preview no checkout
                </div>
                
                {previewBump ? (
                  <OrderBumpCard
                    bump={previewBump}
                    isSelected={false}
                    onToggle={() => {}}
                    formatPrice={formatPrice}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Selecione um produto para ver o preview</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Order Bumps List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : orderBumps && orderBumps.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Bumps configurados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderBumps.map((bump) => (
              <div key={bump.id}>
                {editingBump?.id === bump.id ? (
                  /* Edit Form */
                  <div className="p-4 rounded-lg border-2 border-orange-300 bg-orange-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-orange-500" />
                        Editando Order Bump
                      </h4>
                      <Badge variant="outline">{bump.bump_product?.name}</Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Título chamativo *</Label>
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: 🔥 Adicione também!"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Descrição (opcional)</Label>
                          <Textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ex: Complemento perfeito para seu pedido!"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Preço do Order Bump *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editForm.bump_price}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bump_price: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Imagem do Order Bump</Label>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            className="hidden"
                          />
                          
                          {editForm.image_url ? (
                            <div className="relative w-24 h-24">
                              <img
                                src={editForm.image_url}
                                alt="Preview"
                                className="w-full h-full object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={removeEditImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => editFileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="w-full h-20 flex flex-col gap-1 border-dashed"
                            >
                              {uploadingImage ? (
                                <span>Enviando...</span>
                              ) : (
                                <>
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Enviar imagem
                                  </span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display Item */
                  <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    
                    {(bump.image_url || bump.bump_product?.image_url) && (
                      <img
                        src={bump.image_url || bump.bump_product?.image_url || ""}
                        alt={bump.bump_product?.name || "Order Bump"}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{bump.title}</h4>
                        <Badge variant={bump.is_active ? "default" : "secondary"}>
                          {bump.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {bump.bump_product?.name} • {formatPrice(bump.bump_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${bump.id}`} className="text-sm">
                          Ativo
                        </Label>
                        <Switch
                          id={`active-${bump.id}`}
                          checked={bump.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: bump.id, is_active: checked })
                          }
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(bump)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(bump.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !isAdding ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum Order Bump configurado</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Order Bumps aparecem no checkout e permitem que clientes adicionem 
              produtos complementares com um clique, aumentando seu ticket médio.
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro Order Bump
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
