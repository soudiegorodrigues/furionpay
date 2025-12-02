import { useState, useEffect } from "react";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [popupModel, setPopupModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopupModel = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'popup_model')
          .maybeSingle();

        if (error) {
          console.error('Error fetching popup model:', error);
          setPopupModel('boost');
        } else {
          setPopupModel(data?.value || 'boost');
        }
      } catch (err) {
        console.error('Error:', err);
        setPopupModel('boost');
      } finally {
        setLoading(false);
      }
    };

    fetchPopupModel();
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
    </div>
  );
};

export default Index;
