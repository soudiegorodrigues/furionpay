import { useState, useRef } from "react";
import { Play } from "lucide-react";

interface CustomVideoPlayerProps {
  videoUrl: string;
  className?: string;
}

export function CustomVideoPlayer({ videoUrl, className }: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');

  const handlePlayClick = () => {
    if (videoRef.current) {
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

  // YouTube embed with hidden controls
  if (isYouTube) {
    const embedUrl = videoUrl
      .replace('watch?v=', 'embed/')
      .replace('youtu.be/', 'youtube.com/embed/');
    const separator = embedUrl.includes('?') ? '&' : '?';
    const finalUrl = `${embedUrl}${separator}controls=0&showinfo=0&rel=0&modestbranding=1`;
    
    return (
      <div className={className}>
        <iframe
          src={finalUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
          loading="lazy"
        />
      </div>
    );
  }

  // Vimeo embed with hidden controls
  if (isVimeo) {
    const embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/');
    const separator = embedUrl.includes('?') ? '&' : '?';
    const finalUrl = `${embedUrl}${separator}controls=0&title=0&byline=0&portrait=0`;
    
    return (
      <div className={className}>
        <iframe
          src={finalUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Video"
          loading="lazy"
        />
      </div>
    );
  }

  // Custom video player for direct video files
  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
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
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          aria-label="Play video"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <Play className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900 ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
