import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface DangerZoneSectionProps {
  productId: string;
  productName: string;
}

export function DangerZoneSection({ productId, productName }: DangerZoneSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmName, setConfirmName] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Produto excluído com sucesso");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products-paginated"] }),
        queryClient.invalidateQueries({ queryKey: ["product_folder_counts"] }),
        queryClient.invalidateQueries({ queryKey: ["products_performance"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      navigate("/admin/products");
    },
    onError: () => {
      toast.error("Erro ao excluir produto");
    },
  });

  const handleDelete = () => {
    if (confirmName.trim() !== productName.trim()) {
      toast.error("Nome do produto não corresponde");
      return;
    }
    deleteMutation.mutate();
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </div>
        <CardDescription>
          Ações irreversíveis. Tenha cuidado ao realizar estas ações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <h4 className="font-semibold text-destructive mb-2">Excluir produto</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Uma vez excluído, não será possível recuperar este produto. Todos os dados associados serão perdidos permanentemente.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="confirm-name" className="text-sm">
                Digite <strong>{productName}</strong> para confirmar
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Nome do produto"
              />
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={confirmName.trim() !== productName.trim() || deleteMutation.isPending}
              className="w-full"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir produto permanentemente"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
