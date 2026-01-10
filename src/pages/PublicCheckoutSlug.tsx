import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureUTMParams, saveUTMParams, getUTMParams, UTMParams } from "@/lib/utm";
import { trackOfferClick } from "@/lib/clickTracking";
import { usePixel } from "@/components/MetaPixelProvider";

// Lazy load popup components - only loads the one needed
const DonationPopup = lazy(() => import("@/components/DonationPopup").then(m => ({ default: m.DonationPopup })));
const DonationPopupSimple = lazy(() => import("@/components/DonationPopupSimple").then(m => ({ default: m.DonationPopupSimple })));
const DonationPopupClean = lazy(() => import("@/components/DonationPopupClean").then(m => ({ default: m.DonationPopupClean })));
const DonationPopupDirect = lazy(() => import("@/components/DonationPopupDirect").then(m => ({ default: m.DonationPopupDirect })));
const DonationPopupHot = lazy(() => import("@/components/DonationPopupHot").then(m => ({ default: m.DonationPopupHot })));
const DonationPopupLanding = lazy(() => import("@/components/DonationPopupLanding").then(m => ({ default: m.DonationPopupLanding })));
const DonationPopupInstituto = lazy(() => import("@/components/DonationPopupInstituto").then(m => ({ default: m.DonationPopupInstituto })));
const DonationPopupVakinha2 = lazy(() => import("@/components/DonationPopupVakinha2").then(m => ({ default: m.DonationPopupVakinha2 })));
const DonationPopupVakinha3 = lazy(() => import("@/components/DonationPopupVakinha3").then(m => ({ default: m.DonationPopupVakinha3 })));
const DonationPopupInstituto2 = lazy(() => import("@/components/DonationPopupInstituto2").then(m => ({ default: m.DonationPopupInstituto2 })));

// Ultra-fast skeleton that matches Instituto/Borboleta layout
const PopupSkeleton = () => (
  <div className="fixed inset-0 z-50 bg-white overflow-auto">
    <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Video skeleton */}
      <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg animate-pulse" />
      
      {/* Progress skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-pink-200 rounded animate-pulse" />
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-gradient-to-r from-cyan-300 to-green-300 animate-pulse" />
        </div>
      </div>
      
      {/* Title skeleton */}
      <div className="h-6 w-3/4 mx-auto bg-gray-200 rounded animate-pulse" />
      
      {/* Amount buttons skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className={`h-12 rounded-xl animate-pulse ${i === 2 || i === 3 ? 'bg-gradient-to-r from-pink-300 to-purple-300' : 'bg-pink-200'}`}
          />
        ))}
      </div>
      
      {/* Custom input skeleton */}
      <div className="h-14 bg-gray-100 border-2 border-pink-200 rounded-xl animate-pulse" />
      <div className="h-14 bg-gradient-to-r from-pink-300 to-purple-300 rounded-xl animate-pulse" />
      
      {/* Social proof skeleton */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <div className="flex -space-x-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 border-2 border-white animate-pulse" />
          ))}
        </div>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

interface OfferData {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  popup_model: string | null;
  product_name: string | null;
  meta_pixel_ids: string[] | null;
  video_url: string | null;
}

const PublicCheckoutSlug = () => {
  const { slug } = useParams<{ slug: string }>();
  const { initializeWithPixelIds, trackEvent } = usePixel();
  
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);
  
  // Prevent duplicate PageView firing
  const pageViewFiredRef = useRef(false);

  // Capture UTMs immediately
  useEffect(() => {
    const captured = captureUTMParams();
    if (Object.keys(captured).length > 0) {
      saveUTMParams(captured);
    }
    setUtmParams(getUTMParams());
  }, []);

  // Fetch offer by slug
  useEffect(() => {
    if (!slug) {
      setError("Slug não fornecido");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOffer = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_checkout_offer_by_slug', {
          p_slug: slug
        });

        if (cancelled) return;

        if (rpcError) {
          console.error('Error fetching offer by slug:', rpcError);
          setError("Erro ao carregar oferta");
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError("Oferta não encontrada");
          setIsLoading(false);
          return;
        }

        const offerData = data[0] as OfferData;
        setOffer(offerData);
        setIsLoading(false);

        // Track click
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && offerData.id) {
          trackOfferClick(offerData.id, supabaseUrl);
        }

        // Initialize Meta Pixels for this offer
        if (offerData.id && !cancelled) {
          try {
            const { data: pixelIds, error: pixelError } = await supabase.rpc('get_pixel_ids_for_offer', {
              p_offer_id: offerData.id
            });
            
            if (cancelled) return;
            
            if (!pixelError && pixelIds && pixelIds.length > 0) {
              console.log('%c[SLUG PAGE] ✅ Resolved pixel IDs: ' + pixelIds.join(', '), 'background: purple; color: white; font-size: 14px;');
              initializeWithPixelIds(pixelIds);
              
              // Fire PageView once after pixel initialization
              if (!pageViewFiredRef.current) {
                pageViewFiredRef.current = true;
                // Small delay to ensure fbq is configured
                setTimeout(() => {
                  console.log('%c[SLUG PAGE] 🎯 Firing PageView event', 'background: green; color: white; font-size: 14px;');
                  trackEvent('PageView');
                }, 100);
              }
            } else {
              console.log('%c[SLUG PAGE] ⚠️ No pixel IDs found for offer', 'background: orange; color: black;');
            }
          } catch (pixelErr) {
            console.error('[SLUG PAGE] Error fetching pixel IDs:', pixelErr);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error:', err);
          setError("Erro inesperado");
          setIsLoading(false);
        }
      }
    };

    fetchOffer();

    return () => {
      cancelled = true;
    };
  }, [slug, initializeWithPixelIds]);

  // Loading state - show specific skeleton for instant FCP
  if (isLoading) {
    return <PopupSkeleton />;
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">
            {error || "Oferta não encontrada"}
          </h1>
          <p className="text-muted-foreground">
            Verifique se o link está correto.
          </p>
        </div>
      </div>
    );
  }

  const popupModel = offer.popup_model || 'boost';
  const userId = offer.user_id;
  const offerId = offer.id;

  return (
    <Suspense fallback={<PopupSkeleton />}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {popupModel === 'simple' ? (
          <DonationPopupSimple
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'clean' ? (
          <DonationPopupClean
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'direct' ? (
          <DonationPopupDirect
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            fixedAmount={100}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'hot' ? (
          <DonationPopupHot
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            fixedAmount={100}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'landing' ? (
          <DonationPopupLanding
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'instituto' ? (
          <DonationPopupInstituto
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            fixedAmount={100}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'vakinha2' ? (
          <DonationPopupVakinha2
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'vakinha3' ? (
          <DonationPopupVakinha3
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : popupModel === 'instituto2' ? (
          <DonationPopupInstituto2
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            fixedAmount={100}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        ) : (
          <DonationPopup
            isOpen={true}
            onClose={() => {}}
            userId={userId}
            utmParams={utmParams || undefined}
            offerId={offerId}
          />
        )}
      </div>
    </Suspense>
  );
};

export default PublicCheckoutSlug;
