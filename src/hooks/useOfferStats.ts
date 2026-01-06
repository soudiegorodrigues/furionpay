import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OfferStats {
  offer_id: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}

export function useOfferStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['offer_stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_offer_stats', { p_user_id: userId });
      
      if (error) {
        console.error('Error fetching offer stats:', error);
        throw error;
      }
      
      return (data || []) as OfferStats[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
