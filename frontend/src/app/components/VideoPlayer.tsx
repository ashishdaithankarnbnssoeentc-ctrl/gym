import { X, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayer({ videoUrl, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const currentVideo = videoRef.current;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // ESC key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    // Try to play after video loads
    const handleCanPlay = () => {
      if (currentVideo) {
        currentVideo.play().catch(() => {
          // Autoplay prevented - user needs to click play
          setIsLoading(false);
        });
      }
    };

    if (currentVideo) {
      currentVideo.addEventListener('canplay', handleCanPlay);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
      
      if (currentVideo) {
        currentVideo.removeEventListener('canplay', handleCanPlay);
        currentVideo.pause();
        currentVideo.src = '';
      }
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl mx-4 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-orange-500 transition-colors z-50 bg-black/50 hover:bg-black/70 rounded-full p-2"
          aria-label="Close video player"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Title */}
        <div className="mb-4">
          <h3 className="text-white text-xl md:text-2xl">{title}</h3>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
          {/* Loading State */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-white text-lg">Loading video...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center max-w-md mx-4">
                <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                <h4 className="text-white text-2xl mb-3">Video Unavailable</h4>
                <p className="text-white/70 mb-6">
                  Unable to load this video. Please try again later or check your internet connection.
                </p>
                <button
                  onClick={onClose}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg transition-colors"
                >
                  Close Player
                </button>
              </div>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            controls
            controlsList="nodownload"
            className="w-full h-full bg-black"
            playsInline
            preload="auto"
            onLoadedData={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={(e) => {
              // Video error - fallback to error state
              setHasError(true);
              setIsLoading(false);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadStart={() => setIsLoading(true)}
          >
            <source 
              src={videoUrl} 
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            Press ESC or click outside to close • Click play button if video doesn't autostart
          </p>
        </div>
      </div>
    </div>
  );
}