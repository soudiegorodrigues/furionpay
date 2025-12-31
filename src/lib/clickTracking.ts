/**
 * Track a click for an offer
 * Every call = 1 click recorded (no deduplication)
 */
export const trackOfferClick = async (
  offerId: string, 
  supabaseUrl: string
): Promise<{ success: boolean; error?: string; clickCount?: number }> => {
  if (!offerId) {
    return { success: false, error: 'No offer ID provided' };
  }

  const endpoint = `${supabaseUrl}/functions/v1/track-offer-click`;
  const payload = JSON.stringify({ offer_id: offerId });

  console.log(`[ClickTracking] Sending click for offer: ${offerId}`);

  try {
    // Try sendBeacon first (most reliable for page unload scenarios)
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      
      if (sent) {
        console.log(`[ClickTracking] sendBeacon succeeded for offer: ${offerId}`);
        return { success: true };
      }
      console.log('[ClickTracking] sendBeacon returned false, falling back to fetch');
    }

    // Fallback to fetch with keepalive
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[ClickTracking] fetch succeeded for offer: ${offerId}`, data);
      return { success: true, clickCount: data.click_count };
    } else {
      const errorText = await response.text();
      console.error(`[ClickTracking] fetch failed: ${response.status}`, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.error('[ClickTracking] Error tracking click:', error);
    return { success: false, error: String(error) };
  }
};
