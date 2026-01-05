import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}

interface CheckoutOffer {
  id: string;
  name: string;
  domain: string;
  popup_model: string;
  product_name: string;
  meta_pixel_ids: string[];
  click_count?: number;
  video_url?: string;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

interface PopupModelStats {
  popup_model: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}

// Fetch user settings and parse meta pixels
async function fetchUserSettings() {
  const { data, error } = await supabase.rpc('get_user_settings');
  if (error) throw error;
  
  let parsedPixels: MetaPixel[] = [];
  if (data) {
    const settings = data as { key: string; value: string }[];
    const pixelsSetting = settings.find(s => s.key === 'meta_pixels');
    if (pixelsSetting?.value) {
      try {
        const parsed = JSON.parse(pixelsSetting.value);
        parsedPixels = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedPixels = [];
      }
    }
  }
  return parsedPixels;
}

// Fetch offers and clean invalid pixel IDs
async function fetchOffers(validPixelIds: Set<string>) {
  const { data, error } = await supabase
    .from('checkout_offers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  const processedOffers: CheckoutOffer[] = [];
  const offersToUpdate: { id: string; validIds: string[] }[] = [];
  
  for (const o of data || []) {
    const currentPixelIds = o.meta_pixel_ids || [];
    const validIds = currentPixelIds.filter((id: string) => validPixelIds.has(id));
    
    if (validIds.length !== currentPixelIds.length && !o.id.startsWith('temp-')) {
      offersToUpdate.push({ id: o.id, validIds });
    }
    
    processedOffers.push({
      id: o.id,
      name: o.name,
      domain: o.domain || '',
      popup_model: o.popup_model || 'landing',
      product_name: o.product_name || '',
      meta_pixel_ids: validIds,
      click_count: o.click_count || 0,
      video_url: o.video_url || ''
    });
  }
  
  // Clean invalid pixels in background
  if (offersToUpdate.length > 0) {
    Promise.all(
      offersToUpdate.map(({ id, validIds }) =>
        supabase.from('checkout_offers').update({ meta_pixel_ids: validIds }).eq('id', id)
      )
    ).then(() => console.log('Cleaned invalid pixel IDs from offers'));
  }
  
  return processedOffers;
}

export function useCheckoutOffers(userId: string | undefined) {
  const queryClient = useQueryClient();

  // First fetch settings to get valid pixel IDs
  const settingsQuery = useQuery({
    queryKey: ['user_settings', userId],
    queryFn: fetchUserSettings,
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Then fetch offers using the valid pixel IDs
  const offersQuery = useQuery({
    queryKey: ['checkout_offers', userId],
    queryFn: async () => {
      const pixels = settingsQuery.data || [];
      const validPixelIds = new Set(pixels.map(p => p.id));
      return fetchOffers(validPixelIds);
    },
    enabled: !!userId && settingsQuery.isSuccess,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep previous data while refetching
  });

  const domainsQuery = useQuery({
    queryKey: ['available_domains', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('available_domains')
        .select('id, domain, name')
        .eq('is_active', true)
        .eq('domain_type', 'popup')
        .order('domain');
      if (error) throw error;
      return (data || []) as AvailableDomain[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ['popup_model_stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_popup_model_stats');
      if (error) throw error;
      return (data || []) as PopupModelStats[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ offer, isNew }: { offer: CheckoutOffer; isNew: boolean }) => {
      if (isNew) {
        const { data, error } = await supabase
          .from('checkout_offers')
          .insert({
            user_id: userId,
            name: offer.name,
            domain: offer.domain || null,
            popup_model: offer.popup_model,
            product_name: offer.product_name || null,
            meta_pixel_ids: offer.meta_pixel_ids || [],
            video_url: offer.video_url || null
          })
          .select()
          .single();
        if (error) throw error;
        return { ...offer, id: data.id };
      } else {
        const { error } = await supabase
          .from('checkout_offers')
          .update({
            name: offer.name,
            domain: offer.domain || null,
            popup_model: offer.popup_model,
            product_name: offer.product_name || null,
            meta_pixel_ids: offer.meta_pixel_ids || [],
            video_url: offer.video_url || null
          })
          .eq('id', offer.id);
        if (error) throw error;
        return offer;
      }
    },
    onSuccess: (_, { isNew }) => {
      queryClient.invalidateQueries({ queryKey: ['checkout_offers', userId] });
      toast({
        title: isNew ? "Oferta criada!" : "Oferta atualizada!",
        description: isNew ? "Sua nova oferta foi salva com sucesso." : "As alterações foram salvas com sucesso."
      });
    },
    onError: (error) => {
      console.error('Error saving offer:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar oferta",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from('checkout_offers')
        .delete()
        .eq('id', offerId);
      if (error) throw error;
      return offerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout_offers', userId] });
      toast({
        title: "Oferta excluída",
        description: "A oferta foi removida com sucesso."
      });
    },
    onError: (error) => {
      console.error('Error deleting offer:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir oferta",
        variant: "destructive"
      });
    }
  });

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['checkout_offers', userId] }),
      queryClient.invalidateQueries({ queryKey: ['popup_model_stats', userId] }),
      queryClient.invalidateQueries({ queryKey: ['offer_clicks_chart', userId] }),
    ]);
  };

  return {
    // Data
    offers: offersQuery.data || [],
    metaPixels: settingsQuery.data || [],
    availableDomains: domainsQuery.data || [],
    popupStats: statsQuery.data || [],
    
    // Loading states - offers are the priority
    isLoadingOffers: settingsQuery.isLoading || !offersQuery.isFetched,
    isLoadingExtras: domainsQuery.isLoading || statsQuery.isLoading,
    isRefetching: offersQuery.isRefetching || statsQuery.isRefetching,
    
    // Last fetched time
    dataUpdatedAt: offersQuery.dataUpdatedAt,
    
    // Actions
    saveOffer: (offer: CheckoutOffer, isNew: boolean) => saveMutation.mutateAsync({ offer, isNew }),
    deleteOffer: deleteMutation.mutateAsync,
    refetchAll,
    
    // Mutation states
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Prefetch function to be called from AdminLayoutWrapper
export function prefetchCheckoutData(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  // Prefetch settings first (needed for offers)
  queryClient.prefetchQuery({
    queryKey: ['user_settings', userId],
    queryFn: fetchUserSettings,
    staleTime: 60 * 1000,
  });

  // Prefetch domains
  queryClient.prefetchQuery({
    queryKey: ['available_domains', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('available_domains')
        .select('id, domain, name')
        .eq('is_active', true)
        .eq('domain_type', 'popup')
        .order('domain');
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Prefetch stats
  queryClient.prefetchQuery({
    queryKey: ['popup_model_stats', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_popup_model_stats');
      return data || [];
    },
    staleTime: 60 * 1000,
  });
}
