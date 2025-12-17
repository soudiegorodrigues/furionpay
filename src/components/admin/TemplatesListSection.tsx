import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TemplatesSection } from "@/components/admin/TemplatesSection";

interface Template {
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

export function TemplatesListSection() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-checkout-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("checkout_templates")
        .update({ is_published, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-templates"] });
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("checkout_templates").update({ is_default: false }).neq("id", id);
      const { error } = await supabase
        .from("checkout_templates")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-templates"] });
      toast.success("Template padrão atualizado!");
    },
    onError: () => toast.error("Erro ao definir padrão"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: Template) => {
      const { error } = await supabase.from("checkout_templates").insert([{
        name: `${template.name} (Cópia)`,
        description: template.description,
        template_code: template.template_code,
        layout_config: template.layout_config as unknown as Record<string, never>,
        is_published: false,
        is_default: false,
        preview_image_url: template.preview_image_url,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-templates"] });
      toast.success("Template duplicado!");
    },
    onError: () => toast.error("Erro ao duplicar template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checkout_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-templates"] });
      toast.success("Template excluído!");
      setDeleteConfirmId(null);
    },
    onError: () => toast.error("Erro ao excluir template"),
  });

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Checkout Templates
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os templates de checkout disponíveis
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum template encontrado" : "Nenhum template cadastrado"}
            </p>
            {!searchQuery && (
              <Button variant="outline" className="mt-4" onClick={() => setIsCreating(true)}>
                Criar primeiro template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden group">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {template.preview_image_url ? (
                  <img src={template.preview_image_url} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {template.is_default && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Padrão
                    </Badge>
                  )}
                  <Badge variant={template.is_published ? "default" : "secondary"} className="text-xs">
                    {template.is_published ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                  {template.description || "Sem descrição"}
                </p>
                {template.template_code && (
                  <Badge variant="outline" className="mt-2 text-xs">{template.template_code}</Badge>
                )}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)} className="flex-1 h-9 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground">
                    <Edit className="h-4 w-4 mr-1.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg transition-colors hover:bg-muted/80" onClick={() => duplicateMutation.mutate(template)} disabled={duplicateMutation.isPending}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={template.is_published}
                    onCheckedChange={(checked) => togglePublishMutation.mutate({ id: template.id, is_published: checked })}
                    disabled={togglePublishMutation.isPending}
                    className="scale-90"
                  />
                  {!template.is_default && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg transition-colors hover:bg-muted/80" onClick={() => setDefaultMutation.mutate(template.id)} disabled={setDefaultMutation.isPending}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg transition-colors text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteConfirmId(template.id)} disabled={template.is_default}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingTemplate || isCreating} onOpenChange={(open) => { if (!open) { setEditingTemplate(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <TemplatesSection
            template={editingTemplate}
            onSave={() => { setEditingTemplate(null); setIsCreating(false); queryClient.invalidateQueries({ queryKey: ["admin-checkout-templates"] }); }}
            onCancel={() => { setEditingTemplate(null); setIsCreating(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
