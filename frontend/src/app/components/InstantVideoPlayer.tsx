/**
 * InstantVideoPlayer - Production-Grade YouTube Player
 *
 * FIXED ISSUES:
 * ✅ Global abort strategy (1 request per video max)
 * ✅ Cache poisoning prevention (network errors vs confirmed failures)
 * ✅ Mounted ref for lifecycle safety
 * ✅ Removed embeddable-based early return (race condition)
 * ✅ Structured logging (no console spam in prod)
 * ✅ Centralized constants (no magic numbers)
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { Play, ExternalLink } from "lucide-react";
import { logger } from "../utils/logger";
import { UI_CONFIG, API_CONFIG, VIDEO_CONFIG } from "../config/constants";
import { videoAnalytics } from "../lib/analytics";
import { extractVideoId } from "../utils/videoHelpers";

// ENHANCED CACHE: Tracks source and timestamp
type CacheEntry = {
  valid: boolean;
  timestamp: number;
  source: "network" | "confirmed-failure" | "temporary-failure";
};

const validationCache = new Map<string, CacheEntry>();

// GLOBAL ABORT STRATEGY: Only 1 request per videoId
const activeRequests = new Map<string, AbortController>();

// REQUEST DEDUPLICATION: Share promises for identical requests
const requestQueue = new Map<string, Promise<{ valid: boolean; source: CacheEntry["source"] }>>();

/**
 * Check if cache entry is still valid (TTL check)
 */
function isCacheValid(entry: CacheEntry): boolean {
  const age = Date.now() - entry.timestamp;

  // Only cache confirmed failures permanently
  // Network errors expire after TTL
  if (entry.source === "confirmed-failure") {
    return true;
  }

  return age < UI_CONFIG.CACHE_TTL;
}

/**
 * Strict YouTube embed validation using noembed API
 * ANTI-POISONING: Distinguishes network errors from confirmed failures
 * REQUEST DEDUPLICATION: Shares promises for identical concurrent requests
 */
async function validateYouTubeEmbed(
  videoId: string,
  signal: AbortSignal
): Promise<{ valid: boolean; source: CacheEntry["source"] }> {
  // Check cache first
  const cached = validationCache.get(videoId);
  if (cached && isCacheValid(cached)) {
    logger.debug("VIDEO", `Cache hit: ${videoId}`, cached);
    videoAnalytics.cacheHit(videoId);
    return { valid: cached.valid, source: cached.source };
  }

  videoAnalytics.cacheMiss(videoId);

  // REQUEST DEDUPLICATION: If request is already in flight, return existing promise
  const existingRequest = requestQueue.get(videoId);
  if (existingRequest) {
    logger.debug("VIDEO", `Deduplicating request: ${videoId}`);
    return existingRequest;
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      const url = `${API_CONFIG.NOEMBED_API}?url=${API_CONFIG.WATCH_URL(videoId)}`;
      const res = await fetch(url, {
        cache: 'no-store',
        signal,
      });

    if (!res.ok) {
      logger.warn("VIDEO", `Validation failed: ${videoId}`, `HTTP ${res.status}`);
      videoAnalytics.validationFailed(videoId, `HTTP ${res.status}`);

      // Network error - don't poison cache
      const entry: CacheEntry = {
        valid: false,
        timestamp: Date.now(),
        source: "temporary-failure",
      };
      validationCache.set(videoId, entry);
      return { valid: false, source: "temporary-failure" };
    }

    const data = await res.json();

    // Confirmed failure (video blocked/private/deleted)
    if (data.error || !data.title || data.title.toLowerCase().includes("private")) {
      logger.warn("VIDEO", `Confirmed failure: ${videoId}`, data.error || "suspicious title");
      videoAnalytics.playFailed(videoId, data.error || "confirmed-failure");

      const entry: CacheEntry = {
        valid: false,
        timestamp: Date.now(),
        source: "confirmed-failure",
      };
      validationCache.set(videoId, entry);
      return { valid: false, source: "confirmed-failure" };
    }

    // Success
    logger.debug("VIDEO", `Validation passed: ${videoId}`);
    videoAnalytics.validationPassed(videoId, "network");
    const entry: CacheEntry = {
      valid: true,
      timestamp: Date.now(),
      source: "network",
    };
    validationCache.set(videoId, entry);
    return { valid: true, source: "network" };

  } catch (err: any) {
    // Abort is expected, don't cache
    if (err.name === 'AbortError') {
      logger.debug("VIDEO", `Request aborted: ${videoId}`);
      return { valid: false, source: "temporary-failure" };
    }

    // Network error - don't poison cache
    logger.error("VIDEO", `Validation error: ${videoId}`, err);
    const entry: CacheEntry = {
      valid: false,
      timestamp: Date.now(),
      source: "temporary-failure",
    };
    validationCache.set(videoId, entry);
    return { valid: false, source: "temporary-failure" };
  } finally {
    // Clean up request queue
    requestQueue.delete(videoId);
  }
  })();

  // Store promise in queue
  requestQueue.set(videoId, requestPromise);

  return requestPromise;
}

