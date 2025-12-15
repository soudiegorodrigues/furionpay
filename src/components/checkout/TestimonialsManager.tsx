import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Star, Trash2, Loader2, Pencil, Upload, X } from "lucide-react";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

interface Testimonial {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  content: string;
  display_order: number;
  is_active: boolean;
}

interface TestimonialsManagerProps {
  productId: string;
  userId: string;
}

export function TestimonialsManager({ productId, userId }: TestimonialsManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    author_name: "",
    author_photo_url: "" as string | null,
    rating: 5,
    content: "",
  });

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["product-testimonials", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_testimonials")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const resetForm = () => {
    setFormData({ author_name: "", author_photo_url: null, rating: 5, content: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.avatar);
      const fileName = `${userId}/${productId}/${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData(p => ({ ...p, author_photo_url: `${publicUrl}?t=${Date.now()}` }));
      toast.success("Foto comprimida e enviada!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveTestimonial = async () => {
    if (!formData.author_name.trim() || !formData.content.trim()) {
      toast.error("Preencha nome e depoimento");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("product_testimonials")
          .update({
            author_name: formData.author_name,
            author_photo_url: formData.author_photo_url,
            rating: formData.rating,
            content: formData.content,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Depoimento atualizado!");
      } else {
        // Create new
        const { error } = await supabase.from("product_testimonials").insert({
          product_id: productId,
          user_id: userId,
          author_name: formData.author_name,
          author_photo_url: formData.author_photo_url,
          rating: formData.rating,
          content: formData.content,
          display_order: (testimonials?.length || 0) + 1,
        });

        if (error) throw error;
        toast.success("Depoimento adicionado!");
      }
      
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["product-testimonials", productId] });
    } catch (error) {
      console.error("Error saving testimonial:", error);
      toast.error("Erro ao salvar depoimento");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setFormData({
      author_name: testimonial.author_name,
      author_photo_url: testimonial.author_photo_url,
      rating: testimonial.rating,
      content: testimonial.content,
    });
    setEditingId(testimonial.id);
    setIsAdding(false);
  };

  const handleDeleteTestimonial = async (id: string) => {
    try {
      const { error } = await supabase
        .from("product_testimonials")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Depoimento removido");
      queryClient.invalidateQueries({ queryKey: ["product-testimonials", productId] });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast.error("Erro ao remover depoimento");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", 
      "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFormOpen = isAdding || editingId;

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Existing Testimonials */}
      {testimonials && testimonials.length > 0 && !isFormOpen && (
        <div className="space-y-2">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group"
            >
              {/* Avatar */}
              {testimonial.author_photo_url ? (
                <img
                  src={testimonial.author_photo_url}
                  alt={testimonial.author_name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                  getAvatarColor(testimonial.author_name)
                )}>
                  {getInitials(testimonial.author_name)}
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{testimonial.author_name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3",
                          star <= testimonial.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  "{testimonial.content}"
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditTestimonial(testimonial)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeleteTestimonial(testimonial.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen ? (
        <div className="space-y-2 p-2 border rounded-lg bg-background">
          {/* Photo Upload */}
          <div className="space-y-1">
            <Label className="text-xs">Foto (opcional)</Label>
            <div className="flex items-center gap-2">
              {formData.author_photo_url ? (
                <div className="relative">
                  <img
                    src={formData.author_photo_url}
                    alt="Preview"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, author_photo_url: null }))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold",
                    formData.author_name ? getAvatarColor(formData.author_name) : "bg-muted"
                  )}
                >
                  {formData.author_name ? getInitials(formData.author_name) : "?"}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-3 w-3" />
                    Enviar foto
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input
              value={formData.author_name}
              onChange={(e) => setFormData(p => ({ ...p, author_name: e.target.value }))}
              placeholder="Maria Silva"
              className="h-7 text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Avaliação</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5 cursor-pointer transition-colors",
                    star <= formData.rating 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-gray-300 hover:text-yellow-400"
                  )}
                  onClick={() => setFormData(p => ({ ...p, rating: star }))}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Depoimento</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
              placeholder="Produto excelente! Recomendo muito..."
              className="text-xs min-h-[60px] resize-none"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleSaveTestimonial}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : (editingId ? "Atualizar" : "Salvar")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-1"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3" />
          Adicionar Depoimento
        </Button>
      )}
    </div>
  );
}
