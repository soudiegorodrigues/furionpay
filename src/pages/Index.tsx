import { DonationPopup } from "@/components/DonationPopup";

const Index = () => {
  // Popup sempre aberto - é a única interface da página
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <DonationPopup
        isOpen={true}
        onClose={() => {}} // Não fecha - é a página principal
        recipientName="Davizinho"
      />
    </div>
  );
};

export default Index;
