import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import Index from "./pages/Index";
import AdminAuth from "./pages/AdminAuth";
import Admin from "./pages/Admin";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCheckout from "./pages/AdminCheckout";
import AdminPersonalization from "./pages/AdminPersonalization";
import AdminEmail from "./pages/AdminEmail";
import AdminProfile from "./pages/AdminProfile";
import AdminPopupEditor from "./pages/AdminPopupEditor";
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
              <Route path="/admin/login" element={<AdminAuth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/checkout" element={<AdminCheckout />} />
              <Route path="/admin/personalization" element={<AdminPersonalization />} />
              <Route path="/admin/email" element={<AdminEmail />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/popup-editor" element={<AdminPopupEditor />} />
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
