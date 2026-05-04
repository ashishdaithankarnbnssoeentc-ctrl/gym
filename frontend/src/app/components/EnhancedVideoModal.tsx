/**
 * EnhancedVideoModal - Production-Grade YouTube Video Modal
 * Replaces the old VideoModal with robust error handling
 *
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';
import { X, ExternalLink, Youtube, Share2, Heart, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { InstantVideoPlayer } from './InstantVideoPlayer';
import { VideoErrorBoundary } from './VideoErrorBoundary';

export interface EnhancedVideoModalProps {
  /** YouTube video ID or URL */
  videoId: string;

  /** Video title */
  title: string;

  /** Creator/channel name */
  creator: string;

  /** Channel URL */
  channelUrl: string;

  /** Direct video URL */
  videoUrl: string;

  /** Video duration (e.g., "20 min") */
  duration?: string;

  /** Category (e.g., "HIIT", "Cardio") */
  category?: string;

  /** Difficulty level */
  level?: string;

  /** Video description */
  description?: string;

  /** Tags */
  tags?: string[];

  /** Close callback */
  onClose: () => void;

  /** Validate video before showing (slower but safer) */
  validateVideo?: boolean;
}

export function EnhancedVideoModal({
  videoId,
  title,
  creator,
  channelUrl,
  videoUrl,
  duration,
  category,
  level,
  description,
  tags,
  onClose,
  validateVideo = false,
}: EnhancedVideoModalProps) {
  const currentYear = new Date().getFullYear();
  const [playerError, setPlayerError] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative w-full max-w-5xl bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 hover:scale-110 group"
          aria-label="Close video"
        >
          <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Video player - Strict validation with fallback + Error Boundary */}
        <div className="relative w-full">
          <VideoErrorBoundary videoId={videoId} videoUrl={videoUrl}>
            <InstantVideoPlayer
              videoId={videoId}
              title={title}
              autoplay={true}
            />
          </VideoErrorBoundary>
        </div>

        {/* Video info section */}
        <div className="p-6 bg-gradient-to-b from-zinc-900 to-zinc-800">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-white text-2xl mb-2">{title}</h3>
              {description && (
                <p className="text-white/60 text-sm leading-relaxed">{description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {duration && (
                <Badge variant="secondary" className="bg-white/10 text-white border-0">
                  {duration}
                </Badge>
              )}
              {category && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                  {category}
                </Badge>
              )}
              {level && (
                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
                  {level}
                </Badge>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white/70 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Creator attribution */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="text-white/70 text-sm">Created by</span>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-400 transition-colors font-medium text-sm underline"
            >
              {creator}
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/30"
            >
              <Play className="w-4 h-4 mr-2 fill-white" />
              Watch on YouTube
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(channelUrl, '_blank', 'noopener,noreferrer')}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Youtube className="w-4 h-4 mr-2" />
              Visit Channel
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}&feature=share`, '_blank', 'noopener,noreferrer')}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener,noreferrer')}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Heart className="w-4 h-4 mr-2" />
              Like
            </Button>
          </div>

          {/* Error notice */}
          {playerError && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm">
                ⚠️ If the video doesn't play above, click "Watch on YouTube" to view it directly.
              </p>
            </div>
          )}

          {/* Copyright notice */}
          <p className="text-white/40 text-xs mt-6 pt-4 border-t border-white/10">
            © {currentYear} {creator}. Video embedded from YouTube with proper attribution. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
