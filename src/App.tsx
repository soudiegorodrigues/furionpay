import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { AdminLayoutWrapper } from "@/components/AdminLayoutWrapper";
import Index from "./pages/Index";
import AdminAuth from "./pages/AdminAuth";
import Admin from "./pages/Admin";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCheckout from "./pages/AdminCheckout";
import AdminProfile from "./pages/AdminProfile";
import AdminIntegrations from "./pages/AdminIntegrations";
import AdminProducts from "./pages/AdminProducts";
import AdminProductEdit from "./pages/AdminProductEdit";
import PublicCheckout from "./pages/PublicCheckout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <MetaPixelProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<AdminAuth />} />
              <Route path="/cadastro" element={<AdminAuth />} />
              
              {/* Public checkout route */}
              <Route path="/checkout/:offerCode" element={<PublicCheckout />} />
              
              {/* Admin routes with shared layout */}
              <Route path="/admin" element={<AdminLayoutWrapper />}>
                <Route index element={<Admin />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="checkout" element={<AdminCheckout />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="integrations" element={<AdminIntegrations />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<AdminProductEdit />} />
              </Route>
              
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
