import { memo, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditFormData {
  title: string;
  description: string;
  bump_price: number;
  image_url: string;
}

interface OrderBumpEditFormProps {
  bumpId: string;
  bumpProductName: string;
  userId: string;
  initialData: EditFormData;
  onSave: (id: string, data: EditFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const OrderBumpEditForm = memo(function OrderBumpEditForm({
  bumpId,
  bumpProductName,
  userId,
  initialData,
  onSave,
  onCancel,
  isSaving,
}: OrderBumpEditFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  }, [userId]);

  const removeImage = useCallback(() => {
    setFormData(prev => ({ ...prev, image_url: "" }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (formData.bump_price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }
    onSave(bumpId, formData);
  }, [bumpId, formData, onSave]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, bump_price: parseFloat(e.target.value) || 0 }));
  }, []);

  return (
    <div className="p-4 rounded-lg border-2 border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Pencil className="h-4 w-4 text-orange-500" />
          Editando Order Bump
        </h4>
        <Badge variant="outline">{bumpProductName}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título chamativo *</Label>
            <Input
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Ex: 🔥 Adicione também!"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={formData.description}
              onChange={handleDescriptionChange}
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
              value={formData.bump_price}
              onChange={handlePriceChange}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Imagem do Order Bump</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {formData.image_url ? (
              <div className="relative w-24 h-24">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  loading="lazy"
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
                className="w-full h-20 flex flex-col gap-1 border-dashed transition-colors duration-150"
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
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
});
