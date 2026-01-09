import { useEffect, createContext, useContext, ReactNode, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams, captureUTMParams, saveUTMParams, UTMParams } from "@/lib/utm";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Function to get cookie value by name
const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
};

// Function to get Meta cookies for attribution
const getMetaCookies = () => {
  const fbc = getCookie('_fbc'); // Facebook Click ID (from ad clicks)
  const fbp = getCookie('_fbp'); // Facebook Browser ID
  
  console.log('[META COOKIES] _fbc:', fbc || 'não encontrado');
  console.log('[META COOKIES] _fbp:', fbp || 'não encontrado');
  
  return { fbc, fbp };
};

// Advanced matching parameters for better match quality
interface AdvancedMatchingParams {
  em?: string; // Email (will be hashed by Facebook)
  ph?: string; // Phone (will be hashed by Facebook)
  fn?: string; // First name
  ln?: string; // Last name
  external_id?: string; // External ID (transaction ID)
  country?: string; // Country code
  ct?: string; // City
  st?: string; // State
  fbc?: string; // Facebook Click ID
  fbp?: string; // Facebook Browser ID
  // client_user_agent removido - Meta captura automaticamente no browser pixel, usar apenas no CAPI
}

// Pending event structure for queue
interface PendingEvent {
  type: 'standard' | 'custom';
  eventName: string;
  params?: Record<string, any>;
  advancedMatching?: AdvancedMatchingParams;
}

interface PixelDebugStatus {
  pixelIds: string[];
  scriptInjected: boolean;
  scriptLoaded: boolean;
  scriptError: string | null;
  pendingEventsCount: number;
}

