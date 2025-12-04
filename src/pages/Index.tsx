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
  
  // Inicia com valores padrão para renderização instantânea
  const [popupModel, setPopupModel] = useState<string>('boost');
  const [fixedAmount, setFixedAmount] = useState<number>(urlAmount ? parseFloat(urlAmount) : 100);

  useEffect(() => {
    // Busca configurações em background sem bloquear a renderização
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
  }, [userId]);

  // Não renderiza nada se não houver userId (vai redirecionar)
  if (!userId) {
    return null;
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
    </div>
  );
};

export default Index;