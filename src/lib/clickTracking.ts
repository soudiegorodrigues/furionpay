const CLICK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_PREFIX = 'offer_click_';

/**
 * Check if we should track this click (TTL-based deduplication)
 */
export const shouldTrackClick = (offerId: string): boolean => {
  if (!offerId) return false;
  
  const key = `${STORAGE_PREFIX}${offerId}`;
  const lastClick = sessionStorage.getItem(key);
  
  if (lastClick) {
    const lastClickTime = parseInt(lastClick, 10);
    const elapsed = Date.now() - lastClickTime;
    
    if (elapsed < CLICK_TTL_MS) {
      console.log(`[ClickTracking] Skipping click for ${offerId} - last click was ${Math.round(elapsed / 1000)}s ago (TTL: ${CLICK_TTL_MS / 1000}s)`);
      return false;
    }
  }
  
  return true;
};

/**
 * Mark that we tracked a click for this offer
 */
export const markClickTracked = (offerId: string): void => {
  if (!offerId) return;
  const key = `${STORAGE_PREFIX}${offerId}`;
  sessionStorage.setItem(key, Date.now().toString());
};

/**
 * Track a click using the robust backend endpoint
 * Uses sendBeacon for reliability (works even if page closes immediately)
 */
export const trackOfferClick = async (
  offerId: string, 
  supabaseUrl: string
): Promise<{ success: boolean; error?: string; clickCount?: number }> => {
  if (!offerId) {
    return { success: false, error: 'No offer ID provided' };
  }

  if (!shouldTrackClick(offerId)) {
    return { success: false, error: 'Click already tracked recently (TTL)' };
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
        markClickTracked(offerId);
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
      markClickTracked(offerId);
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

/**
 * Debug info for click tracking
 */
export const getClickTrackingDebugInfo = (offerId: string): {
  offerId: string;
  lastClickTime: string | null;
  canTrack: boolean;
  ttlMs: number;
} => {
  const key = `${STORAGE_PREFIX}${offerId}`;
  const lastClick = sessionStorage.getItem(key);
  
  return {
    offerId,
    lastClickTime: lastClick ? new Date(parseInt(lastClick, 10)).toISOString() : null,
    canTrack: shouldTrackClick(offerId),
    ttlMs: CLICK_TTL_MS,
  };
};