interface MetaPixelContextType {
  trackEvent: (eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => void;
  trackCustomEvent: (eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => void;
  isLoaded: boolean;
  utmParams: UTMParams;
  setAdvancedMatching: (params: AdvancedMatchingParams) => void;
  initializeWithPixelIds: (pixelIds: string[]) => void;
  debugStatus: PixelDebugStatus;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  trackEvent: () => {},
  trackCustomEvent: () => {},
  isLoaded: false,
  utmParams: {},
  setAdvancedMatching: () => {},
  initializeWithPixelIds: () => {},
  debugStatus: { pixelIds: [], scriptInjected: false, scriptLoaded: false, scriptError: null, pendingEventsCount: 0 },
});

export const usePixel = () => useContext(MetaPixelContext);

interface MetaPixelProviderProps {
  children: ReactNode;
}

interface PixelConfig {
  pixelId: string;
  accessToken?: string;
}

export const MetaPixelProvider = ({ children }: MetaPixelProviderProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [utmParams, setUtmParams] = useState<UTMParams>({});
  const [advancedMatchingData, setAdvancedMatchingData] = useState<AdvancedMatchingParams>({
    country: 'br', // Default to Brazil
    // client_user_agent removido - Meta captura automaticamente no browser pixel
  });
  const [debugStatus, setDebugStatus] = useState<PixelDebugStatus>({
    pixelIds: [],
    scriptInjected: false,
    scriptLoaded: false,
    scriptError: null,
    pendingEventsCount: 0,
  });
  
  // Queue for pending events (before fbq is ready)
  const pendingEventsRef = useRef<PendingEvent[]>([]);
  const [pendingEventsCount, setPendingEventsCount] = useState(0);

  // Capture Meta cookies on mount and update advanced matching data
  useEffect(() => {
    try {
      const { fbc, fbp } = getMetaCookies();
      if (fbc || fbp) {
        setAdvancedMatchingData(prev => ({
          ...prev,
          ...(fbc && { fbc }),
          ...(fbp && { fbp }),
        }));
        console.log('[META COOKIES] Cookies capturados e adicionados ao Advanced Matching');
      }
    } catch (error) {
      console.error('[META COOKIES] Erro ao capturar cookies:', error);
      // Continue without cookies - should not break the app
    }
  }, []);

  // Capture UTM params on mount and whenever URL changes
  useEffect(() => {
    // Capture from current URL first
    const currentParams = captureUTMParams();
    console.log('[UTM DEBUG] MetaPixelProvider - URL:', window.location.href);
    console.log('[UTM DEBUG] MetaPixelProvider - Params capturados:', currentParams);
    
    // Save to sessionStorage if we have params
    if (Object.keys(currentParams).length > 0) {
      saveUTMParams(currentParams);
    }
    
    // Get merged params (current + saved)
    const mergedParams = getUTMParams();
    console.log('[UTM DEBUG] MetaPixelProvider - Params finais:', mergedParams);
    
    setUtmParams(mergedParams);
  }, []);

  // Flush pending events when pixels are loaded
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && window.fbq && pendingEventsRef.current.length > 0) {
      console.log(`%c[PIXEL] Flushing ${pendingEventsRef.current.length} queued events`, 'background: orange; color: black; font-size: 14px;');
      
      pendingEventsRef.current.forEach(event => {
        const fbqMethod = event.type === 'standard' ? 'track' : 'trackCustom';
        
        if (event.advancedMatching && Object.keys(event.advancedMatching).length > 0) {
          window.fbq(fbqMethod, event.eventName, event.params || {}, { user_data: event.advancedMatching });
        } else {
          window.fbq(fbqMethod, event.eventName, event.params || {});
        }
        
        console.log(`%c[PIXEL] ✅ Flushed queued event: ${event.eventName}`, 'background: green; color: white;');
      });
      
      // Clear the queue
      pendingEventsRef.current = [];
      setPendingEventsCount(0);
      setDebugStatus(prev => ({ ...prev, pendingEventsCount: 0 }));
    }
  }, [isLoaded]);

  useEffect(() => {
    // Log immediately on mount
    console.log('%c[PIXEL DEBUG] MetaPixelProvider MOUNTED', 'background: blue; color: white; font-size: 14px;');
    console.log('%c[PIXEL DEBUG] Full URL: ' + window.location.href, 'color: blue;');
    
    const loadPixelConfig = async () => {
      // Timeout de 5 segundos para evitar travamento infinito
      const timeoutId = setTimeout(() => {
        console.warn('[PIXEL DEBUG] Timeout ao carregar configuração do pixel');
        setIsLoaded(true);
      }, 5000);

      try {
        // Get userId and pixel from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('u') || urlParams.get('user');
        const urlPixelParam = urlParams.get('pixel');
        
        console.log('%c[PIXEL DEBUG] userId:', 'color: green;', userId);
        console.log('%c[PIXEL DEBUG] urlPixelParam:', 'color: green;', urlPixelParam);

        // PRIORIDADE 1: Se pixel ID(s) foi passado na URL, usar SEMPRE (suporta múltiplos separados por vírgula)
        if (urlPixelParam) {
          const pixelIds = urlPixelParam.split(',').map(id => id.trim()).filter(id => /^\d+$/.test(id));
          
          if (pixelIds.length > 0) {
            console.log('%c[PIXEL DEBUG] ✅ PRIORITY: Initializing pixels from URL: ' + pixelIds.join(', '), 'background: green; color: white; font-size: 14px;');
            const pixelConfigs = pixelIds.map(pixelId => ({ pixelId }));
            initializePixels(pixelConfigs, true); // força inicialização
            clearTimeout(timeoutId);
            return;
          } else {
            console.log('%c[PIXEL DEBUG] ❌ No valid pixel IDs in URL param', 'background: red; color: white;');
          }
        } else {
          console.log('%c[PIXEL DEBUG] ❌ No pixel param in URL', 'background: red; color: white;');
        }

        // PRIORIDADE 2: Se o pixel já existe no window (site do usuário), usar ele
        if (window.fbq) {
          console.log('Facebook Pixel already exists from user site');
          clearTimeout(timeoutId);
          setIsLoaded(true);
          return;
        }

        // PRIORIDADE 3: Buscar do banco de dados
        const { data, error } = await supabase.functions.invoke('get-pixel-config', {
          body: { userId }
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.log('Pixel config not available:', error);
          setIsLoaded(true);
          return;
        }

        console.log('Pixel config response:', data);

        if (data?.pixels && Array.isArray(data.pixels) && data.pixels.length > 0) {
          initializePixels(data.pixels, false);
        } else {
          setIsLoaded(true);
        }
      } catch (error) {
        console.log('Failed to load pixel config:', error);
        setIsLoaded(true);
      }
    };

    loadPixelConfig();
  }, []);

  const initializePixels = (pixels: PixelConfig[], forceInit = false) => {
    // Se NÃO é forçado e pixel já existe, usar instância existente
    if (!forceInit && window.fbq) {
      console.log('Facebook Pixel already exists, using existing instance');
      setIsLoaded(true);
      return;
    }

    // Validate and sanitize pixel IDs
    const validPixels = pixels.filter(p => p.pixelId && /^\d+$/.test(p.pixelId));
    if (validPixels.length === 0) {
      console.log('No valid pixels found');
      setIsLoaded(true);
      return;
    }

    const pixelIdsList = validPixels.map(p => p.pixelId);
    console.log('%c[PIXEL DEBUG] 🚀 Initializing pixels (forceInit=' + forceInit + ')', 'background: purple; color: white; font-size: 14px;', validPixels);
    
    // Update debug status
    setDebugStatus(prev => ({ ...prev, pixelIds: pixelIdsList }));

    // Remove any existing fbq script to avoid conflicts
    const existingScript = document.querySelector('script[src*="fbevents.js"]');
    if (existingScript && forceInit) {
      console.log('Removing existing Facebook Pixel script');
      existingScript.remove();
    }

    // Create/reset fbq function
    const n = window.fbq = function() {
      // @ts-ignore
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    // @ts-ignore
    n.push = n;
    // @ts-ignore
    n.loaded = true;
    // @ts-ignore
    n.version = '2.0';
    // @ts-ignore
    n.queue = [];

    // Initialize all pixels immediately (events will be queued)
    validPixels.forEach(pixel => {
      window.fbq('init', pixel.pixelId);
      console.log('%c[PIXEL DEBUG] ✅ SUCCESS: fbq init called for pixel: ' + pixel.pixelId, 'background: green; color: white; font-size: 16px;');
    });

    // Load the actual Facebook script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    
    // Update debug status - script injected
    setDebugStatus(prev => ({ ...prev, scriptInjected: true }));
    
    script.onload = () => {
      console.log('%c[PIXEL DEBUG] 📄 fbevents.js loaded', 'background: green; color: white; font-size: 14px;');
      setDebugStatus(prev => ({ ...prev, scriptLoaded: true }));
    };
    
    // Handle script load error (blocked by ad-blocker, CSP, etc.)
    script.onerror = (error) => {
      console.error('%c[PIXEL DEBUG] ❌ fbevents.js BLOCKED or failed to load!', 'background: red; color: white; font-size: 16px;', error);
      setDebugStatus(prev => ({ 
        ...prev, 
        scriptError: 'Script blocked by ad-blocker, privacy extension, or network error'
      }));
    };
    
    document.head.appendChild(script);

    console.log('Pixel script injected - Ready for events');
    setIsLoaded(true);
  };

  // Function to set advanced matching data (call when user enters email/phone)
  const setAdvancedMatching = useCallback((params: AdvancedMatchingParams) => {
    setAdvancedMatchingData(prev => ({ ...prev, ...params }));
    console.log('Advanced Matching updated:', params);
  }, []);

  // Function to initialize pixels programmatically (for slug-based URLs)
  const initializeWithPixelIds = useCallback((pixelIds: string[]) => {
    if (!pixelIds || pixelIds.length === 0) {
      console.log('[PIXEL DEBUG] No pixel IDs provided for initialization');
      return;
    }
    const validPixelIds = pixelIds.filter(id => /^\d+$/.test(id));
    if (validPixelIds.length === 0) {
      console.log('[PIXEL DEBUG] No valid numeric pixel IDs');
      return;
    }
    console.log('%c[PIXEL DEBUG] 🎯 Initializing pixels programmatically: ' + validPixelIds.join(', '), 'background: orange; color: black; font-size: 14px;');
    const pixelConfigs = validPixelIds.map(pixelId => ({ pixelId }));
    initializePixels(pixelConfigs, true);
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => {
    // Merge advanced matching params
    const matchingData = { ...advancedMatchingData, ...advancedMatching };
    
    // Include UTM params and user data in all events
    // Automatically add currency: 'BRL' when value is present (fixes Meta Pixel currency error)
    const eventParams = { 
      ...params, 
      ...utmParams,
      // Add currency when value is present
      ...(params?.value && !params?.currency && { currency: 'BRL' }),
      // Use event_id from params for deduplication (passed from CAPI)
      ...(params?.event_id && { event_id: params.event_id })
    };
    
    // Check if fbq is ready
    if (typeof window !== 'undefined' && window.fbq) {
      // Use fbq with user_data for advanced matching
      if (Object.keys(matchingData).length > 0) {
        window.fbq('track', eventName, eventParams, { user_data: matchingData });
        console.log(`Pixel Event: ${eventName}`, eventParams, 'User Data:', matchingData);
      } else {
        window.fbq('track', eventName, eventParams);
        console.log(`Pixel Event: ${eventName}`, eventParams);
      }
    } else {
      // Queue the event for later
      console.log(`%c[PIXEL] Queuing event: ${eventName} (fbq not ready)`, 'background: yellow; color: black;');
      pendingEventsRef.current.push({
        type: 'standard',
        eventName,
        params: eventParams,
        advancedMatching: matchingData
      });
      setPendingEventsCount(pendingEventsRef.current.length);
      setDebugStatus(prev => ({ ...prev, pendingEventsCount: pendingEventsRef.current.length }));
    }
  }, [utmParams, advancedMatchingData]);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => {
    // Merge advanced matching params
    const matchingData = { ...advancedMatchingData, ...advancedMatching };
    
    // Include UTM params in all events
    // Automatically add currency: 'BRL' when value is present
    const eventParams = { 
      ...params, 
      ...utmParams,
      // Add currency when value is present
      ...(params?.value && !params?.currency && { currency: 'BRL' }),
      // Use event_id from params for deduplication (passed from CAPI)
      ...(params?.event_id && { event_id: params.event_id })
    };
    
    // Check if fbq is ready
    if (typeof window !== 'undefined' && window.fbq) {
      // Use fbq with user_data for advanced matching
      if (Object.keys(matchingData).length > 0) {
        window.fbq('trackCustom', eventName, eventParams, { user_data: matchingData });
        console.log(`Pixel Custom Event: ${eventName}`, eventParams, 'User Data:', matchingData);
      } else {
        window.fbq('trackCustom', eventName, eventParams);
        console.log(`Pixel Custom Event: ${eventName}`, eventParams);
      }
    } else {
      // Queue the event for later
      console.log(`%c[PIXEL] Queuing custom event: ${eventName} (fbq not ready)`, 'background: yellow; color: black;');
      pendingEventsRef.current.push({
        type: 'custom',
        eventName,
        params: eventParams,
        advancedMatching: matchingData
      });
      setPendingEventsCount(pendingEventsRef.current.length);
      setDebugStatus(prev => ({ ...prev, pendingEventsCount: pendingEventsRef.current.length }));
    }
  }, [utmParams, advancedMatchingData]);

  // Check for debug mode
  const showDebugPanel = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug_pixel') === '1';

  return (
    <MetaPixelContext.Provider value={{ trackEvent, trackCustomEvent, isLoaded, utmParams, setAdvancedMatching, initializeWithPixelIds, debugStatus }}>
      {showDebugPanel && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'monospace',
          zIndex: 99999,
          maxWidth: 320,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>🔍 Pixel Debug</div>
          <div style={{ marginBottom: 4 }}>
            <strong>Pixel IDs:</strong> {debugStatus.pixelIds.length > 0 ? debugStatus.pixelIds.join(', ') : '(none)'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>Script Injected:</strong> {debugStatus.scriptInjected ? '✅' : '❌'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>Script Loaded:</strong> {debugStatus.scriptLoaded ? '✅' : '❌'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>Pending Events:</strong> {debugStatus.pendingEventsCount}
          </div>
          {debugStatus.scriptError && (
            <div style={{ marginTop: 8, padding: 8, background: '#ff4444', borderRadius: 4 }}>
              <strong>⚠️ Error:</strong> {debugStatus.scriptError}
            </div>
          )}
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 10 }}>
            Add ?debug_pixel=1 to URL to show this panel
          </div>
        </div>
      )}
      {children}
    </MetaPixelContext.Provider>
  );
};
