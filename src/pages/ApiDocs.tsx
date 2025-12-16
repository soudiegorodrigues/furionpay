import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Moon, Sun, Search, Command, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { ApiDocsSidebar } from '@/components/api-docs/ApiDocsSidebar';
import { ApiStatusBadge } from '@/components/api-docs/ApiStatusBadge';
import { SearchDialog } from '@/components/api-docs/SearchDialog';
import { IntroductionSection } from '@/components/api-docs/sections/IntroductionSection';
import { AuthenticationSection } from '@/components/api-docs/sections/AuthenticationSection';
import { EndpointsSection } from '@/components/api-docs/sections/EndpointsSection';
import { WebhooksSection } from '@/components/api-docs/sections/WebhooksSection';
import { CodeExamplesSection } from '@/components/api-docs/sections/CodeExamplesSection';
import { ErrorsSection } from '@/components/api-docs/sections/ErrorsSection';
import { RateLimitsSection } from '@/components/api-docs/sections/RateLimitsSection';
import { ChangelogSection } from '@/components/api-docs/sections/ChangelogSection';
import furionLogoWhite from '@/assets/furionpay-logo-white-text.png';
import furionLogoDark from '@/assets/furionpay-logo-dark-text.png';

const ApiDocs = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('introduction');
  const { theme, setTheme } = useTheme();

  const handleNavigate = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll spy
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
        'changelog',
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Search Dialog */}
      <SearchDialog 
        open={searchOpen} 
        onOpenChange={setSearchOpen} 
        onNavigate={handleNavigate}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden flex-shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src={theme === 'dark' ? furionLogoWhite : furionLogoDark} 
                alt="FurionPay" 
                className="h-7 sm:h-8"
              />
              <div className="hidden sm:flex items-center gap-2">
                <span className="h-5 w-px bg-border" />
                <span className="text-sm font-medium text-muted-foreground">API Docs</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                  v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <Button
            variant="outline"
            className="hidden sm:flex items-center gap-2 w-64 lg:w-80 justify-start text-muted-foreground font-normal h-9"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Pesquisar...</span>
            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <ApiStatusBadge className="hidden sm:inline-flex" />
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2" asChild>
              <a href="/admin/integrations" target="_blank" rel="noopener noreferrer">
                <span>Acessar Painel</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 py-8 max-h-[calc(100vh-5rem)] overflow-y-auto">
              <ApiDocsSidebar activeSection={activeSection} onNavigate={handleNavigate} />
            </div>
          </aside>

          {/* Sidebar - Mobile */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
                onClick={() => setSidebarOpen(false)} 
              />
              <aside className="fixed left-0 top-16 bottom-0 w-72 bg-background border-r border-border p-4 overflow-y-auto shadow-xl">
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
              <ChangelogSection />

              {/* Footer */}
              <footer className="pt-8 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-muted-foreground">
                  <p>© 2024 FurionPay. Todos os direitos reservados.</p>
                  <div className="flex items-center gap-4">
                    <a 
                      href="mailto:suporte@furionpay.com" 
                      className="hover:text-foreground transition-colors"
                    >
                      suporte@furionpay.com
                    </a>
                    <a 
                      href="#changelog" 
                      onClick={(e) => { e.preventDefault(); handleNavigate('changelog'); }}
                      className="hover:text-foreground transition-colors"
                    >
                      Changelog
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
