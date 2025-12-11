import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Star, Trash2, Loader2, GripVertical } from "lucide-react";

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
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    author_name: "",
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

  const handleAddTestimonial = async () => {
    if (!newTestimonial.author_name.trim() || !newTestimonial.content.trim()) {
      toast.error("Preencha nome e depoimento");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("product_testimonials").insert({
        product_id: productId,
        user_id: userId,
        author_name: newTestimonial.author_name,
        rating: newTestimonial.rating,
        content: newTestimonial.content,
        display_order: (testimonials?.length || 0) + 1,
      });

      if (error) throw error;
      
      toast.success("Depoimento adicionado!");
      setNewTestimonial({ author_name: "", rating: 5, content: "" });
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["product-testimonials", productId] });
    } catch (error) {
      console.error("Error adding testimonial:", error);
      toast.error("Erro ao adicionar depoimento");
    } finally {
      setIsSaving(false);
    }
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

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3 w-3",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
              interactive && "cursor-pointer hover:text-yellow-400"
            )}
            onClick={() => interactive && onChange?.(star)}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Existing Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <div className="space-y-2">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group"
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                getAvatarColor(testimonial.author_name)
              )}>
                {getInitials(testimonial.author_name)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{testimonial.author_name}</span>
                  {renderStars(testimonial.rating)}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  "{testimonial.content}"
                </p>
              </div>
              
              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteTestimonial(testimonial.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Form */}
      {isAdding ? (
        <div className="space-y-2 p-2 border rounded-lg bg-background">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input
              value={newTestimonial.author_name}
              onChange={(e) => setNewTestimonial(p => ({ ...p, author_name: e.target.value }))}
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
                    star <= newTestimonial.rating 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-gray-300 hover:text-yellow-400"
                  )}
                  onClick={() => setNewTestimonial(p => ({ ...p, rating: star }))}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Depoimento</Label>
            <Textarea
              value={newTestimonial.content}
              onChange={(e) => setNewTestimonial(p => ({ ...p, content: e.target.value }))}
              placeholder="Produto excelente! Recomendo muito..."
              className="text-xs min-h-[60px] resize-none"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleAddTestimonial}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setIsAdding(false);
                setNewTestimonial({ author_name: "", rating: 5, content: "" });
              }}
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
