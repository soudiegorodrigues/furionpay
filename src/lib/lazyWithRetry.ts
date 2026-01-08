import { lazy, ComponentType } from 'react';

type ComponentImport<T> = () => Promise<{ default: T }>;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Lazy load a component with automatic retry on failure.
 * Handles chunk loading errors by retrying the import and forcing a page reload if needed.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: ComponentImport<T>,
  chunkName?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const sessionKey = `chunk_retry_${chunkName || 'component'}`;
    const hasReloaded = sessionStorage.getItem(sessionKey);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const component = await componentImport();
        // Success - clear any reload flag
        if (hasReloaded) {
          sessionStorage.removeItem(sessionKey);
        }
        return component;
      } catch (error: any) {
        const isChunkError = 
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.message?.includes('Loading chunk') ||
          error?.message?.includes('ChunkLoadError') ||
          error?.name === 'ChunkLoadError';

        console.warn(`[lazyWithRetry] Attempt ${attempt}/${MAX_RETRIES} failed for ${chunkName || 'component'}:`, error?.message);

        if (attempt === MAX_RETRIES) {
          // Last attempt failed
          if (isChunkError && !hasReloaded) {
            // Mark that we're reloading to avoid infinite loop
            sessionStorage.setItem(sessionKey, 'true');
            console.log('[lazyWithRetry] Forcing page reload due to chunk error');
            window.location.reload();
            // Return a never-resolving promise since we're reloading
            return new Promise(() => {});
          }
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new Error('Failed to load component after retries');
  });
}
