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
  
  // Redireciona para admin se não houver userId
  useEffect(() => {
    if (!userId) {
      navigate('/admin', { replace: true });
    }
  }, [userId, navigate]);
  
  // Estado de loading até buscar as configurações - popupModel inicia como null para evitar flash
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
          // Se não houver dados, usa boost como fallback
          setPopupModel('boost');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        // Em caso de erro, usa boost como fallback
        setPopupModel('boost');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
  }

  // Mostra loading enquanto busca configurações ou popupModel ainda não foi definido
  if (isLoading || !popupModel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
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