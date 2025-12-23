import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { compressImage, compressionPresets } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";
import {
  Image,
  Upload,
  Loader2,
  Trash2,
  GripVertical,
  Plus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Banner {
  id: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

interface BannersManagerProps {
  productId: string;
  userId: string;
  showBanners: boolean;
  onShowBannersChange: (value: boolean) => void;
}

function SortableBannerItem({
  banner,
  onRemove,
  isRemoving,
}: {
  banner: Banner;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 border rounded-lg bg-background",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        type="button"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <img
        src={banner.image_url}
        alt="Banner"
        className="w-16 h-10 object-cover rounded"
      />
      <span className="flex-1 text-xs text-muted-foreground truncate">
        Banner {banner.display_order + 1}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onRemove(banner.id)}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export function BannersManager({
  productId,
  userId,
  showBanners,
  onShowBannersChange,
}: BannersManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch banners
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["checkout-banners", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_banners")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
    enabled: showBanners,
  });

  // Handle image upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return;
    }

    if (banners.length >= 5) {
      toast.error("Máximo de 5 banners permitidos");
      return;
    }

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file, compressionPresets.banner);
      const fileName = `${userId}/${productId}-banner-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedBlob, {
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      // Insert banner record
      const { error: insertError } = await supabase
        .from("checkout_banners")
        .insert({
          product_id: productId,
          user_id: userId,
          image_url: publicUrl,
          display_order: banners.length,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Banner adicionado!");
      queryClient.invalidateQueries({ queryKey: ["checkout-banners", productId] });
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle remove banner
  const handleRemove = async (bannerId: string) => {
    setRemovingId(bannerId);
    try {
      const { error } = await supabase
        .from("checkout_banners")
        .delete()
        .eq("id", bannerId);

      if (error) throw error;

      toast.success("Banner removido");
      queryClient.invalidateQueries({ queryKey: ["checkout-banners", productId] });
    } catch (error) {
      console.error("Erro ao remover banner:", error);
      toast.error("Erro ao remover banner");
    } finally {
      setRemovingId(null);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = banners.findIndex((b) => b.id === active.id);
      const newIndex = banners.findIndex((b) => b.id === over.id);

      const reorderedBanners = arrayMove(banners, oldIndex, newIndex);

      // Optimistically update UI
      queryClient.setQueryData(
        ["checkout-banners", productId],
        reorderedBanners.map((b, idx) => ({ ...b, display_order: idx }))
      );

      // Update in database
      try {
        for (let i = 0; i < reorderedBanners.length; i++) {
          await supabase
            .from("checkout_banners")
            .update({ display_order: i })
            .eq("id", reorderedBanners[i].id);
        }
      } catch (error) {
        console.error("Erro ao reordenar:", error);
        toast.error("Erro ao reordenar banners");
        queryClient.invalidateQueries({ queryKey: ["checkout-banners", productId] });
      }
    }
  };

  if (!showBanners) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={banners.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {banners.map((banner) => (
                <SortableBannerItem
                  key={banner.id}
                  banner={banner}
                  onRemove={handleRemove}
                  isRemoving={removingId === banner.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed">
          <Image className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Nenhum banner adicionado</p>
        </div>
      )}

      {banners.length < 5 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Adicionar Banner ({banners.length}/5)
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Arraste para reordenar • Recomendado: 1200x300px
      </p>
    </div>
  );
}
