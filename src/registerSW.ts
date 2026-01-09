// Lista de domínios onde o PWA deve funcionar
const ALLOWED_PWA_DOMAINS = [
  "app.furionpay.com",
  "localhost",
  "127.0.0.1",
];

const isAllowedPWADomain = (): boolean => {
  const hostname = window.location.hostname;
  return ALLOWED_PWA_DOMAINS.some(domain => hostname === domain) ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com");
};

// Kill switch: remove SW e limpa caches em domínios não permitidos
const killServiceWorkerAndCaches = async () => {
  const CLEANUP_FLAG = '__sw_cleanup_done__';
  
  // Evita loop infinito de reload
  if (sessionStorage.getItem(CLEANUP_FLAG)) {
    console.log('[PWA] Cleanup já foi feito nesta sessão, pulando...');
    return;
  }

  let needsReload = false;

  // 1. Remove todos os Service Workers registrados
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log(`[PWA] Encontrados ${registrations.length} Service Worker(s) em domínio não permitido. Removendo...`);
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[PWA] Service Worker removido:', registration.scope);
        }
        needsReload = true;
      }
    } catch (error) {
      console.error('[PWA] Erro ao remover Service Workers:', error);
    }
  }

  // 2. Limpa todo o Cache Storage
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        console.log(`[PWA] Encontrados ${cacheNames.length} cache(s). Limpando...`);
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('[PWA] Cache removido:', cacheName);
        }
        needsReload = true;
      }
    } catch (error) {
      console.error('[PWA] Erro ao limpar caches:', error);
    }
  }

  // 3. Recarrega a página uma única vez para aplicar a limpeza
  if (needsReload) {
    console.log('[PWA] Limpeza concluída. Recarregando página...');
    sessionStorage.setItem(CLEANUP_FLAG, 'true');
    window.location.reload();
  }
};

export const registerServiceWorker = async () => {
  // Em domínios não permitidos: remover SW e caches antigos
  if (!isAllowedPWADomain()) {
    console.log('[PWA] Domínio não permitido para PWA:', window.location.hostname);
    await killServiceWorkerAndCaches();
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      // Auto-update check with immediate activation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - activate immediately
              console.log('[PWA] New version available, activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // Listen for controller change and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed, reloading page...');
        window.location.reload();
      });

      // Periodically check for updates (every 60 seconds)
      setInterval(() => {
        registration.update().catch(err => console.log('[PWA] Update check failed:', err));
      }, 60000);
      
      console.log('[PWA] Service Worker registered successfully');
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
};
