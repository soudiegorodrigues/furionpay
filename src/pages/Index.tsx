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

// Modelos válidos
const VALID_MODELS = ['boost', 'simple', 'clean', 'direct', 'hot', 'landing', 'instituto'];

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parâmetros da URL
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlModel = searchParams.get('m') || searchParams.get('model') || searchParams.get('popup');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // Se o modelo vem da URL, usa diretamente (sem fetch)
  // Se não vem, busca do banco (fallback para compatibilidade)
  const [popupModel, setPopupModel] = useState<string | null>(
    urlModel && VALID_MODELS.includes(urlModel) ? urlModel : null
  );
  const [isLoaded, setIsLoaded] = useState(!!urlModel && VALID_MODELS.includes(urlModel));
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);

  // Busca configurações APENAS se não tiver modelo na URL
  useEffect(() => {
    // Se já tem modelo da URL, não precisa buscar
    if (urlModel && VALID_MODELS.includes(urlModel)) {
      // Ainda busca social proof e fixed amount se necessário
      const fetchExtras = async () => {
        if (!userId) return;
        try {
          const { data, error } = await supabase.functions.invoke('get-popup-model', {
            body: { userId }
          });
          if (!error && data) {
            setSocialProofEnabled(data.socialProofEnabled || false);
            if (!urlAmount && data.fixedAmount) {
              setFixedAmount(data.fixedAmount);
            }
          }
        } catch (err) {
          console.error('Error fetching extras:', err);
        }
      };
      fetchExtras();
      return;
    }

    // Se não tem modelo na URL, busca do banco
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
        } else {
          setPopupModel('boost');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setPopupModel('boost');
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    fetchSettings();
    
    return () => { isMounted = false; };
  }, [userId, urlAmount, urlModel]);

  // Sem userId = redireciona
  if (!userId) {
    return null;
  }

  // NÃO carregou ainda = loading
  if (!isLoaded || !popupModel) {
    return <LoadingScreen />;
  }

  // Renderiza o popup baseado no modelo
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
      default:
        return <DonationPopup isOpen={true} onClose={() => {}} userId={userId} />;
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
