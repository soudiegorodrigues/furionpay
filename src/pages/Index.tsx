import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { supabase } from "@/integrations/supabase/client";
import { captureUTMParams, saveUTMParams, getUTMParams, UTMParams } from "@/lib/utm";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  // Lê o modelo da URL para evitar flash - PRIORIDADE MÁXIMA
  const urlModel = searchParams.get('m') || searchParams.get('model');
  
  // Estado para UTMs capturados
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);
  
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

  // Redireciona imediatamente se não houver userId
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {popupModel === 'simple' ? (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
        />
      ) : popupModel === 'clean' ? (
        <DonationPopupClean
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
        />
      ) : popupModel === 'direct' ? (
        <DonationPopupDirect
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
        />
      ) : popupModel === 'hot' ? (
        <DonationPopupHot
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
        />
      ) : popupModel === 'landing' ? (
        <DonationPopupLanding
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
        />
      ) : popupModel === 'instituto' ? (
        <DonationPopupInstituto
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
          utmParams={utmParams || undefined}
        />
      ) : (
        <DonationPopup
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          utmParams={utmParams || undefined}
        />
      )}
    </div>
  );
};

export default Index;