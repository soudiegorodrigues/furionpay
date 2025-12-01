import { useEffect } from "react";
import { DonationPopup } from "@/components/DonationPopup";
import { useDonationPopup } from "@/hooks/useDonationPopup";

const Index = () => {
  const { isOpen, openPopup, closePopup } = useDonationPopup({
    autoShowDelay: 500, // Abre quase imediatamente
    showOncePerSession: false, // Sempre mostra
  });

  // Abre automaticamente ao carregar
  useEffect(() => {
    openPopup();
  }, [openPopup]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <DonationPopup
        isOpen={isOpen}
        onClose={closePopup}
        recipientName="Davizinho"
      />
    </div>
  );
};

export default Index;
