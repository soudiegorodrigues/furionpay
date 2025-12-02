import { useEffect, createContext, useContext, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams, UTMParams } from "@/lib/utm";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface MetaPixelContextType {
  trackEvent: (eventName: string, params?: Record<string, any>) => void;
  trackCustomEvent: (eventName: string, params?: Record<string, any>) => void;
  isLoaded: boolean;
  utmParams: UTMParams;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  trackEvent: () => {},
  trackCustomEvent: () => {},
  isLoaded: false,
  utmParams: {},
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

  // Capture UTM params on mount
  useEffect(() => {
    const params = getUTMParams();
    setUtmParams(params);
    console.log('UTM params captured:', params);
  }, []);

  useEffect(() => {
    const loadPixelConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-pixel-config');
        
        if (error) {
          console.log('Pixel config not available:', error);
          return;
        }

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
    if (pixels.length === 0 || window.fbq) return;

    // Validate and sanitize pixel IDs
    const validPixels = pixels.filter(p => p.pixelId && /^\d+$/.test(p.pixelId));
    if (validPixels.length === 0) return;

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
        }
      });
      
      // Track PageView for all pixels
      if (window.fbq) {
        window.fbq('track', 'PageView');
      }
      
      setIsLoaded(true);
    }, 100);
  };

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      // Include UTM params in all events
      const eventParams = { ...params, ...utmParams };
      window.fbq('track', eventName, eventParams);
      console.log(`Pixel Event: ${eventName}`, eventParams);
    }
  }, [utmParams]);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      // Include UTM params in all events
      const eventParams = { ...params, ...utmParams };
      window.fbq('trackCustom', eventName, eventParams);
      console.log(`Pixel Custom Event: ${eventName}`, eventParams);
    }
  }, [utmParams]);

  return (
    <MetaPixelContext.Provider value={{ trackEvent, trackCustomEvent, isLoaded, utmParams }}>
      {children}
    </MetaPixelContext.Provider>
  );
};
