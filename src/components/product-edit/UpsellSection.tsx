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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Eye, Upload, X, Pencil, Clock, MousePointer } from "lucide-react";

interface UpsellData {
  id: string;
  product_id: string;
  user_id: string;
  upsell_product_id: string;
  title: string;
  description: string | null;
  headline: string | null;
  upsell_price: number;
  original_price: number | null;
  timer_seconds: number;
  button_text: string;
  decline_text: string;
  image_url: string | null;
  video_url: string | null;
  background_color: string;
  button_color: string;
  is_active: boolean;
  position: number;
  created_at: string;
  upsell_product?: {
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

interface UpsellSectionProps {
  productId: string;
  userId: string;
}

export function UpsellSection({ productId, userId }: UpsellSectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<UpsellData | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [newUpsell, setNewUpsell] = useState({
    upsell_product_id: "",
    title: "🔥 Oferta Especial!",
    description: "",
    headline: "Espera! Temos uma oferta exclusiva para você",
    upsell_price: 0,
    original_price: 0,
    timer_seconds: 300,
    button_text: "SIM! Quero aproveitar",
    decline_text: "Não, obrigado",
    image_url: "",
    video_url: "",
    background_color: "#ffffff",
    button_color: "#22c55e",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    headline: "",
    upsell_price: 0,
    original_price: 0,
    timer_seconds: 300,
    button_text: "",
    decline_text: "",
    image_url: "",
    video_url: "",
    background_color: "#ffffff",
    button_color: "#22c55e",
  });

  // Fetch existing upsells
  const { data: upsells, isLoading } = useQuery({
    queryKey: ["product-upsells", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_upsells")
        .select(`
          *,
          upsell_product:products!upsell_product_id(id, name, price, image_url)
        `)
        .eq("product_id", productId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as UpsellData[];
    },
  });

  // Fetch user's other products for selection
  const { data: availableProducts } = useQuery({
    queryKey: ["available-products-for-upsell", userId, productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("user_id", userId)
        .neq("id", productId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
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
      const fileName = `upsell-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("order-bumps")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("order-bumps")
        .getPublicUrl(filePath);

      if (isEdit) {
        setEditForm(prev => ({ ...prev, image_url: publicUrl }));
      } else {
        setNewUpsell(prev => ({ ...prev, image_url: publicUrl }));
      }
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProductSelect = (selectedProductId: string) => {
    const product = availableProducts?.find(p => p.id === selectedProductId);
    setNewUpsell(prev => ({
      ...prev,
      upsell_product_id: selectedProductId,
      upsell_price: product?.price || 0,
      original_price: product?.price || 0,
    }));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newUpsell) => {
      const maxPosition = upsells?.reduce((max, u) => Math.max(max, u.position), -1) ?? -1;
      
      const { error } = await supabase
        .from("product_upsells")
        .insert({
          product_id: productId,
          user_id: userId,
          upsell_product_id: data.upsell_product_id,
          title: data.title,
          description: data.description || null,
          headline: data.headline || null,
          upsell_price: data.upsell_price,
          original_price: data.original_price || null,
          timer_seconds: data.timer_seconds,
          button_text: data.button_text,
          decline_text: data.decline_text,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          background_color: data.background_color,
          button_color: data.button_color,
          position: maxPosition + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Upsell criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["product-upsells", productId] });
      setIsAdding(false);
      setNewUpsell({
        upsell_product_id: "",
        title: "🔥 Oferta Especial!",
        description: "",
        headline: "Espera! Temos uma oferta exclusiva para você",
        upsell_price: 0,
        original_price: 0,
        timer_seconds: 300,
        button_text: "SIM! Quero aproveitar",
        decline_text: "Não, obrigado",
        image_url: "",
        video_url: "",
        background_color: "#ffffff",
        button_color: "#22c55e",
      });
    },
    onError: (error) => {
      console.error("Error creating upsell:", error);
      toast.error("Erro ao criar Upsell");
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_upsells")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-upsells", productId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_upsells")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Upsell removido");
      queryClient.invalidateQueries({ queryKey: ["product-upsells", productId] });
    },
    onError: () => {
      toast.error("Erro ao remover Upsell");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      const { error } = await supabase
        .from("product_upsells")
        .update({
          title: data.title,
          description: data.description || null,
          headline: data.headline || null,
          upsell_price: data.upsell_price,
          original_price: data.original_price || null,
          timer_seconds: data.timer_seconds,
          button_text: data.button_text,
          decline_text: data.decline_text,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          background_color: data.background_color,
          button_color: data.button_color,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Upsell atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["product-upsells", productId] });
      setEditingUpsell(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar Upsell");
    },
  });

  const startEditing = (upsell: UpsellData) => {
    setEditingUpsell(upsell);
    setEditForm({
      title: upsell.title,
      description: upsell.description || "",
      headline: upsell.headline || "",
      upsell_price: upsell.upsell_price,
      original_price: upsell.original_price || 0,
      timer_seconds: upsell.timer_seconds,
      button_text: upsell.button_text,
      decline_text: upsell.decline_text,
      image_url: upsell.image_url || "",
      video_url: upsell.video_url || "",
      background_color: upsell.background_color,
      button_color: upsell.button_color,
    });
  };

  const handleCreate = () => {
    if (!newUpsell.upsell_product_id) {
      toast.error("Selecione um produto para o Upsell");
      return;
    }
    if (!newUpsell.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (newUpsell.upsell_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    createMutation.mutate(newUpsell);
  };

  const handleUpdate = () => {
    if (!editingUpsell) return;
    if (!editForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (editForm.upsell_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    updateMutation.mutate({ id: editingUpsell.id, data: editForm });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Upsell de 1 Clique</CardTitle>
                <CardDescription>
                  Ofereça produtos adicionais após a compra para aumentar a receita
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Upsell
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add New Form */}
      {isAdding && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Criar novo Upsell
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto para oferecer *</Label>
                  <Select
                    value={newUpsell.upsell_product_id}
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
                      ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Headline da página</Label>
                  <Input
                    value={newUpsell.headline}
                    onChange={(e) => setNewUpsell(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="Ex: Espera! Temos uma oferta exclusiva para você"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Título da oferta *</Label>
                  <Input
                    value={newUpsell.title}
                    onChange={(e) => setNewUpsell(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: 🔥 Oferta Especial!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newUpsell.description}
                    onChange={(e) => setNewUpsell(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva os benefícios do produto..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço original (riscado)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newUpsell.original_price}
                      onChange={(e) => setNewUpsell(prev => ({ ...prev, original_price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço do Upsell *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newUpsell.upsell_price}
                      onChange={(e) => setNewUpsell(prev => ({ ...prev, upsell_price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Timer countdown (segundos)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="60"
                      max="3600"
                      value={newUpsell.timer_seconds}
                      onChange={(e) => setNewUpsell(prev => ({ ...prev, timer_seconds: parseInt(e.target.value) || 300 }))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ({formatTime(newUpsell.timer_seconds)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do botão aceitar</Label>
                    <Input
                      value={newUpsell.button_text}
                      onChange={(e) => setNewUpsell(prev => ({ ...prev, button_text: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do botão recusar</Label>
                    <Input
                      value={newUpsell.decline_text}
                      onChange={(e) => setNewUpsell(prev => ({ ...prev, decline_text: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor do fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newUpsell.background_color}
                        onChange={(e) => setNewUpsell(prev => ({ ...prev, background_color: e.target.value }))}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={newUpsell.background_color}
                        onChange={(e) => setNewUpsell(prev => ({ ...prev, background_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do botão</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newUpsell.button_color}
                        onChange={(e) => setNewUpsell(prev => ({ ...prev, button_color: e.target.value }))}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={newUpsell.button_color}
                        onChange={(e) => setNewUpsell(prev => ({ ...prev, button_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Imagem do produto (opcional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="hidden"
                  />
                  
                  {newUpsell.image_url ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={newUpsell.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setNewUpsell(prev => ({ ...prev, image_url: "" }))}
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
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingImage ? "Enviando..." : "Enviar imagem"}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>URL do vídeo (opcional)</Label>
                  <Input
                    value={newUpsell.video_url}
                    onChange={(e) => setNewUpsell(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>

              {/* Preview Column */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview da página de Upsell
                </Label>
                <div 
                  className="rounded-lg border p-4 min-h-[400px]"
                  style={{ backgroundColor: newUpsell.background_color }}
                >
                  <div className="text-center space-y-4">
                    {/* Timer */}
                    <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Oferta expira em {formatTime(newUpsell.timer_seconds)}
                    </div>
                    
                    {/* Headline */}
                    <h2 className="text-lg font-bold text-gray-800">
                      {newUpsell.headline || "Espera! Temos uma oferta exclusiva para você"}
                    </h2>
                    
                    {/* Product Image */}
                    {newUpsell.image_url && (
                      <img 
                        src={newUpsell.image_url} 
                        alt="Produto" 
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                    )}
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold">
                      {newUpsell.title || "🔥 Oferta Especial!"}
                    </h3>
                    
                    {/* Description */}
                    {newUpsell.description && (
                      <p className="text-gray-600 text-sm">
                        {newUpsell.description}
                      </p>
                    )}
                    
                    {/* Price */}
                    <div className="space-y-1">
                      {newUpsell.original_price > 0 && newUpsell.original_price !== newUpsell.upsell_price && (
                        <p className="text-gray-400 line-through text-sm">
                          De {formatPrice(newUpsell.original_price)}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-green-600">
                        Por apenas {formatPrice(newUpsell.upsell_price)}
                      </p>
                    </div>
                    
                    {/* Buttons */}
                    <div className="space-y-2 pt-4">
                      <Button 
                        className="w-full text-white font-bold py-3"
                        style={{ backgroundColor: newUpsell.button_color }}
                      >
                        {newUpsell.button_text || "SIM! Quero aproveitar"}
                      </Button>
                      <button className="text-gray-500 text-sm underline">
                        {newUpsell.decline_text || "Não, obrigado"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Upsell"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Upsells List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ) : upsells && upsells.length > 0 ? (
        <div className="space-y-4">
          {upsells.map((upsell) => (
            <Card key={upsell.id} className={!upsell.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                {editingUpsell?.id === upsell.id ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Headline</Label>
                        <Input
                          value={editForm.headline}
                          onChange={(e) => setEditForm(prev => ({ ...prev, headline: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Preço original</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.original_price}
                          onChange={(e) => setEditForm(prev => ({ ...prev, original_price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço do Upsell *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.upsell_price}
                          onChange={(e) => setEditForm(prev => ({ ...prev, upsell_price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Timer (segundos)</Label>
                        <Input
                          type="number"
                          value={editForm.timer_seconds}
                          onChange={(e) => setEditForm(prev => ({ ...prev, timer_seconds: parseInt(e.target.value) || 300 }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Texto botão aceitar</Label>
                        <Input
                          value={editForm.button_text}
                          onChange={(e) => setEditForm(prev => ({ ...prev, button_text: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Texto botão recusar</Label>
                        <Input
                          value={editForm.decline_text}
                          onChange={(e) => setEditForm(prev => ({ ...prev, decline_text: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingUpsell(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display Card
                  <div className="flex items-center gap-4">
                    {upsell.image_url || upsell.upsell_product?.image_url ? (
                      <img
                        src={upsell.image_url || upsell.upsell_product?.image_url || ""}
                        alt={upsell.upsell_product?.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{upsell.title}</h4>
                        {upsell.is_active && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {upsell.upsell_product?.name} • {formatPrice(upsell.upsell_price)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Timer: {formatTime(upsell.timer_seconds)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={upsell.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: upsell.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => startEditing(upsell)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(upsell.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <MousePointer className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium mb-1">Nenhum Upsell configurado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie ofertas de upsell que aparecem após a compra para aumentar sua receita
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro Upsell
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
