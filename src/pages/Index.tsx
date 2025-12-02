import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('u') || searchParams.get('user');
  
  // Inicia com valores padrão para renderização instantânea
  const [popupModel, setPopupModel] = useState<string>('boost');
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);

  useEffect(() => {
    // Busca configurações em background sem bloquear a renderização
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model', {
          body: { userId }
        });

        if (!error && data) {
          setPopupModel(data.model || 'boost');
          setSocialProofEnabled(data.socialProofEnabled || false);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {popupModel === 'simple' ? (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => {}}
          recipientName="Davizinho"
          userId={userId || undefined}
        />
      ) : popupModel === 'clean' ? (
        <DonationPopupClean
          isOpen={true}
          onClose={() => {}}
          recipientName="Davizinho"
          userId={userId || undefined}
        />
      ) : (
        <DonationPopup
          isOpen={true}
          onClose={() => {}}
          recipientName="Davizinho"
          userId={userId || undefined}
        />
      )}
      
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;