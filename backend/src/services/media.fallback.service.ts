/**
 * Media Fallback Service
 * 
 * Provides fallback responses to eliminate console noise
 * Returns 200 with fallback assets instead of 404s
 */

import { Request, Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';

interface FallbackResponse {
  status: 'fallback';
  fallback: boolean;
  thumbnail?: string;
  video?: string;
  message: string;
  originalUrl?: string;
}

class MediaFallbackService {
  private fallbackThumbnailBase64: string;
  private fallbackVideoUrl: string;

  constructor() {
    // Pre-load fallback thumbnail (base64 encoded placeholder)
    this.fallbackThumbnailBase64 = this.getDefaultThumbnailBase64();
    this.fallbackVideoUrl = '/assets/fallback-video.mp4';
  }

  /**
   * Get default thumbnail as base64
   */
  private getDefaultThumbnailBase64(): string {
    // Simple gray placeholder thumbnail
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
  }

  /**
   * Return fallback thumbnail response (200 status, no console error)
   */
  getFallbackThumbnailResponse(videoId: string, originalUrl?: string): FallbackResponse {
    return {
      status: 'fallback',
      fallback: true,
      thumbnail: this.fallbackThumbnailBase64,
      message: 'Thumbnail unavailable, using fallback',
      originalUrl
    };
  }

  /**
   * Return fallback video response (200 status, no console error)
   */
  getFallbackVideoResponse(videoId: string, originalUrl?: string): FallbackResponse {
    return {
      status: 'fallback',
      fallback: true,
      video: this.fallbackVideoUrl,
      message: 'Video unavailable, using fallback',
      originalUrl
    };
  }

  /**
   * Send fallback thumbnail as image response
   */
  sendFallbackThumbnail(res: Response, videoId: string, originalUrl?: string): void {
    // Set headers for image response
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache
      'X-Fallback': 'true',
      'X-Video-ID': videoId
    });

    // Send base64 image as buffer
    const base64Data = this.fallbackThumbnailBase64.replace(/^data:image\/jpeg;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    res.send(imageBuffer);
  }

  /**
   * Send fallback video response as JSON
   */
  sendFallbackVideo(res: Response, videoId: string, originalUrl?: string): void {
    res.json({
      status: 'fallback',
      fallback: true,
      videoUrl: this.fallbackVideoUrl,
      videoId,
      message: 'Video unavailable, using fallback',
      originalUrl,
      available: false
    });
  }

  /**
   * Check if a URL should use fallback (based on known problematic sources)
   */
  shouldUseFallback(url: string): boolean {
    const problematicSources = [
      'cdn.pixabay.com',
      'img.youtube.com',
      'i.ytimg.com'
    ];

    return problematicSources.some(source => url.includes(source));
  }

  /**
   * Create custom fallback for specific error types
   */
  createCustomFallback(errorType: string, videoId: string, originalUrl?: string): FallbackResponse {
    const baseResponse = {
      status: 'fallback' as const,
      fallback: true,
      message: '',
      originalUrl
    };

    switch (errorType) {
      case '404':
        return {
          ...baseResponse,
          thumbnail: this.fallbackThumbnailBase64,
          message: 'Media not found, using fallback'
        };
      
      case 'timeout':
        return {
          ...baseResponse,
          thumbnail: this.fallbackThumbnailBase64,
          message: 'Media loading timed out, using fallback'
        };
      
      case 'network':
        return {
          ...baseResponse,
          thumbnail: this.fallbackThumbnailBase64,
          message: 'Network error, using fallback'
        };
      
      default:
        return {
          ...baseResponse,
          thumbnail: this.fallbackThumbnailBase64,
          message: 'Media unavailable, using fallback'
        };
    }
  }
}

// Export singleton instance
export const mediaFallbackService = new MediaFallbackService();

// Export class for testing
export { MediaFallbackService };
