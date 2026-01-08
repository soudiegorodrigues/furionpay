import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useCallback, useRef } from 'react';

export const useDeviceFingerprint = () => {
  const cachedFingerprint = useRef<string | null>(null);
  const fpPromise = useRef<Promise<string> | null>(null);

  const getFingerprint = useCallback(async (): Promise<string> => {
    // Return cached fingerprint if available
    if (cachedFingerprint.current) {
      return cachedFingerprint.current;
    }

    // If already loading, wait for the existing promise
    if (fpPromise.current) {
      return fpPromise.current;
    }

    // Create new fingerprint loading promise
    fpPromise.current = (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        cachedFingerprint.current = result.visitorId;
        return result.visitorId;
      } catch (error) {
        console.error('[Fingerprint] Error getting fingerprint:', error);
        // Fallback: generate a random ID and store in localStorage
        let fallbackId = localStorage.getItem('fp_fallback_id');
        
        // Validate fallback ID format - clear if corrupted
        if (fallbackId && !fallbackId.startsWith('fb_')) {
          console.warn('[Fingerprint] Fallback ID corrompido, regenerando...');
          localStorage.removeItem('fp_fallback_id');
          fallbackId = null;
        }
        
        if (!fallbackId) {
          fallbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('fp_fallback_id', fallbackId);
        }
        cachedFingerprint.current = fallbackId;
        return fallbackId;
      }
    })();

    return fpPromise.current;
  }, []);

  return { getFingerprint };
};
