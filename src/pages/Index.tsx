import { useState, useEffect } from "react";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { SocialProofNotification } from "@/components/SocialProofNotification";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [socialProofEnabled, setSocialProofEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-popup-model');

        if (error) {
          console.error('Error fetching settings:', error);
          setPopupModel('boost');
        } else {
          setPopupModel(data?.model || 'boost');
          setSocialProofEnabled(data?.socialProofEnabled || false);
        }
      } catch (err) {
        console.error('Error:', err);
        setPopupModel('boost');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
