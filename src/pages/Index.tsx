import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

// LAZY LOAD - componentes SÓ carregam quando necessários
const DonationPopup = lazy(() => import("@/components/DonationPopup").then(m => ({ default: m.DonationPopup })));
const DonationPopupSimple = lazy(() => import("@/components/DonationPopupSimple").then(m => ({ default: m.DonationPopupSimple })));
const DonationPopupClean = lazy(() => import("@/components/DonationPopupClean").then(m => ({ default: m.DonationPopupClean })));
const DonationPopupDirect = lazy(() => import("@/components/DonationPopupDirect").then(m => ({ default: m.DonationPopupDirect })));
const DonationPopupHot = lazy(() => import("@/components/DonationPopupHot").then(m => ({ default: m.DonationPopupHot })));
const DonationPopupLanding = lazy(() => import("@/components/DonationPopupLanding").then(m => ({ default: m.DonationPopupLanding })));
const DonationPopupInstituto = lazy(() => import("@/components/DonationPopupInstituto").then(m => ({ default: m.DonationPopupInstituto })));

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <div className="text-muted-foreground text-sm">Carregando...</div>
    </div>
  </div>
);

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // IMPORTANTE: Começa como null - NÃO tem valor default
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);

  // Busca configurações - SEM FALLBACK PARA BOOST
  useEffect(() => {
    let isMounted = true;
    
    const fetchSettings = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        if (!isMounted) return;

        if (!error && data && data.model) {
          setPopupModel(data.model);
          setSocialProofEnabled(data.socialProofEnabled || false);
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        }
        // NÃO define fallback - se não tiver modelo, fica em loading
      } catch (err) {
        console.error('Error fetching settings:', err);
        // NÃO define fallback
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    fetchSettings();
    
    return () => { isMounted = false; };
  }, [userId, urlAmount]);

  // Sem userId = redireciona
  if (!userId) {
    return null;
  }

  // NÃO carregou ainda = loading
  if (!isLoaded) {
    return <LoadingScreen />;
  }

  // Carregou mas sem modelo definido = loading (não vai para boost!)
  if (!popupModel) {
    return <LoadingScreen />;
  }

  // SOMENTE renderiza o popup quando temos modelo definido
  const PopupComponent = () => {
    switch (popupModel) {
      case 'simple':
        return <DonationPopupSimple isOpen={true} onClose={() => {}} userId={userId} />;
      case 'clean':
        return <DonationPopupClean isOpen={true} onClose={() => {}} userId={userId} />;
      case 'direct':
        return <DonationPopupDirect isOpen={true} onClose={() => {}} userId={userId} fixedAmount={fixedAmount} />;
      case 'hot':
        return <DonationPopupHot isOpen={true} onClose={() => {}} userId={userId} fixedAmount={fixedAmount} />;
      case 'landing':
        return <DonationPopupLanding isOpen={true} onClose={() => {}} userId={userId} />;
      case 'instituto':
        return <DonationPopupInstituto isOpen={true} onClose={() => {}} userId={userId} fixedAmount={fixedAmount} />;
      case 'boost':
        return <DonationPopup isOpen={true} onClose={() => {}} userId={userId} />;
      default:
        // Se modelo desconhecido, mostra simple como fallback seguro
        return <DonationPopupSimple isOpen={true} onClose={() => {}} userId={userId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Suspense fallback={<LoadingScreen />}>
        <PopupComponent />
      </Suspense>
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;
