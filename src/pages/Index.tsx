import { useState, useEffect } from "react";
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

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('u') || searchParams.get('user');
  const urlAmount = searchParams.get('amount') || searchParams.get('valor');
  
  // Estado de loading - começa TRUE e só muda quando temos o modelo
  const [isReady, setIsReady] = useState(false);
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);

  // Busca configurações do usuário
  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        if (!error && data && data.model) {
          setPopupModel(data.model);
          setSocialProofEnabled(data.socialProofEnabled || false);
          if (!urlAmount && data.fixedAmount) {
            setFixedAmount(data.fixedAmount);
          }
        } else {
          // Fallback para boost se não houver modelo definido
          setPopupModel('boost');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setPopupModel('boost');
      } finally {
        // Marca como pronto SOMENTE depois de ter o modelo
        setIsReady(true);
      }
    };

    fetchSettings();
  }, [userId, urlAmount]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
  }

  // CRÍTICO: Não renderiza NADA até estar pronto
  if (!isReady || !popupModel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-muted-foreground text-sm">Carregando...</div>
        </div>
      </div>
    );
  }

  // Renderiza o popup correto SOMENTE quando isReady E popupModel estão definidos
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
