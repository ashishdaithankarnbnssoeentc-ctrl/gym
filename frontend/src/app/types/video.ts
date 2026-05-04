/**
 * Clean Video Model - Single Source of Truth
 * All videos passing through this interface are guaranteed valid
 */

export type VideoSource = "youtube" | "cdn";

export interface CleanVideo {
  /** Unique identifier - ALWAYS valid */
  id: string;

  /** Video source type */
  source: VideoSource;

  /** Validated YouTube video ID (11 characters, alphanumeric + dash/underscore) */
  videoId: string;

  /** Video title */
  title: string;

  /** Creator/channel name */
  creator: string;

  /** Channel URL */
  channelUrl: string;

  /** Duration in minutes */
  duration: number;

  /** Duration string for display (e.g., "20 min") */
  durationDisplay: string;

  /** Validated thumbnail URL */
  thumbnail: string;

  /** Difficulty level */
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

  /** Category */
  category: 'HIIT' | 'Strength' | 'Cardio' | 'Abs' | 'Yoga' | 'Boxing' | 'Pilates';

  /** Tags for filtering */
  tags: string[];

  /** Optional description */
  description?: string;

  /** Whether this is a free video */
  isFree?: boolean;

  /** Pre-validated playability flag */
  playable: boolean;

  /** Original URL (for reference) */
  originalUrl: string;
}

/**
 * Raw video data from external sources (untrusted)
 */
export interface RawVideoData {
  id?: string;
  videoId?: string;
  url?: string;
  videoUrl?: string;
  title?: string;
  creator?: string;
  channelUrl?: string;
  duration?: string | number;
  level?: string;
  category?: string;
  tags?: string[];
  description?: string;
  isFree?: boolean;
  thumbnailUrl?: string;
}
