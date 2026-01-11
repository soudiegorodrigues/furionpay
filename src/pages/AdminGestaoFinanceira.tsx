import { useState, lazy, Suspense, memo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Target, 
  PieChart,
  Wallet,
  Building2,
  BarChart3
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load all tab components for faster initial render
const FinanceDashboard = lazy(() => import("@/components/finance/FinanceDashboard").then(m => ({ default: m.FinanceDashboard })));
const FinanceCategories = lazy(() => import("@/components/finance/FinanceCategories").then(m => ({ default: m.FinanceCategories })));
const FinanceTransactions = lazy(() => import("@/components/finance/FinanceTransactions").then(m => ({ default: m.FinanceTransactions })));
const FinanceGoals = lazy(() => import("@/components/finance/FinanceGoals").then(m => ({ default: m.FinanceGoals })));
const FinanceAccounts = lazy(() => import("@/components/finance/FinanceAccounts").then(m => ({ default: m.FinanceAccounts })));
const FinanceReportGenerator = lazy(() => import("@/components/finance/FinanceReportGenerator").then(m => ({ default: m.FinanceReportGenerator })));
const FinanceProductMetrics = lazy(() => import("@/components/finance/FinanceProductMetrics").then(m => ({ default: m.FinanceProductMetrics })));

// Lightweight tab skeleton for instant feedback
const TabSkeleton = memo(() => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
));

TabSkeleton.displayName = 'TabSkeleton';

const AdminGestaoFinanceira = () => {
  const { user, loading: authLoading } = useAdminAuth();
  const { permissions, isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const effectiveUserId = permissions?.owner_id ?? user?.id;
  const [activeTab, setActiveTab] = useState("dashboard");

  // Show minimal skeleton only during auth check
  if (authLoading || permissionsLoading) {
    return (
      <div className="p-4 md:p-8 lg:p-10 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Permission check (only after loading is complete)
  if (!isOwner && !hasPermission('can_manage_financeiro')) {
    return <AccessDenied message="Você não tem permissão para acessar a Gestão Financeira." />;
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Controle suas receitas, despesas, investimentos e metas financeiras
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-32" />}>
          <FinanceReportGenerator userId={effectiveUserId} />
        </Suspense>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
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
          <TabsTrigger value="metrics" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Métricas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceDashboard userId={effectiveUserId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceAccounts userId={effectiveUserId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceTransactions userId={effectiveUserId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceCategories userId={effectiveUserId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceGoals userId={effectiveUserId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Suspense fallback={<TabSkeleton />}>
            <FinanceProductMetrics userId={effectiveUserId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGestaoFinanceira;
