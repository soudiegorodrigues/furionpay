import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { DonationPopupVakinha2 } from "@/components/DonationPopupVakinha2";
import { DonationPopupVakinha3 } from "@/components/DonationPopupVakinha3";
import { DonationPopupInstituto2 } from "@/components/DonationPopupInstituto2";
import { supabase } from "@/integrations/supabase/client";
import { captureUTMParams, saveUTMParams, getUTMParams, UTMParams } from "@/lib/utm";
import { trackOfferClick } from "@/lib/clickTracking";
import { usePixel } from "@/components/MetaPixelProvider";

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
  const navigate = useNavigate();
  const { initializeWithPixelIds } = usePixel();
  
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
  );
};

export default PublicCheckoutSlug;
