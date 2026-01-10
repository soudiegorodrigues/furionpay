import { supabase } from "@/integrations/supabase/client";
import { UTMParams } from "./utm";

interface TrackInitiateCheckoutParams {
  userId?: string;
  offerId?: string;
  productName?: string;
  value?: number;
  utmParams?: UTMParams;
  popupModel?: string;
}

/**
 * Tracks InitiateCheckout event to UTMify
 * 
 * DISABLED: This function was causing duplicate "Vendas Iniciadas" in UTMify.
 * The utmify-sync trigger already sends events with status 'waiting_payment' 
 * when a PIX is generated, which UTMify counts as "Venda Iniciada".
 * Sending IC here was duplicating that count.
 * 
 * The tracking flow is now:
 * 1. PIX generated → utmify-sync sends status: 'waiting_payment' → "Venda Iniciada"
 * 2. PIX paid → utmify-sync sends status: 'paid' → "Venda Aprovada"
 */
export async function trackInitiateCheckoutToUtmify({
  userId,
  offerId,
  productName,
  value,
  utmParams,
  popupModel,
}: TrackInitiateCheckoutParams): Promise<void> {
  // DISABLED: Tracking is now handled by utmify-sync trigger on pix_transactions
  // This avoids duplicate "Vendas Iniciadas" in UTMify
  console.log('[TRACK-IC] Disabled - tracking handled by utmify-sync trigger', {
    userId,
    offerId,
    productName,
    popupModel,
  });
  return;
}
