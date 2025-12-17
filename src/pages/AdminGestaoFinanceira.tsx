import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Target, 
  PieChart,
  Wallet,
  Building2
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { FinanceCategories } from "@/components/finance/FinanceCategories";
import { FinanceTransactions } from "@/components/finance/FinanceTransactions";
import { FinanceGoals } from "@/components/finance/FinanceGoals";
import { FinanceAccounts } from "@/components/finance/FinanceAccounts";
import { FinanceReportGenerator } from "@/components/finance/FinanceReportGenerator";

const AdminGestaoFinanceira = () => {
  const { user } = useAdminAuth();
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Permission check
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_financeiro')) {
    return <AccessDenied message="Você não tem permissão para acessar a Gestão Financeira." />;
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Controle suas receitas, despesas, investimentos e metas financeiras
          </p>
        </div>
        <FinanceReportGenerator />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Transações</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <FinanceDashboard />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <FinanceAccounts />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <FinanceTransactions />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <FinanceCategories />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <FinanceGoals />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGestaoFinanceira;
