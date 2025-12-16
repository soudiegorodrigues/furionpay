import { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { ApiDocsSidebar } from '@/components/api-docs/ApiDocsSidebar';
import { IntroductionSection } from '@/components/api-docs/sections/IntroductionSection';
import { AuthenticationSection } from '@/components/api-docs/sections/AuthenticationSection';
import { EndpointsSection } from '@/components/api-docs/sections/EndpointsSection';
import { WebhooksSection } from '@/components/api-docs/sections/WebhooksSection';
import { CodeExamplesSection } from '@/components/api-docs/sections/CodeExamplesSection';
import { ErrorsSection } from '@/components/api-docs/sections/ErrorsSection';
import { RateLimitsSection } from '@/components/api-docs/sections/RateLimitsSection';
import furionLogoWhite from '@/assets/furionpay-logo-white-text.png';
import furionLogoDark from '@/assets/furionpay-logo-dark-text.png';

const ApiDocs = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('introduction');
  const { theme, setTheme } = useTheme();

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'introduction',
        'authentication',
        'endpoints',
        'create-pix',
        'check-status',
        'webhooks',
        'code-examples',
        'errors',
        'rate-limits',
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src={theme === 'dark' ? furionLogoWhite : furionLogoDark} 
                alt="FurionPay" 
                className="h-8"
              />
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                API Reference
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/integrations" target="_blank" rel="noopener noreferrer">
                Acessar Painel
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 py-8">
              <ApiDocsSidebar activeSection={activeSection} onNavigate={handleNavigate} />
            </div>
          </aside>

          {/* Sidebar - Mobile */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
              <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background border-r border-border p-4 overflow-y-auto">
                <ApiDocsSidebar activeSection={activeSection} onNavigate={handleNavigate} />
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0 py-8 lg:py-12">
            <div className="max-w-3xl space-y-16">
              <IntroductionSection />
              <AuthenticationSection />
              <EndpointsSection />
              <WebhooksSection />
              <CodeExamplesSection />
              <ErrorsSection />
              <RateLimitsSection />

              {/* Footer */}
              <footer className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
                <p>© 2024 FurionPay. Todos os direitos reservados.</p>
                <p className="mt-2">
                  Precisa de ajuda? Entre em contato com{' '}
                  <a href="mailto:suporte@furionpay.com" className="text-primary hover:underline">
                    suporte@furionpay.com
                  </a>
                </p>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
