import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Gift } from "lucide-react";
import {
  OrderBumpListItem,
  OrderBumpEditForm,
  OrderBumpAddForm,
  OrderBumpSkeleton,
} from "./order-bump";

interface OrderBumpData {
  id: string;
  product_id: string;
  user_id: string;
  bump_product_id: string;
  title: string;
  description: string | null;
  bump_price: number;
  is_active: boolean;
  position: number;
  image_url: string | null;
  created_at: string;
  bump_product?: {
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

interface OrderBumpSectionProps {
  productId: string;
  userId: string;
}

// Memoized price formatter
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export function OrderBumpSection({ productId, userId }: OrderBumpSectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingBump, setEditingBump] = useState<OrderBumpData | null>(null);

  // Fetch existing order bumps with staleTime optimization
  const { data: orderBumps, isLoading } = useQuery({
    queryKey: ["order-bumps", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_order_bumps")
        .select(`
          *,
          bump_product:products!bump_product_id(id, name, price, image_url)
        `)
        .eq("product_id", productId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as OrderBumpData[];
    },
    staleTime: 30000, // 30 seconds - avoid unnecessary refetches
  });

  // Fetch user's other products for selection
  const { data: availableProducts } = useQuery({
    queryKey: ["available-products-for-bump", userId, productId],
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
    staleTime: 60000, // 1 minute
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      bump_product_id: string;
      title: string;
      description: string;
      bump_price: number;
      image_url: string;
    }) => {
      const maxPosition = orderBumps?.reduce((max, b) => Math.max(max, b.position), -1) ?? -1;
      
      const { error } = await supabase
        .from("product_order_bumps")
        .insert({
          product_id: productId,
          user_id: userId,
          bump_product_id: data.bump_product_id,
          title: data.title,
          description: data.description || null,
          bump_price: data.bump_price,
          image_url: data.image_url || null,
          position: maxPosition + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
      setIsAdding(false);
    },
    onError: () => {
      toast.error("Erro ao criar Order Bump");
    },
  });

  // Toggle active mutation with optimistic update
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["order-bumps", productId] });

      // Snapshot previous value
      const previousBumps = queryClient.getQueryData<OrderBumpData[]>(["order-bumps", productId]);

      // Optimistically update
      queryClient.setQueryData<OrderBumpData[]>(["order-bumps", productId], (old) =>
        old?.map((bump) =>
          bump.id === id ? { ...bump, is_active } : bump
        )
      );

      return { previousBumps };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousBumps) {
        queryClient.setQueryData(["order-bumps", productId], context.previousBumps);
      }
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump removido");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
    },
    onError: () => {
      toast.error("Erro ao remover Order Bump");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: {
      title: string;
      description: string;
      bump_price: number;
      image_url: string;
    }}) => {
      const { error } = await supabase
        .from("product_order_bumps")
        .update({
          title: data.title,
          description: data.description || null,
          bump_price: data.bump_price,
          image_url: data.image_url || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Bump atualizado!");
      queryClient.invalidateQueries({ queryKey: ["order-bumps", productId] });
      setEditingBump(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar Order Bump");
    },
  });

  // Memoized callbacks
  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleCancelAdding = useCallback(() => {
    setIsAdding(false);
  }, []);

  const handleCreate = useCallback((data: {
    bump_product_id: string;
    title: string;
    description: string;
    bump_price: number;
    image_url: string;
  }) => {
    createMutation.mutate(data);
  }, [createMutation]);

  const handleStartEditing = useCallback((bump: OrderBumpData) => {
    setEditingBump(bump);
  }, []);

  const handleCancelEditing = useCallback(() => {
    setEditingBump(null);
  }, []);

  const handleUpdate = useCallback((id: string, data: {
    title: string;
    description: string;
    bump_price: number;
    image_url: string;
  }) => {
    updateMutation.mutate({ id, data });
  }, [updateMutation]);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleToggleActive = useCallback((id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, is_active: isActive });
  }, [toggleActiveMutation]);

  // Memoize the bumps list check
  const hasBumps = useMemo(() => orderBumps && orderBumps.length > 0, [orderBumps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle>Order Bump</CardTitle>
                <CardDescription>
                  Ofereça produtos complementares durante o checkout para aumentar o ticket médio
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={handleStartAdding} 
              disabled={isAdding}
              className="transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Order Bump
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add New Form */}
      {isAdding && (
        <OrderBumpAddForm
          userId={userId}
          availableProducts={availableProducts}
          onSubmit={handleCreate}
          onCancel={handleCancelAdding}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* Existing Order Bumps List */}
      {isLoading ? (
        <OrderBumpSkeleton />
      ) : hasBumps ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Bumps configurados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderBumps?.map((bump) => (
              <div key={bump.id} className="animate-fade-in">
                {editingBump?.id === bump.id ? (
                  <OrderBumpEditForm
                    bumpId={bump.id}
                    bumpProductName={bump.bump_product?.name || ""}
                    userId={userId}
                    initialData={{
                      title: bump.title,
                      description: bump.description || "",
                      bump_price: bump.bump_price,
                      image_url: bump.image_url || "",
                    }}
                    onSave={handleUpdate}
                    onCancel={handleCancelEditing}
                    isSaving={updateMutation.isPending}
                  />
                ) : (
                  <OrderBumpListItem
                    bump={bump}
                    onEdit={handleStartEditing}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    formatPrice={formatPrice}
                    isToggling={toggleActiveMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !isAdding ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum Order Bump configurado</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Order Bumps aparecem no checkout e permitem que clientes adicionem 
              produtos complementares com um clique, aumentando seu ticket médio.
            </p>
            <Button onClick={handleStartAdding} className="transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro Order Bump
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
