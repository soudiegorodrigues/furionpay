import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Plus, Trash2, Loader2, ArrowLeft, Pencil, Check, X, Eye, Copy, ToggleLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatBlock {
  id: string;
  flow_id: string;
  block_order: number;
  message: string;
  delay_ms: number;
  is_typing_indicator: boolean;
  created_at: string;
}

const AdminChatFlows = () => {
  const [flows, setFlows] = useState<ChatFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<ChatFlow | null>(null);
  const [blocks, setBlocks] = useState<ChatBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBlocksDialog, setShowBlocksDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [editingFlow, setEditingFlow] = useState<ChatFlow | null>(null);
  
  // Block form states
  const [newBlockMessage, setNewBlockMessage] = useState("");
  const [newBlockDelay, setNewBlockDelay] = useState("1000");
  const [newBlockTyping, setNewBlockTyping] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ChatBlock | null>(null);
  
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, isBlocked } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadFlows();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadFlows = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_flows' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFlows((data as unknown as ChatFlow[]) || []);
    } catch (error) {
      console.error('Error loading flows:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar fluxos de chat",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlocks = async (flowId: string) => {
    setIsLoadingBlocks(true);
    try {
      const { data, error } = await supabase
        .from('chat_blocks' as any)
        .select('*')
        .eq('flow_id', flowId)
        .order('block_order');
      
      if (error) throw error;
      setBlocks((data as unknown as ChatBlock[]) || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar blocos do fluxo",
        variant: "destructive"
      });
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const createFlow = async () => {
    if (!newFlowName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o fluxo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_flows' as any)
        .insert({
          name: newFlowName.trim(),
          description: newFlowDescription.trim() || null,
          user_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setFlows([data as unknown as ChatFlow, ...flows]);
      setShowCreateDialog(false);
      setNewFlowName("");
      setNewFlowDescription("");
      
      toast({
        title: "Sucesso",
        description: "Fluxo de chat criado com sucesso!"
      });
    } catch (error) {
      console.error('Error creating flow:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar fluxo de chat",
        variant: "destructive"
      });
    }
  };

  const updateFlow = async () => {
    if (!editingFlow || !editingFlow.name.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o fluxo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_flows' as any)
        .update({
          name: editingFlow.name.trim(),
          description: editingFlow.description?.trim() || null
        })
        .eq('id', editingFlow.id);
      
      if (error) throw error;
      
      setFlows(flows.map(f => f.id === editingFlow.id ? editingFlow : f));
      setShowEditDialog(false);
      setEditingFlow(null);
      
      toast({
        title: "Sucesso",
        description: "Fluxo de chat atualizado!"
      });
    } catch (error) {
      console.error('Error updating flow:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar fluxo",
        variant: "destructive"
      });
    }
  };

  const toggleFlowStatus = async (flow: ChatFlow) => {
    try {
      const { error } = await supabase
        .from('chat_flows' as any)
        .update({ is_active: !flow.is_active })
        .eq('id', flow.id);
      
      if (error) throw error;
      
      setFlows(flows.map(f => 
        f.id === flow.id ? { ...f, is_active: !f.is_active } : f
      ));
      
      toast({
        title: "Sucesso",
        description: `Fluxo ${!flow.is_active ? 'ativado' : 'desativado'}!`
      });
    } catch (error) {
      console.error('Error toggling flow:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status",
        variant: "destructive"
      });
    }
  };

  const deleteFlow = async (flowId: string) => {
    try {
      const { error } = await supabase
        .from('chat_flows' as any)
        .delete()
        .eq('id', flowId);
      
      if (error) throw error;
      
      setFlows(flows.filter(f => f.id !== flowId));
      
      toast({
        title: "Sucesso",
        description: "Fluxo removido com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover fluxo",
        variant: "destructive"
      });
    }
  };

  const openBlocksDialog = async (flow: ChatFlow) => {
    setSelectedFlow(flow);
    setShowBlocksDialog(true);
    await loadBlocks(flow.id);
  };

  const addBlock = async () => {
    if (!selectedFlow || !newBlockMessage.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem para o bloco",
        variant: "destructive"
      });
      return;
    }

    try {
      const nextOrder = blocks.length > 0 
        ? Math.max(...blocks.map(b => b.block_order)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('chat_blocks' as any)
        .insert({
          flow_id: selectedFlow.id,
          block_order: nextOrder,
          message: newBlockMessage.trim(),
          delay_ms: parseInt(newBlockDelay) || 1000,
          is_typing_indicator: newBlockTyping
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setBlocks([...blocks, data as unknown as ChatBlock]);
      setNewBlockMessage("");
      setNewBlockDelay("1000");
      setNewBlockTyping(false);
      
      toast({
        title: "Sucesso",
        description: "Bloco adicionado!"
      });
    } catch (error) {
      console.error('Error adding block:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar bloco",
        variant: "destructive"
      });
    }
  };

  const updateBlock = async () => {
    if (!editingBlock) return;

    try {
      const { error } = await supabase
        .from('chat_blocks' as any)
        .update({
          message: editingBlock.message,
          delay_ms: editingBlock.delay_ms,
          is_typing_indicator: editingBlock.is_typing_indicator
        })
        .eq('id', editingBlock.id);
      
      if (error) throw error;
      
      setBlocks(blocks.map(b => b.id === editingBlock.id ? editingBlock : b));
      setEditingBlock(null);
      
      toast({
        title: "Sucesso",
        description: "Bloco atualizado!"
      });
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar bloco",
        variant: "destructive"
      });
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('chat_blocks' as any)
        .delete()
        .eq('id', blockId);
      
      if (error) throw error;
      
      setBlocks(blocks.filter(b => b.id !== blockId));
      
      toast({
        title: "Sucesso",
        description: "Bloco removido!"
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover bloco",
        variant: "destructive"
      });
    }
  };

  const duplicateFlow = async (flow: ChatFlow) => {
    try {
      // Create new flow
      const { data: newFlow, error: flowError } = await supabase
        .from('chat_flows' as any)
        .insert({
          name: `${flow.name} (cópia)`,
          description: flow.description,
          user_id: user?.id,
          is_active: false
        })
        .select()
        .single();
      
      if (flowError) throw flowError;

      // Get blocks from original flow
      const { data: originalBlocks, error: blocksError } = await supabase
        .from('chat_blocks' as any)
        .select('*')
        .eq('flow_id', flow.id)
        .order('block_order');
      
      if (blocksError) throw blocksError;

      // Copy blocks to new flow
      if (originalBlocks && originalBlocks.length > 0) {
        const newBlocks = (originalBlocks as unknown as ChatBlock[]).map(block => ({
          flow_id: (newFlow as unknown as ChatFlow).id,
          block_order: block.block_order,
          message: block.message,
          delay_ms: block.delay_ms,
          is_typing_indicator: block.is_typing_indicator
        }));

        const { error: insertError } = await supabase
          .from('chat_blocks' as any)
          .insert(newBlocks);
        
        if (insertError) throw insertError;
      }

      setFlows([newFlow as unknown as ChatFlow, ...flows]);
      
      toast({
        title: "Sucesso",
        description: "Fluxo duplicado com sucesso!"
      });
    } catch (error) {
      console.error('Error duplicating flow:', error);
      toast({
        title: "Erro",
        description: "Falha ao duplicar fluxo",
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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BlockedUserAlert isBlocked={isBlocked} />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fluxos de Chat</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas conversas automatizadas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Fluxo
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Flows List */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Fluxos</CardTitle>
            <CardDescription>
              {flows.length} fluxo(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flows.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum fluxo de chat criado ainda
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Fluxo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {flows.map((flow) => (
                  <div 
                    key={flow.id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      flow.is_active ? 'bg-card' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{flow.name}</h3>
                          <Badge variant={flow.is_active ? "default" : "secondary"}>
                            {flow.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        {flow.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {flow.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Criado em {new Date(flow.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openBlocksDialog(flow)}
                          title="Editar blocos"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingFlow(flow);
                            setShowEditDialog(true);
                          }}
                          title="Editar fluxo"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => duplicateFlow(flow)}
                          title="Duplicar fluxo"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={flow.is_active}
                          onCheckedChange={() => toggleFlowStatus(flow)}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover fluxo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O fluxo "{flow.name}" e todos os seus blocos serão removidos permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteFlow(flow.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Flow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Fluxo</DialogTitle>
            <DialogDescription>
              Crie um novo fluxo de chat para automatizar conversas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flow-name">Nome do Fluxo</Label>
              <Input
                id="flow-name"
                placeholder="Ex: Boas-vindas"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flow-description">Descrição (opcional)</Label>
              <Textarea
                id="flow-description"
                placeholder="Descreva o propósito deste fluxo..."
                value={newFlowDescription}
                onChange={(e) => setNewFlowDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createFlow}>
              Criar Fluxo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Flow Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fluxo</DialogTitle>
            <DialogDescription>
              Atualize as informações do fluxo de chat
            </DialogDescription>
          </DialogHeader>
          {editingFlow && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-flow-name">Nome do Fluxo</Label>
                <Input
                  id="edit-flow-name"
                  value={editingFlow.name}
                  onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flow-description">Descrição (opcional)</Label>
                <Textarea
                  id="edit-flow-description"
                  value={editingFlow.description || ""}
                  onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={updateFlow}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocks Dialog */}
      <Dialog open={showBlocksDialog} onOpenChange={setShowBlocksDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Blocos de Chat - {selectedFlow?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as mensagens que serão enviadas neste fluxo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Add New Block */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Adicionar Novo Bloco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite a mensagem do bloco..."
                    value={newBlockMessage}
                    onChange={(e) => setNewBlockMessage(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Delay (ms)</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={newBlockDelay}
                      onChange={(e) => setNewBlockDelay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mostrar "digitando..."</Label>
                    <div className="pt-2">
                      <Switch
                        checked={newBlockTyping}
                        onCheckedChange={setNewBlockTyping}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={addBlock} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Bloco
                </Button>
              </CardContent>
            </Card>

            {/* Blocks List */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Blocos ({blocks.length})</h4>
              {isLoadingBlocks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum bloco adicionado ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <div 
                      key={block.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      {editingBlock?.id === block.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingBlock.message}
                            onChange={(e) => setEditingBlock({ ...editingBlock, message: e.target.value })}
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Delay (ms)</Label>
                              <Input
                                type="number"
                                value={editingBlock.delay_ms}
                                onChange={(e) => setEditingBlock({ ...editingBlock, delay_ms: parseInt(e.target.value) || 1000 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Digitando...</Label>
                              <div className="pt-1">
                                <Switch
                                  checked={editingBlock.is_typing_indicator}
                                  onCheckedChange={(checked) => setEditingBlock({ ...editingBlock, is_typing_indicator: checked })}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={updateBlock}>
                              <Check className="w-4 h-4 mr-1" />
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingBlock(null)}>
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {block.delay_ms}ms
                              </span>
                              {block.is_typing_indicator && (
                                <Badge variant="secondary" className="text-xs">
                                  Digitando
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{block.message}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingBlock(block)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteBlock(block.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlocksDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChatFlows;
