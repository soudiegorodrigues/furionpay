import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

// Import all popup components directly (no lazy loading)
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";

// Versão para debug - se você ver V6, o código novo está ativo
const CODE_VERSION = "V6";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // Ref para garantir que o modelo foi carregado antes de renderizar qualquer popup
  const modelLoadedRef = useRef(false);
  
  // Estado de loading - começa null para garantir que nada seja renderizado até ter dados
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  // Log para debug
  console.log(`[Index ${CODE_VERSION}] popupModel:`, popupModel, "modelLoaded:", modelLoadedRef.current);

  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);

  // Busca configurações do usuário
  useEffect(() => {
    // Reset ao montar
    modelLoadedRef.current = false;
    setPopupModel(null);
    
    const fetchSettings = async () => {
      if (!userId) return;
      
      console.log(`[Index ${CODE_VERSION}] Fetching settings for userId:`, userId);
      
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        console.log(`[Index ${CODE_VERSION}] Response:`, data, error);

        if (!error && data && data.model) {
          modelLoadedRef.current = true;
          setPopupModel(data.model);
          setSocialProofEnabled(data.socialProofEnabled || false);
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        } else {
          modelLoadedRef.current = true;
          setPopupModel('boost');
        }
      } catch (err) {
        console.error(`[Index ${CODE_VERSION}] Error:`, err);
        modelLoadedRef.current = true;
        setPopupModel('boost');
      }
    };

    fetchSettings();
  }, [userId, urlAmount]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
  }

  // CRÍTICO: Mostra loading até o modelo ser carregado da API
  // Verifica AMBOS: popupModel não ser null E ref confirmar que foi carregado
  if (!popupModel || !modelLoadedRef.current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-muted-foreground text-sm">Carregando... {CODE_VERSION}</div>
        </div>
      </div>
    );
  }

  // Renderiza o popup correto SOMENTE quando modelo foi carregado
  const renderPopup = () => {
    console.log(`[Index ${CODE_VERSION}] Rendering popup:`, popupModel);
    
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
      {renderPopup()}
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;
