import { Button } from "@/components/ui/button";
import { DonationPopup } from "@/components/DonationPopup";
import { useDonationPopup } from "@/hooks/useDonationPopup";
import { Heart, Gift, Users, Shield } from "lucide-react";

const Index = () => {
  const { isOpen, openPopup, closePopup } = useDonationPopup({
    autoShowDelay: 3000, // Auto-show after 3 seconds
    showOncePerSession: true,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Heart className="w-4 h-4 fill-primary" />
              Campanha de Doação
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Ajude o{" "}
              <span className="text-primary">Davizinho</span>{" "}
              a realizar seu sonho
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Sua contribuição faz toda a diferença. Com sua ajuda, podemos transformar vidas e construir um futuro melhor.
            </p>
            <Button
              variant="donationCta"
              size="xl"
              onClick={openPopup}
              className="gap-2"
            >
              <Heart className="w-5 h-5" />
              Fazer uma Doação
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-2xl font-bold text-foreground md:text-3xl">
              Por que doar?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<Gift className="w-8 h-8" />}
                title="100% Direto"
                description="Todo valor arrecadado vai diretamente para o beneficiário, sem intermediários."
              />
              <FeatureCard
                icon={<Shield className="w-8 h-8" />}
                title="Seguro"
                description="Pagamento via PIX com toda segurança e praticidade que você precisa."
              />
              <FeatureCard
                icon={<Users className="w-8 h-8" />}
                title="Transparente"
                description="Acompanhe o progresso da campanha e veja o impacto da sua doação."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              Pronto para ajudar?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Qualquer valor faz diferença. Doe agora e faça parte dessa história.
            </p>
            <Button
              variant="donationCta"
              size="xl"
              onClick={openPopup}
              className="gap-2"
            >
              <Heart className="w-5 h-5" />
              Doar Agora via PIX
            </Button>
          </div>
        </div>
      </section>

      {/* Donation Popup */}
      <DonationPopup
        isOpen={isOpen}
        onClose={closePopup}
        recipientName="Davizinho"
      />
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="rounded-xl bg-card border border-border p-6 text-center transition-all hover:shadow-lg hover:border-primary/20">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
      {icon}
    </div>
    <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;
