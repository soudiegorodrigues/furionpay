import { useState, useEffect, lazy, Suspense, ComponentType } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

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

// Mapa de imports - cada modelo carrega APENAS seu componente
const POPUP_IMPORTS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  boost: () => import("@/components/DonationPopup").then(m => ({ default: m.DonationPopup })),
  simple: () => import("@/components/DonationPopupSimple").then(m => ({ default: m.DonationPopupSimple })),
  clean: () => import("@/components/DonationPopupClean").then(m => ({ default: m.DonationPopupClean })),
  direct: () => import("@/components/DonationPopupDirect").then(m => ({ default: m.DonationPopupDirect })),
  hot: () => import("@/components/DonationPopupHot").then(m => ({ default: m.DonationPopupHot })),
  landing: () => import("@/components/DonationPopupLanding").then(m => ({ default: m.DonationPopupLanding })),
  instituto: () => import("@/components/DonationPopupInstituto").then(m => ({ default: m.DonationPopupInstituto })),
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parâmetros da URL
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlModel = searchParams.get('m') || searchParams.get('model') || searchParams.get('popup');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // Valida modelo da URL
  const urlModelValid = urlModel && VALID_MODELS.includes(urlModel) ? urlModel : null;
  
  // Estados
  const [popupModel, setPopupModel] = useState<string | null>(urlModelValid);
  const [isLoaded, setIsLoaded] = useState(!!urlModelValid);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);
  
  // Componente lazy carregado dinamicamente - APENAS o modelo necessário
  const [LazyPopup, setLazyPopup] = useState<ComponentType<any> | null>(null);

  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);

  // Carrega o componente lazy APENAS quando o modelo é definido
  useEffect(() => {
    if (!popupModel) return;
    
    const loadComponent = async () => {
      const importFn = POPUP_IMPORTS[popupModel] || POPUP_IMPORTS.boost;
      const module = await importFn();
      setLazyPopup(() => module.default);
    };
    
    loadComponent();
  }, [popupModel]);

  // Busca configurações APENAS se não tiver modelo na URL
  useEffect(() => {
    // Se já tem modelo da URL, busca apenas extras
    if (urlModelValid) {
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
  }, [userId, urlAmount, urlModelValid]);

  // Sem userId = redireciona
  if (!userId) {
    return null;
  }

  // Aguarda carregar modelo E componente
  if (!isLoaded || !popupModel || !LazyPopup) {
    return <LoadingScreen />;
  }

  // Props baseadas no modelo
  const popupProps = {
    isOpen: true,
    onClose: () => {},
    userId,
    ...((['direct', 'hot', 'instituto'].includes(popupModel)) && { fixedAmount }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <LazyPopup {...popupProps} />
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;
