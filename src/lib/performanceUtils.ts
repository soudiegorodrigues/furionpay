/**
 * Utilitários de performance para checkout ultra-rápido
 */

// Cache de URLs de imagens já precarregadas
const preloadedImages = new Set<string>();
const preconnectedDomains = new Set<string>();

/**
 * Precarrega uma imagem com alta prioridade
 */
export function preloadImage(src: string | null | undefined, priority: 'high' | 'low' = 'high'): void {
  if (!src || typeof document === 'undefined') return;
  if (preloadedImages.has(src)) return;
  
  preloadedImages.add(src);
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.fetchPriority = priority;
  document.head.appendChild(link);
}

/**
 * Precarrega múltiplas imagens em paralelo
 */
export function preloadImages(sources: (string | null | undefined)[], priorityFirst = true): void {
  sources.forEach((src, index) => {
    if (src) {
      preloadImage(src, priorityFirst && index === 0 ? 'high' : 'low');
    }
  });
}

/**
 * Adiciona preconnect para um domínio externo
 */
export function preconnectDomain(url: string): void {
  if (typeof document === 'undefined') return;
  
  try {
    const domain = new URL(url).origin;
    if (domain === window.location.origin) return;
    if (preconnectedDomains.has(domain)) return;
    
    preconnectedDomains.add(domain);
    
    // Preconnect
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = domain;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
    
    // DNS Prefetch como fallback
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = domain;
    document.head.appendChild(dnsPrefetch);
  } catch {
    // URL inválida
  }
}

/**
 * Precarrega recursos críticos para o checkout
 */
export function preloadCheckoutResources(resources: {
  productImage?: string | null;
  headerLogo?: string | null;
  banners?: { image_url: string }[];
  videoUrl?: string | null;
}): void {
  // Imagens críticas com alta prioridade
  if (resources.productImage) {
    preloadImage(resources.productImage, 'high');
    preconnectDomain(resources.productImage);
  }
  
  if (resources.headerLogo) {
    preloadImage(resources.headerLogo, 'high');
    preconnectDomain(resources.headerLogo);
  }
  
  // Primeiro banner com alta prioridade, resto com baixa
  if (resources.banners && resources.banners.length > 0) {
    preloadImage(resources.banners[0].image_url, 'high');
    preconnectDomain(resources.banners[0].image_url);
    
    // Preload dos próximos banners com baixa prioridade
    resources.banners.slice(1, 3).forEach(banner => {
      preloadImage(banner.image_url, 'low');
    });
  }
  
  // Preconnect para domínios de vídeo
  if (resources.videoUrl) {
    if (resources.videoUrl.includes('youtube.com') || resources.videoUrl.includes('youtu.be')) {
      preconnectDomain('https://www.youtube.com');
      preconnectDomain('https://i.ytimg.com');
    } else if (resources.videoUrl.includes('vimeo.com')) {
      preconnectDomain('https://player.vimeo.com');
      preconnectDomain('https://i.vimeocdn.com');
    } else {
      preconnectDomain(resources.videoUrl);
    }
  }
}

/**
 * Marca recursos como já carregados no cache do navegador
 * Útil para otimizar navegação entre páginas
 */
export function prefetchPage(url: string): void {
  if (typeof document === 'undefined') return;
  
  const existing = document.querySelector(`link[href="${url}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Detecta conexão lenta e retorna true se deve reduzir qualidade
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (!connection) return false;
  
  // Conexão lenta: 2G, slow-2G, ou saveData ativado
  return connection.saveData || 
         connection.effectiveType === '2g' || 
         connection.effectiveType === 'slow-2g';
}

/**
 * Retorna URL otimizada para imagem baseado na conexão
 * Pode ser expandido para usar CDN com redimensionamento
 */
export function getOptimizedImageUrl(src: string, options?: {
  width?: number;
  quality?: number;
}): string {
  // Por enquanto retorna a URL original
  // Pode ser expandido para usar serviço de otimização de imagens
  return src;
}

/**
 * Registra métricas de performance (LCP, FCP, etc)
 */
export function trackPerformanceMetrics(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  
  // Only track in development, skip in production to reduce overhead
  if (process.env.NODE_ENV === 'production') return;
  
  try {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('[PERF] LCP:', Math.round(lastEntry.startTime), 'ms');
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const fidEntry = entry as PerformanceEventTiming;
        console.log('[PERF] FID:', Math.round(fidEntry.processingStart - fidEntry.startTime), 'ms');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('[PERF] CLS:', clsValue.toFixed(4));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch {
    // PerformanceObserver não suportado
  }
}
