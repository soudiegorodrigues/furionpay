import { useState, useEffect } from "react";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  // Inicia com valores padrão para renderização instantânea
  const [popupModel, setPopupModel] = useState<string>('boost');
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);

  useEffect(() => {
    // Busca configurações em background sem bloquear a renderização
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model');

        if (!error && data) {
          setPopupModel(data.model || 'boost');
          setSocialProofEnabled(data.socialProofEnabled || false);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {popupModel === 'simple' ? (
        <DonationPopupSimple
          isOpen={true}
          onClose={() => {}}
          recipientName="Davizinho"
        />
      ) : (
        <DonationPopup
          isOpen={true}
          onClose={() => {}}
          recipientName="Davizinho"
        />
      )}
      
      <SocialProofNotification enabled={socialProofEnabled} />
    </div>
  );
};

export default Index;
