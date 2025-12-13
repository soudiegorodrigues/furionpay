import { useEffect, createContext, useContext, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams, captureUTMParams, saveUTMParams, UTMParams } from "@/lib/utm";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

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
}

interface MetaPixelContextType {
  trackEvent: (eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => void;
  trackCustomEvent: (eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => void;
  isLoaded: boolean;
  utmParams: UTMParams;
  setAdvancedMatching: (params: AdvancedMatchingParams) => void;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  trackEvent: () => {},
  trackCustomEvent: () => {},
  isLoaded: false,
  utmParams: {},
  setAdvancedMatching: () => {},
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
    country: 'br' // Default to Brazil
  });

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

  useEffect(() => {
    const loadPixelConfig = async () => {
      try {
        // Get userId from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('u') || urlParams.get('user');
        
        console.log('MetaPixelProvider: Loading pixel config for userId:', userId);

        const { data, error } = await supabase.functions.invoke('get-pixel-config', {
          body: { userId }
        });
        
        if (error) {
          console.log('Pixel config not available:', error);
          return;
        }

        console.log('Pixel config response:', data);

        if (data?.pixels && Array.isArray(data.pixels) && data.pixels.length > 0) {
          initializePixels(data.pixels);
        }
      } catch (error) {
        console.log('Failed to load pixel config:', error);
      }
    };

    loadPixelConfig();
  }, []);

  const initializePixels = (pixels: PixelConfig[]) => {
    // Se pixel já existe (carregado pelo site do usuário), usar instância existente
    if (window.fbq) {
      console.log('Facebook Pixel already exists, using existing instance');
      setIsLoaded(true);
      return;
    }

    if (pixels.length === 0) return;

    // Validate and sanitize pixel IDs
    const validPixels = pixels.filter(p => p.pixelId && /^\d+$/.test(p.pixelId));
    if (validPixels.length === 0) {
      console.log('No valid pixels found');
      return;
    }

    console.log('Initializing pixels:', validPixels);

    // Load Facebook Pixel base script
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    `;
    document.head.appendChild(script);

    // Initialize all pixels after base script loads
    setTimeout(() => {
      validPixels.forEach(pixel => {
        if (window.fbq) {
          window.fbq('init', pixel.pixelId);
          console.log('Initialized pixel:', pixel.pixelId);
        }
      });
      
      // PageView NÃO é disparado pelo FurionPay
      // O site do usuário dispara PageView, FurionPay dispara apenas:
      // - InitiateCheckout (quando popup abre)
      // - PixGenerated (quando gera PIX)
      // - Purchase (quando paga)
      console.log('Pixel initialized - PageView skipped (fired by user site)');
      
      setIsLoaded(true);
    }, 100);
  };

  // Function to set advanced matching data (call when user enters email/phone)
  const setAdvancedMatching = useCallback((params: AdvancedMatchingParams) => {
    setAdvancedMatchingData(prev => ({ ...prev, ...params }));
    console.log('Advanced Matching updated:', params);
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => {
    if (typeof window !== 'undefined' && window.fbq) {
      // Merge advanced matching params
      const matchingData = { ...advancedMatchingData, ...advancedMatching };
      
      // Include UTM params and user data in all events
      const eventParams = { 
        ...params, 
        ...utmParams,
        // Add external_id for deduplication
        ...(matchingData.external_id && { event_id: matchingData.external_id })
      };
      
      // Use fbq with user_data for advanced matching
      if (Object.keys(matchingData).length > 0) {
        window.fbq('track', eventName, eventParams, { user_data: matchingData });
        console.log(`Pixel Event: ${eventName}`, eventParams, 'User Data:', matchingData);
      } else {
        window.fbq('track', eventName, eventParams);
        console.log(`Pixel Event: ${eventName}`, eventParams);
      }
    }
  }, [utmParams, advancedMatchingData]);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>, advancedMatching?: AdvancedMatchingParams) => {
    if (typeof window !== 'undefined' && window.fbq) {
      // Merge advanced matching params
      const matchingData = { ...advancedMatchingData, ...advancedMatching };
      
      // Include UTM params in all events
      const eventParams = { 
        ...params, 
        ...utmParams,
        ...(matchingData.external_id && { event_id: matchingData.external_id })
      };
      
      // Use fbq with user_data for advanced matching
      if (Object.keys(matchingData).length > 0) {
        window.fbq('trackCustom', eventName, eventParams, { user_data: matchingData });
        console.log(`Pixel Custom Event: ${eventName}`, eventParams, 'User Data:', matchingData);
      } else {
        window.fbq('trackCustom', eventName, eventParams);
        console.log(`Pixel Custom Event: ${eventName}`, eventParams);
      }
    }
  }, [utmParams, advancedMatchingData]);

  return (
    <MetaPixelContext.Provider value={{ trackEvent, trackCustomEvent, isLoaded, utmParams, setAdvancedMatching }}>
      {children}
    </MetaPixelContext.Provider>
  );
};
