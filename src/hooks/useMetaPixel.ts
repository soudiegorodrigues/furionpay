import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const useMetaPixel = () => {
  const pixelInitialized = useRef(false);
  const pixelId = useRef<string | null>(null);

  useEffect(() => {
    const loadPixel = async () => {
      try {
        // Try to get pixel ID from localStorage cache first
        const cachedPixelId = localStorage.getItem('meta_pixel_id');
        
        if (cachedPixelId) {
          initializePixel(cachedPixelId);
        }

        // Fetch from database (requires no auth for public settings)
        const { data } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'meta_pixel_id')
          .single();

        // This will fail due to RLS, so we use a different approach
      } catch (error) {
        // Expected to fail - pixel will be loaded via edge function
      }
    };

    loadPixel();
  }, []);

  const initializePixel = useCallback((id: string) => {
    if (pixelInitialized.current || !id) return;

    pixelId.current = id;
    pixelInitialized.current = true;

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

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, params);
      console.log(`Meta Pixel: ${eventName}`, params);
    }
  }, []);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', eventName, params);
      console.log(`Meta Pixel Custom: ${eventName}`, params);
    }
  }, []);

  return {
    initializePixel,
    trackEvent,
    trackCustomEvent,
  };
};