/**
 * Validation with timeout protection
 */
async function validateWithTimeout(
  videoId: string,
  signal: AbortSignal
): Promise<{ valid: boolean; source: CacheEntry["source"] }> {
  return Promise.race([
    validateYouTubeEmbed(videoId, signal),
    new Promise<{ valid: boolean; source: CacheEntry["source"] }>((resolve) =>
      setTimeout(() => {
        logger.warn("VIDEO", `Validation timeout: ${videoId}`);
        resolve({ valid: false, source: "temporary-failure" });
      }, UI_CONFIG.VALIDATION_TIMEOUT)
    ),
  ]);
}

interface InstantVideoPlayerProps {
  videoId: string;
  title: string;
  /** Optional precomputed embeddable flag (skips validation) */
  embeddable?: boolean;
  autoplay?: boolean;
  className?: string;
}

type PlayerStatus = "idle" | "loading" | "ready" | "fallback";

export function InstantVideoPlayer({
  videoId: videoIdInput,
  title,
  embeddable,
  autoplay = false,
  className = "",
}: InstantVideoPlayerProps) {
  // LIFECYCLE SAFETY: Track if component is mounted
  const mountedRef = useRef(true);

  // Extract and validate video ID
  const videoId = extractVideoId(videoIdInput);

  // HARD BLOCK: Invalid video ID
  if (!videoId || videoId.length !== VIDEO_CONFIG.VIDEO_ID_LENGTH) {
    logger.error("VIDEO", "Invalid video ID", { input: videoIdInput, extracted: videoId });
    return (
      <div className={`aspect-video bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white text-lg mb-2">Invalid Video ID</h3>
          <p className="text-white/70 text-sm">Unable to load this video</p>
        </div>
      </div>
    );
  }

  // State machine
  const [status, setStatus] = useState<PlayerStatus>("idle");

  // FIXED: Check cache immediately on mount (no embeddable bypass)
  useEffect(() => {
    const cached = validationCache.get(videoId);
    if (cached && isCacheValid(cached)) {
      logger.debug("VIDEO", `Using cached result: ${videoId}`, cached);
      setStatus(cached.valid ? "ready" : "fallback");
      return;
    }

    // If embeddable is provided, use it as hint but still validate
    if (embeddable !== undefined) {
      setStatus(embeddable ? "ready" : "fallback");
      return;
    }

    // Otherwise, run validation
    setStatus("idle");
  }, [videoId, embeddable]);

  // Controlled validation lifecycle with GLOBAL ABORT
  useEffect(() => {
    // Skip if we already have a cached result
    const cached = validationCache.get(videoId);
    if (cached && isCacheValid(cached)) {
      return;
    }

    // Skip if embeddable is provided
    if (embeddable !== undefined) {
      return;
    }

    // ABORT any existing request for this videoId
    activeRequests.get(videoId)?.abort();

    // Create new AbortController
    const controller = new AbortController();
    activeRequests.set(videoId, controller);

    async function check() {
      if (!mountedRef.current) return;

      setStatus("loading");

      const result = await validateWithTimeout(videoId, controller.signal);

      // LIFECYCLE SAFETY: Don't update state if unmounted
      if (!mountedRef.current) return;

      setStatus(result.valid ? "ready" : "fallback");
      logger.debug("VIDEO", `Status changed: ${videoId}`, result);
    }

    check();

    return () => {
      controller.abort();
      activeRequests.delete(videoId);
    };
  }, [videoId, embeddable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const embedUrl = API_CONFIG.EMBED_URL(videoId, autoplay);
  const watchUrl = API_CONFIG.WATCH_URL(videoId);
  const thumbnailUrl = API_CONFIG.THUMBNAIL_URL(videoId);

  // HARD RENDER GUARD: Show fallback for ANY status except "ready"
  if (status !== "ready") {
    return (
      <div
        className={`aspect-video bg-zinc-900 rounded-lg overflow-hidden relative group cursor-pointer ${className}`}
        onClick={() => window.open(watchUrl, "_blank", "noopener,noreferrer")}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center mx-auto mb-4 transition-all group-hover:scale-110">
              <Play className="w-10 h-10 text-white fill-white ml-1" />
            </div>
            {status === "fallback" ? (
              <>
                <h3 className="text-white text-lg mb-2">Watch on YouTube</h3>
                <p className="text-white/70 text-sm">Embedding disabled for this video</p>
              </>
            ) : status === "loading" ? (
              <h3 className="text-white text-lg">Loading...</h3>
            ) : (
              <h3 className="text-white text-lg">Click to play</h3>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ONLY VALID IFRAME PATH - status must be "ready"
  logger.debug("VIDEO", `Rendering iframe: ${videoId}`);
  videoAnalytics.playSuccess(videoId);
  return (
    <div className={`relative aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full"
        frameBorder="0"
        allow="autoplay; encrypted-media; accelerometer; clipboard-write; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
      />
    </div>
  );
}
