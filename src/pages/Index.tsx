import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

// Lazy load all popup components - they won't be loaded until needed
const DonationPopup = lazy(() => import("@/components/DonationPopup").then(m => ({ default: m.DonationPopup })));
const DonationPopupSimple = lazy(() => import("@/components/DonationPopupSimple").then(m => ({ default: m.DonationPopupSimple })));
const DonationPopupClean = lazy(() => import("@/components/DonationPopupClean").then(m => ({ default: m.DonationPopupClean })));
const DonationPopupDirect = lazy(() => import("@/components/DonationPopupDirect").then(m => ({ default: m.DonationPopupDirect })));
const DonationPopupHot = lazy(() => import("@/components/DonationPopupHot").then(m => ({ default: m.DonationPopupHot })));
const DonationPopupLanding = lazy(() => import("@/components/DonationPopupLanding").then(m => ({ default: m.DonationPopupLanding })));
const DonationPopupInstituto = lazy(() => import("@/components/DonationPopupInstituto").then(m => ({ default: m.DonationPopupInstituto })));

// Loading component
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
  
  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);
  
  // Estado de loading até buscar as configurações
  const [isLoading, setIsLoading] = useState(true);
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        if (!error && data) {
          setPopupModel(data.model || 'boost');
          setSocialProofEnabled(data.socialProofEnabled || false);
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        } else {
          setPopupModel('boost');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setPopupModel('boost');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId, urlAmount]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
  }

  // Mostra loading enquanto busca configurações
  if (isLoading || !popupModel) {
    return <LoadingScreen />;
  }

  // Renderiza o popup correto com Suspense para lazy loading
  const renderPopup = () => {
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
      default:
        return <DonationPopup isOpen={true} onClose={() => {}} userId={userId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Suspense fallback={<LoadingScreen />}>
        {renderPopup()}
      </Suspense>
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;
