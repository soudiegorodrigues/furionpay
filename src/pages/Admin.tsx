import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminNavigation } from "@/components/AdminNavigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { PersonalizacaoSection } from "@/components/admin/PersonalizacaoSection";
import { EmailSection } from "@/components/admin/EmailSection";
import { CheckoutGlobalSection } from "@/components/admin/CheckoutGlobalSection";
import { FaturamentoSection } from "@/components/admin/FaturamentoSection";
import { TransacoesGlobaisSection } from "@/components/admin/TransacoesGlobaisSection";
import { RankingSection } from "@/components/admin/RankingSection";
import { DominiosSection } from "@/components/admin/DominiosSection";
import { UsuariosSection } from "@/components/admin/UsuariosSection";
import { MultiAcquirersSection } from "@/components/admin/MultiAcquirersSection";
import { ZonaDePerigo } from "@/components/admin/ZonaDePerigo";
import { TaxasSection } from "@/components/admin/TaxasSection";
import { SaquesGlobaisSection } from "@/components/admin/SaquesGlobaisSection";
import { DocumentosSection } from "@/components/admin/DocumentosSection";
import { UTMDebugSection } from "@/components/admin/UTMDebugSection";

const Admin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<string>(() => {
    const state = location.state as { section?: string } | null;
    return state?.section || "faturamento";
  });

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  // Show nothing while checking or if not admin
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminNavigation activeSection={activeSection} onSectionChange={setActiveSection} />

      {activeSection === "faturamento" && <FaturamentoSection />}
      {activeSection === "transacoes" && <TransacoesGlobaisSection />}
      {activeSection === "ranking" && <RankingSection />}
      {activeSection === "dominios" && <DominiosSection />}
      {activeSection === "multi" && <MultiAcquirersSection />}
      {activeSection === "usuarios" && <UsuariosSection />}
      {activeSection === "zona-perigo" && <ZonaDePerigo />}
      {activeSection === "checkout-global" && <CheckoutGlobalSection />}
      {activeSection === "saques" && <SaquesGlobaisSection />}
      {activeSection === "documentos" && <DocumentosSection />}
      {activeSection === "personalizacao" && <PersonalizacaoSection userId={user?.id} />}
      {activeSection === "email" && <EmailSection />}
      {activeSection === "taxas" && <TaxasSection />}
      {activeSection === "utm-debug" && <UTMDebugSection />}
    </div>
  );
};

export default Admin;
