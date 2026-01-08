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

export const registerServiceWorker = async () => {
  // Só registra o Service Worker em domínios permitidos
  if (!isAllowedPWADomain()) {
    console.log('[PWA] Domain not allowed for PWA, skipping SW registration:', window.location.hostname);
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
