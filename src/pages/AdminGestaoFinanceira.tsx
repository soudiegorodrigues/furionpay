import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { FinanceCategories } from "@/components/finance/FinanceCategories";
import { FinanceTransactions } from "@/components/finance/FinanceTransactions";
import { FinanceGoals } from "@/components/finance/FinanceGoals";

const AdminGestaoFinanceira = () => {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Controle suas receitas, despesas, investimentos e metas financeiras
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2 py-3">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Transações</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 py-3">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2 py-3">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <FinanceDashboard />
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
