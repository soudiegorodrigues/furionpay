import { useState, useRef, useEffect, memo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
}

/**
 * Componente de imagem otimizado para performance máxima
 * - Lazy loading nativo com IntersectionObserver para browsers antigos
 * - Placeholder blur enquanto carrega
 * - Preconnect automático para domínios externos
 * - Fadeout suave quando carrega
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Preconnect para domínios externos
  useEffect(() => {
    if (!src) return;
    try {
      const url = new URL(src);
      if (url.origin !== window.location.origin) {
        const existingPreconnect = document.querySelector(`link[href="${url.origin}"]`);
        if (!existingPreconnect) {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = url.origin;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
      }
    } catch {
      // URL inválida, ignorar
    }
  }, [src]);

  // IntersectionObserver para lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Começar a carregar 200px antes de entrar na tela
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Blur placeholder baseado na cor dominante aproximada
  const blurDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+';

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder blur */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            backgroundSize: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      
      {/* Imagem real */}
      {(isInView || priority) && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ willChange: 'opacity' }}
        />
      )}
    </div>
  );
});

/**
 * Componente para vídeos otimizados
 * - Lazy loading para iframes
 * - Placeholder enquanto carrega
 * - Suporte a YouTube, Vimeo e vídeos diretos
 */
interface OptimizedVideoProps {
  src: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

export const OptimizedVideo = memo(function OptimizedVideo({
  src,
  className = '',
  autoplay = false,
  muted = true,
}: OptimizedVideoProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');
  const isEmbed = isYouTube || isVimeo;

  const getEmbedUrl = () => {
    if (isYouTube) {
      let videoId = '';
      if (src.includes('youtu.be/')) {
        videoId = src.split('youtu.be/')[1]?.split('?')[0];
      } else if (src.includes('watch?v=')) {
        videoId = src.split('watch?v=')[1]?.split('&')[0];
      } else if (src.includes('embed/')) {
        videoId = src.split('embed/')[1]?.split('?')[0];
      }
      const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        ...(autoplay ? { autoplay: '1', mute: '1' } : {}),
      });
      return `https://www.youtube.com/embed/${videoId}?${params}`;
    }
    if (isVimeo) {
      const videoId = src.split('vimeo.com/')[1]?.split('?')[0];
      const params = new URLSearchParams({
        ...(autoplay ? { autoplay: '1', muted: '1' } : {}),
      });
      return `https://player.vimeo.com/video/${videoId}?${params}`;
    }
    return src;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-900 ${className}`}
    >
      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {isInView && (
        isEmbed ? (
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <video
            src={src}
            className="w-full h-full object-cover"
            controls
            playsInline
            autoPlay={autoplay}
            muted={muted}
            preload="metadata"
            onLoadedData={() => setIsLoaded(true)}
          />
        )
      )}
    </div>
  );
});
