import { useEffect, createContext, useContext, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  trackEvent: () => {},
  trackCustomEvent: () => {},
  isLoaded: false,
});

export const usePixel = () => useContext(MetaPixelContext);

interface MetaPixelProviderProps {
  children: ReactNode;
}

export const MetaPixelProvider = ({ children }: MetaPixelProviderProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPixelConfig = async () => {
      try {
        // Call edge function to get pixel ID
        const { data, error } = await supabase.functions.invoke('get-pixel-config');
        
        if (error) {
          console.log('Pixel config not available:', error);
          return;
        }

        if (data?.pixelId) {
          initializePixel(data.pixelId);
        }
      } catch (error) {
        console.log('Failed to load pixel config:', error);
      }
    };

    loadPixelConfig();
  }, []);

  const initializePixel = (id: string) => {
    if (!id || window.fbq) return;

    // Load Facebook Pixel script
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
      fbq('init', '${id}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    setIsLoaded(true);
  };

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, params);
    }
  }, []);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', eventName, params);
    }
  }, []);

  return (
    <MetaPixelContext.Provider value={{ trackEvent, trackCustomEvent, isLoaded }}>
      {children}
    </MetaPixelContext.Provider>
  );
};
