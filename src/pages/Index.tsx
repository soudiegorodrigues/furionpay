import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { DonationPopupVakinha2 } from "@/components/DonationPopupVakinha2";
import { DonationPopupVakinha3 } from "@/components/DonationPopupVakinha3";
import { supabase } from "@/integrations/supabase/client";
import { captureUTMParams, saveUTMParams, getUTMParams, UTMParams } from "@/lib/utm";
import { trackOfferClick } from "@/lib/clickTracking";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  // Lê o modelo da URL para evitar flash - PRIORIDADE MÁXIMA
  const urlModel = searchParams.get('m') || searchParams.get('model');
  // Offer ID for click tracking
  const offerId = searchParams.get('o') || searchParams.get('offer_id');
  // Debug mode
  const debugClick = searchParams.get('debug_click') === '1';
  
  // Estado para UTMs capturados
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);
  // Debug state
  const [clickDebugInfo, setClickDebugInfo] = useState<{ status: string; details?: any } | null>(null);
  
  // Track offer click when page loads - every open = 1 click
  useEffect(() => {
    if (!offerId) return;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('[Index] Missing VITE_SUPABASE_URL');
      return;
    }

    // Track the click
    trackOfferClick(offerId, supabaseUrl).then((result) => {
      if (debugClick) {
        setClickDebugInfo({ 
          status: result.success ? 'success' : 'error', 
          details: { ...result, offerId } 
        });
      }
      console.log('[Index] Click tracked:', result);
    });
  }, [offerId, debugClick]);
  
  // Captura UTMs IMEDIATAMENTE ao carregar a página
  useEffect(() => {
    console.log('[UTM DEBUG] Index.tsx - URL completa:', window.location.href);
    console.log('[UTM DEBUG] Index.tsx - Search params:', window.location.search);
    console.log('[UTM DEBUG] Index.tsx - Referrer:', document.referrer);
    
    const captured = captureUTMParams();
    console.log('[UTM DEBUG] Index.tsx - UTMs capturados:', captured);
    
    if (Object.keys(captured).length > 0) {
      saveUTMParams(captured);
    }
    
    const finalUtms = getUTMParams();
    console.log('[UTM DEBUG] Index.tsx - UTMs finais:', finalUtms);
    setUtmParams(finalUtms);
  }, []);
  
  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);
  
  // Usa o modelo da URL se disponível, senão usa 'boost' como fallback temporário
  const [popupModel, setPopupModel] = useState<string>(urlModel || 'boost');
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  useEffect(() => {
    // Se já temos o modelo da URL, não precisa buscar do banco
    if (urlModel) {
      console.log('Using URL model:', urlModel);
      return;
    }
    
    // Busca configurações em background apenas se não tiver modelo na URL
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        if (!error && data) {
          setPopupModel(data.model || 'boost');
          // Só usa o valor das configurações se não tiver valor na URL
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, [userId, urlModel, urlAmount]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Debug panel for click tracking */}
      {debugClick && clickDebugInfo && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 text-white p-4 text-sm font-mono">
          <div className="max-w-xl mx-auto">
            <div className="font-bold text-green-400 mb-2">🔍 Click Tracking Debug</div>
            <div>Offer ID: <span className="text-yellow-400">{offerId}</span></div>
            <div>Status: <span className={clickDebugInfo.status === 'success' ? 'text-green-400' : 'text-orange-400'}>{clickDebugInfo.status}</span></div>
            {clickDebugInfo.details && (
              <pre className="mt-2 text-xs overflow-auto max-h-32 bg-gray-800 p-2 rounded">
                {JSON.stringify(clickDebugInfo.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
      {popupModel === 'simple' ? (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'clean' ? (
        <DonationPopupClean
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'direct' ? (
        <DonationPopupDirect
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'hot' ? (
        <DonationPopupHot
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'landing' ? (
        <DonationPopupLanding
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'instituto' ? (
        <DonationPopupInstituto
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'vakinha2' ? (
        <DonationPopupVakinha2
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : popupModel === 'vakinha3' ? (
        <DonationPopupVakinha3
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      ) : (
        <DonationPopup
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
          offerId={offerId || undefined}
        />
      )}
    </div>
  );
};

export default Index;