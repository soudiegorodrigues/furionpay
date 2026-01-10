import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { AdminLayoutWrapper } from "@/components/AdminLayoutWrapper";
import { DomainGuard } from "@/components/DomainGuard";
import { PixelDebugOverlay } from "@/components/PixelDebugOverlay";
import Index from "./pages/Index";
import AdminAuth from "./pages/AdminAuth";
import NotFound from "./pages/NotFound";

// Lazy load admin pages for code splitting
const Admin = lazy(() => import("./pages/Admin"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCheckout = lazy(() => import("./pages/AdminCheckout"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminIntegrations = lazy(() => import("./pages/AdminIntegrations"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminProductEdit = lazy(() => import("./pages/AdminProductEdit"));
const AdminFinanceiro = lazy(() => import("./pages/AdminFinanceiro"));
const AdminDocuments = lazy(() => import("./pages/AdminDocuments"));
const AdminGestaoFinanceira = lazy(() => import("./pages/AdminGestaoFinanceira"));
const AdminTemplates = lazy(() => import("./pages/AdminTemplates"));
const AdminColaboradores = lazy(() => import("./pages/AdminColaboradores"));
const AdminVendas = lazy(() => import("./pages/AdminVendas"));
const AdminUserDetail = lazy(() => import("./pages/AdminUserDetail"));
const PublicCheckout = lazy(() => import("./pages/PublicCheckout"));
const PublicCheckoutSlug = lazy(() => import("./pages/PublicCheckoutSlug"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Setup2FA = lazy(() => import("./pages/Setup2FA"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - garbage collection time
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Only retry once on failure
      refetchOnMount: false, // Don't refetch if data exists
    },
  },
});

// Minimal loading skeleton for lazy pages
const PageSkeleton = () => (
  <div className="min-h-screen bg-background animate-pulse">
    <div className="p-4 md:p-6 space-y-4">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-32 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <MetaPixelProvider>
          <PixelDebugOverlay />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<DomainGuard><AdminAuth /></DomainGuard>} />
              <Route path="/cadastro" element={<DomainGuard><AdminAuth /></DomainGuard>} />
              
              {/* 2FA Setup Page */}
              <Route path="/autenticador" element={
                <DomainGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Setup2FA />
                  </Suspense>
                </DomainGuard>
              } />
              {/* Redirect old URL to new one */}
              <Route path="/setup-2fa" element={<Navigate to="/autenticador" replace />} />
              
              {/* API Documentation - public page */}
              <Route path="/integration" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ApiDocs />
                </Suspense>
              } />
              {/* Redirect old URL to new one */}
              <Route path="/api-docs" element={<Navigate to="/integration" replace />} />
              
              {/* Admin routes with shared layout */}
              <Route path="/admin" element={<DomainGuard><AdminLayoutWrapper /></DomainGuard>}>
                <Route index element={
                  <Suspense fallback={<PageSkeleton />}>
                    <Admin />
                  </Suspense>
                } />
                <Route path="settings" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminSettings />
                  </Suspense>
                } />
                <Route path="dashboard" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <Route path="vendas" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminVendas />
                  </Suspense>
                } />
                <Route path="financeiro" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminFinanceiro />
                  </Suspense>
                } />
                <Route path="checkout" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminCheckout />
                  </Suspense>
                } />
                <Route path="profile" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminProfile />
                  </Suspense>
                } />
                <Route path="integrations" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminIntegrations />
                  </Suspense>
                } />
                <Route path="documents" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminDocuments />
                  </Suspense>
                } />
                <Route path="products" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminProducts />
                  </Suspense>
                } />
                <Route path="products/:id" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminProductEdit />
                  </Suspense>
                } />
                <Route path="gestao-financeira" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminGestaoFinanceira />
                  </Suspense>
                } />
                <Route path="templates" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminTemplates />
                  </Suspense>
                } />
                <Route path="colaboradores" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminColaboradores />
                  </Suspense>
                } />
                <Route path="usuarios/:id" element={
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminUserDetail />
                  </Suspense>
                } />
              </Route>
              
              {/* Short slug route for checkout offers - e.g. /c/jade2025 */}
              <Route path="/c/:slug" element={
                <Suspense fallback={<PageSkeleton />}>
                  <PublicCheckoutSlug />
                </Suspense>
              } />
              
              {/* Public checkout route - simplified URL without /checkout prefix - MUST be before catch-all */}
              <Route path="/:offerCode" element={
                <Suspense fallback={<PageSkeleton />}>
                  <PublicCheckout />
                </Suspense>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MetaPixelProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
