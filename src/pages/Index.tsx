import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // DEBUG: Log inicial
  console.log('[DEBUG Index] Component mounted - userId:', userId, 'urlAmount:', urlAmount);
  
  // Redireciona para admin se não houver userId
  useEffect(() => {
    console.log('[DEBUG Index] Redirect useEffect - userId:', userId);
    if (!userId) {
      console.log('[DEBUG Index] No userId, redirecting to /admin');
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);
  
  // Estado de loading até buscar as configurações - popupModel inicia como null para evitar flash
  const [isLoading, setIsLoading] = useState(true);
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  // DEBUG: Log estado atual
  console.log('[DEBUG Index] Current state - isLoading:', isLoading, 'popupModel:', popupModel);

  useEffect(() => {
    console.log('[DEBUG Index] fetchSettings useEffect triggered - userId:', userId);
    
    const fetchSettings = async () => {
      console.log('[DEBUG Index] fetchSettings START');
      try {
        console.log('[DEBUG Index] Calling get-popup-model function...');
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        console.log('[DEBUG Index] get-popup-model response - data:', data, 'error:', error);

        if (!error && data) {
          console.log('[DEBUG Index] Setting popupModel to:', data.model || 'boost');
          setPopupModel(data.model || 'boost');
          setSocialProofEnabled(data.socialProofEnabled || false);
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        } else {
          console.log('[DEBUG Index] No data or error, setting popupModel to boost');
          setPopupModel('boost');
        }
      } catch (err) {
        console.error('[DEBUG Index] Error fetching settings:', err);
        setPopupModel('boost');
      } finally {
        console.log('[DEBUG Index] fetchSettings COMPLETE, setting isLoading to false');
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  // DEBUG: Log antes do render
  console.log('[DEBUG Index] RENDER - userId:', userId, 'isLoading:', isLoading, 'popupModel:', popupModel);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    console.log('[DEBUG Index] RENDER: No userId, returning null');
    return null;
  }

  // Mostra loading enquanto busca configurações ou popupModel ainda não foi definido
  if (isLoading || !popupModel) {
    console.log('[DEBUG Index] RENDER: Loading state - isLoading:', isLoading, 'popupModel:', popupModel);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-muted-foreground text-sm">Carregando...</div>
        </div>
      </div>
    );
  }

  console.log('[DEBUG Index] RENDER: Showing popup model:', popupModel);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {popupModel === 'simple' ? (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
        />
      ) : popupModel === 'clean' ? (
        <DonationPopupClean
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
        />
      ) : popupModel === 'direct' ? (
        <DonationPopupDirect
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
        />
      ) : popupModel === 'hot' ? (
        <DonationPopupHot
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
        />
      ) : popupModel === 'landing' ? (
        <DonationPopupLanding
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
        />
      ) : popupModel === 'instituto' ? (
        <DonationPopupInstituto
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
          fixedAmount={fixedAmount}
        />
      ) : (
        <DonationPopup
          isOpen={true}
          onClose={() => {}}
          userId={userId || undefined}
        />
      )}
      
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;