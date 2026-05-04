export function VideoCardSkeleton() {
  return (
    <div className="group animate-pulse">
      <div className="relative rounded-xl overflow-hidden bg-zinc-800/50">
        {/* Thumbnail skeleton */}
        <div className="aspect-video relative bg-gradient-to-br from-zinc-800 to-zinc-700">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          {/* Play button placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-zinc-700/50" />
          </div>

          {/* Duration badge placeholder */}
          <div className="absolute top-3 right-3">
            <div className="h-6 w-16 bg-zinc-700/50 rounded" />
          </div>

          {/* Difficulty badge placeholder */}
          <div className="absolute top-3 left-3">
            <div className="h-6 w-20 bg-zinc-700/50 rounded" />
          </div>
        </div>

        {/* Video info skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          {/* Title */}
          <div className="h-5 bg-zinc-700/50 rounded mb-2 w-3/4" />
          
          {/* Creator and category */}
          <div className="flex items-center justify-between">
            <div className="h-4 bg-zinc-700/50 rounded w-1/3" />
            <div className="h-5 w-16 bg-zinc-700/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
