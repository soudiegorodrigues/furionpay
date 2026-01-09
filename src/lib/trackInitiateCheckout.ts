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
 * This sends the IC event server-side for proper attribution
 */
export async function trackInitiateCheckoutToUtmify({
  userId,
  offerId,
  productName,
  value,
  utmParams,
  popupModel,
}: TrackInitiateCheckoutParams): Promise<void> {
  // Skip if no userId - UTMify requires user context
  if (!userId) {
    console.log('[TRACK-IC] Skipping: No userId provided');
    return;
  }

  try {
    console.log('[TRACK-IC] Sending InitiateCheckout to UTMify', {
      userId,
      offerId,
      productName,
      value,
      popupModel,
    });

    const { data, error } = await supabase.functions.invoke('track-initiate-checkout', {
      body: {
        userId,
        offerId,
        productName,
        value,
        utmParams,
        popupModel,
      },
    });

    if (error) {
      console.error('[TRACK-IC] Error tracking InitiateCheckout:', error);
      return;
    }

    if (data?.skipped) {
      console.log('[TRACK-IC] Tracking skipped:', data.reason);
      return;
    }

    console.log('[TRACK-IC] ✅ InitiateCheckout tracked successfully:', data?.orderId);
  } catch (err) {
    console.error('[TRACK-IC] Failed to track InitiateCheckout:', err);
    // Don't throw - this is a non-critical tracking call
  }
}
