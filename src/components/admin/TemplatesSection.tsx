import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Copy, LayoutTemplate, Check, X, Settings2 } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";

interface CheckoutTemplate {
  id: string;
  name: string;
  description: string | null;
  template_code: string | null;
  layout_config: Record<string, unknown>;
  is_published: boolean;
  is_default: boolean;
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function TemplatesSection() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CheckoutTemplate | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<CheckoutTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_published: false,
    is_default: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["checkout-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_templates")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as CheckoutTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; is_published: boolean; is_default: boolean }) => {
      const { error } = await supabase
        .from("checkout_templates")
        .insert({
          name: data.name,
          description: data.description || null,
          is_published: data.is_published,
          is_default: data.is_default,
          layout_config: { type: data.name.toLowerCase().replace(/\s/g, "-") },
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Template criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; is_published: boolean; is_default: boolean }) => {
      const { error } = await supabase
        .from("checkout_templates")
        .update({
          name: data.name,
          description: data.description || null,
          is_published: data.is_published,
          is_default: data.is_default,
        })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-templates"] });
      setEditingTemplate(null);
      resetForm();
      toast.success("Template atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checkout_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-templates"] });
      toast.success("Template excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("checkout_templates")
        .update({ is_published })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-templates"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_published: false,
      is_default: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingTemplate || !formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMutation.mutate({ id: editingTemplate.id, ...formData });
  };

  const openEditDialog = (template: CheckoutTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      is_published: template.is_published,
      is_default: template.is_default,
    });
  };

  const copyTemplateCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Templates de Checkout
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os templates globais disponíveis para todos os usuários
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Crie um novo template de checkout que ficará disponível para todos os usuários.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Template Premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o template..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_published">Publicar imediatamente</Label>
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_default">Template padrão</Label>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates?.map((template) => (
            <Card key={template.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {template.description || "Sem descrição"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_published ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px]">
                        <Check className="h-3 w-3 mr-1" />
                        Publicado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        <X className="h-3 w-3 mr-1" />
                        Rascunho
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Preview placeholder */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  {template.preview_image_url ? (
                    <img 
                      src={template.preview_image_url} 
                      alt={template.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <LayoutTemplate className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px]">Preview não disponível</span>
                    </div>
                  )}
                </div>

                {/* Template code */}
                {template.template_code && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Código: {template.template_code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyTemplateCode(template.template_code!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setEditorTemplate(template)}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                    Editar Layout
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2"
                    onClick={() => togglePublishMutation.mutate({ 
                      id: template.id, 
                      is_published: !template.is_published 
                    })}
                  >
                    {template.is_published ? "Despublicar" : "Publicar"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o template "{template.name}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              Atualize as informações do template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Template</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Template Premium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o template..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-is_published">Publicado</Label>
              <Switch
                id="edit-is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-is_default">Template padrão</Label>
              <Switch
                id="edit-is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor */}
      {editorTemplate && (
        <TemplateEditor
          template={editorTemplate}
          onClose={() => setEditorTemplate(null)}
        />
      )}
    </div>
  );
}
