import { useState, useRef, memo } from "react";
import { Play } from "lucide-react";

interface CustomVideoPlayerProps {
  videoUrl: string;
  className?: string;
  posterUrl?: string;
  playOverlayUrl?: string;
}

/**
 * Lite video embed - shows poster + play button, loads iframe only on click
 * This prevents YouTube/Vimeo iframes from blocking LCP
 */
export const CustomVideoPlayer = memo(function CustomVideoPlayer({ 
  videoUrl, 
  className, 
  posterUrl,
  playOverlayUrl
}: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');

  // Extract YouTube video ID for thumbnail
  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^?&]+)/);
    return match ? match[1] : null;
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (videoId: string): string => {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  };

  const handlePlayClick = () => {
    if (isYouTube || isVimeo) {
      setIframeLoaded(true);
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  // YouTube - Lite embed pattern
  if (isYouTube) {
    const videoId = getYouTubeId(videoUrl);
    const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : posterUrl;
    
    // Build embed URL with autoplay when loaded
    const embedUrl = videoUrl
      .replace('watch?v=', 'embed/')
      .replace('youtu.be/', 'youtube.com/embed/');
    const separator = embedUrl.includes('?') ? '&' : '?';
    const finalUrl = `${embedUrl}${separator}autoplay=1&controls=1&rel=0&modestbranding=1`;
    
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: '16/9' }}>
        {!iframeLoaded ? (
          <>
            {/* Thumbnail poster */}
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {/* Play button overlay */}
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Play video"
            >
              {playOverlayUrl ? (
                <img 
                  src={playOverlayUrl} 
                  alt="Play" 
                  className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl hover:scale-105 transition-transform bg-transparent"
                />
              ) : (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-red-600 flex items-center justify-center shadow-xl hover:bg-red-700 hover:scale-105 transition-all">
                  <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white fill-white ml-1" />
                </div>
              )}
            </button>
          </>
        ) : (
          <iframe
            src={finalUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        )}
      </div>
    );
  }

  // Vimeo - Lite embed pattern
  if (isVimeo) {
    const embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/');
    const separator = embedUrl.includes('?') ? '&' : '?';
    const finalUrl = `${embedUrl}${separator}autoplay=1&title=0&byline=0&portrait=0`;
    
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: '16/9' }}>
        {!iframeLoaded ? (
          <>
            {/* Poster or placeholder for Vimeo */}
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="text-white/50 text-sm">Vimeo Video</div>
              )}
            </div>
            {/* Play button overlay */}
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Play video"
            >
              {playOverlayUrl ? (
                <img 
                  src={playOverlayUrl} 
                  alt="Play" 
                  className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl hover:scale-105 transition-transform bg-transparent"
                />
              ) : (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-[#1ab7ea] flex items-center justify-center shadow-xl hover:bg-[#139eca] hover:scale-105 transition-all">
                  <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white fill-white ml-1" />
                </div>
              )}
            </button>
          </>
        ) : (
          <iframe
            src={finalUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        )}
      </div>
    );
  }

  // Custom video player for direct video files
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        preload="metadata"
        className="w-full h-full object-cover cursor-pointer"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      
      {/* Central Play Button */}
      {!isPlaying && (
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
          aria-label="Play video"
        >
          {playOverlayUrl ? (
            <img 
              src={playOverlayUrl} 
              alt="Play" 
              className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl hover:scale-105 transition-transform bg-transparent"
            />
          ) : (
            <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-red-600 flex items-center justify-center shadow-xl hover:bg-red-700 hover:scale-105 transition-all">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white fill-white ml-1" />
            </div>
          )}
        </button>
      )}
    </div>
  );
});
