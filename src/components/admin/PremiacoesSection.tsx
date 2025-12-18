import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Package, Send, CheckCircle, MapPin, Clock } from "lucide-react";
import { compressImage, compressionPresets } from "@/lib/imageCompression";
interface Reward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  threshold_amount: number;
  delivery_method: string;
  is_active: boolean;
  created_at: string;
}
interface PendingRequest {
  id: string;
  user_id: string;
  user_email: string;
  reward_id: string;
  reward_name: string;
  reward_image_url: string | null;
  delivery_address: string | null;
  requested_at: string;
}
interface SentRequest {
  id: string;
  user_id: string;
  user_email: string;
  reward_id: string;
  reward_name: string;
  reward_image_url: string | null;
  delivery_address: string | null;
  tracking_code: string | null;
  requested_at: string;
  sent_at: string;
}
export function PremiacoesSection() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [trackingCode, setTrackingCode] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    threshold_amount: "",
    delivery_method: "address",
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRewards(), loadPendingRequests(), loadSentRequests()]);
    setLoading(false);
  };
  const loadRewards = async () => {
    const {
      data,
      error
    } = await supabase.from("rewards").select("*").order("threshold_amount", {
      ascending: true
    });
    if (!error && data) {
      setRewards(data);
    }
  };
  const loadPendingRequests = async () => {
    const {
      data,
      error
    } = await supabase.rpc("get_pending_reward_requests");
    if (!error && data) {
      setPendingRequests(data as PendingRequest[]);
    }
  };
  const loadSentRequests = async () => {
    const {
      data,
      error
    } = await supabase.rpc("get_sent_reward_requests");
    if (!error && data) {
      setSentRequests(data as SentRequest[]);
    }
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.product);
      const fileName = `${Date.now()}.webp`;
      const filePath = `rewards/${fileName}`;
      const {
        error
      } = await supabase.storage.from("rewards").upload(filePath, compressedBlob, {
        contentType: 'image/webp'
      });
      if (error) {
        console.error("Upload error:", error);
        return null;
      }
      const {
        data
      } = supabase.storage.from("rewards").getPublicUrl(filePath);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (err) {
      console.error("Compression/Upload error:", err);
      return null;
    }
  };
  const formatCurrencyInput = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const parseCurrencyInput = (formatted: string): number => {
    const numbers = formatted.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const openCreateDialog = () => {
    setEditingReward(null);
    setFormData({
      name: "",
      description: "",
      threshold_amount: "",
      delivery_method: "address",
      is_active: true
    });
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };
  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      threshold_amount: formatCurrencyInput(reward.threshold_amount),
      delivery_method: reward.delivery_method,
      is_active: reward.is_active
    });
    setImageFile(null);
    setImagePreview(reward.image_url);
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!formData.name || !formData.threshold_amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = editingReward?.image_url || null;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      const thresholdValue = parseCurrencyInput(formData.threshold_amount);
      
      const rewardData = {
        name: formData.name,
        description: formData.description || null,
        image_url: imageUrl,
        threshold_amount: thresholdValue,
        delivery_method: formData.delivery_method,
        is_active: formData.is_active
      };
      if (editingReward) {
        const {
          error
        } = await supabase.from("rewards").update(rewardData).eq("id", editingReward.id);
        if (error) throw error;
        toast.success("Premiação atualizada!");
      } else {
        const {
          error
        } = await supabase.from("rewards").insert(rewardData);
        if (error) throw error;
        toast.success("Premiação criada!");
      }
      setDialogOpen(false);
      loadRewards();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar premiação");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta premiação?")) return;
    const {
      error
    } = await supabase.from("rewards").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir premiação");
    } else {
      toast.success("Premiação excluída!");
      loadRewards();
    }
  };
  const handleMarkAsSent = async () => {
    if (!selectedRequest) return;
    const {
      error
    } = await supabase.rpc("mark_reward_sent", {
      p_request_id: selectedRequest.id,
      p_tracking_code: trackingCode || null
    });
    if (error) {
      toast.error("Erro ao marcar como enviado");
    } else {
      toast.success("Premiação marcada como enviada!");
      setSendDialogOpen(false);
      setSelectedRequest(null);
      setTrackingCode("");
      loadPendingRequests();
      loadSentRequests();
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  return <div className="max-w-5xl mx-auto space-y-6">
      <Tabs defaultValue="premiacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="premiacoes">Premiações</TabsTrigger>
          <TabsTrigger value="pendentes">
            Envio pendente
            {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>}
          </TabsTrigger>
          <TabsTrigger value="enviados">Enviados</TabsTrigger>
        </TabsList>

        {/* Tab: Premiações */}
        <TabsContent value="premiacoes" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Gerenciar Premiações</CardTitle>
                <CardDescription>Configure as premiações disponíveis para os usuários</CardDescription>
              </div>
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Adicionar premiação</span>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : rewards.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma premiação cadastrada</p>
                  <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira premiação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map(reward => (
                    <Card key={reward.id} className="overflow-hidden w-full">
                      <div className="h-48 sm:h-64 bg-muted flex items-center justify-center p-4">
                        {reward.image_url ? (
                          <img src={reward.image_url} alt={reward.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Package className="h-16 w-16 text-muted-foreground" />
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-black text-sm">{reward.name}</CardTitle>
                          <Badge variant={reward.is_active ? "default" : "secondary"} className={reward.is_active ? "bg-emerald-500" : ""}>
                            {reward.is_active ? "Disponível" : "Inativo"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-2">
                        {reward.description && <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Meta:</span>
                          <span className="text-primary font-bold">{formatCurrency(reward.threshold_amount)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{reward.delivery_method === "address" ? "Entrega por endereço" : "Entrega digital"}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(reward)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(reward.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Envio Pendente */}
        <TabsContent value="pendentes" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Solicitações Pendentes</h2>
          
          {pendingRequests.length === 0 ? <Card className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
            </Card> : <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Premiação</TableHead>
                      <TableHead className="hidden sm:table-cell">Endereço</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map(request => <TableRow key={request.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{request.user_email}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{request.reward_name}</TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[200px] truncate">{request.delivery_address || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(request.requested_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => {
                      setSelectedRequest(request);
                      setTrackingCode("");
                      setSendDialogOpen(true);
                    }}>
                            <Send className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Marcar enviado</span>
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </Card>}
        </TabsContent>

        {/* Tab: Enviados */}
        <TabsContent value="enviados" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Histórico de Envios</h2>
          
          {sentRequests.length === 0 ? <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum envio realizado</p>
            </Card> : <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Premiação</TableHead>
                      <TableHead className="hidden sm:table-cell">Código de Rastreio</TableHead>
                      <TableHead className="hidden md:table-cell">Enviado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentRequests.map(request => <TableRow key={request.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{request.user_email}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{request.reward_name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.tracking_code || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{request.sent_at ? formatDate(request.sent_at) : "-"}</TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </Card>}
        </TabsContent>
      </Tabs>

      {/* Dialog: Criar/Editar Premiação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Editar Premiação" : "Nova Premiação"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>Imagem da premiação</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => document.getElementById("reward-image-input")?.click()}>
                {imagePreview ? <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" /> : <div className="py-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  </div>}
              </div>
              <input id="reward-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder="Ex: Placa de 10k" />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description} onChange={e => setFormData({
              ...formData,
              description: e.target.value
            })} placeholder="Descrição da premiação..." rows={3} />
            </div>

            <div>
              <Label htmlFor="threshold">Valor de faturamento necessário (R$) *</Label>
              <Input 
                id="threshold" 
                type="text" 
                value={formData.threshold_amount} 
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const cents = parseInt(raw) || 0;
                  const formatted = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(cents / 100);
                  setFormData({
                    ...formData,
                    threshold_amount: formatted
                  });
                }} 
                placeholder="R$ 0,00" 
              />
            </div>

            <div>
              <Label htmlFor="delivery">Modo de entrega</Label>
              <Select value={formData.delivery_method} onValueChange={value => setFormData({
              ...formData,
              delivery_method: value
            })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="address">Entrega por endereço</SelectItem>
                  <SelectItem value="digital">Entrega digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar como Enviado */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Enviado</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm"><strong>Usuário:</strong> {selectedRequest.user_email}</p>
                <p className="text-sm"><strong>Premiação:</strong> {selectedRequest.reward_name}</p>
                {selectedRequest.delivery_address && <p className="text-sm"><strong>Endereço:</strong> {selectedRequest.delivery_address}</p>}
              </div>

              <div>
                <Label htmlFor="tracking">Código de rastreio (opcional)</Label>
                <Input id="tracking" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="Ex: BR123456789..." />
              </div>
            </div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleMarkAsSent}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}