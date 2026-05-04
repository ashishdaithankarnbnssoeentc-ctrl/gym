export function SkeletonCard() {
  return (
    <div className="relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 animate-pulse">
      {/* Icon + Badge skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 bg-zinc-800 rounded-xl"></div>
        <div className="w-24 h-7 bg-zinc-800 rounded-full"></div>
      </div>

      {/* Title skeleton */}
      <div className="space-y-3 mb-6">
        <div className="h-10 bg-zinc-800 rounded-lg w-3/4"></div>
        <div className="h-6 bg-zinc-800 rounded-lg w-2/3"></div>
        <div className="h-1 w-16 bg-zinc-800 rounded-full"></div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-8">
        <div className="h-4 bg-zinc-800 rounded w-full"></div>
        <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
        <div className="h-4 bg-zinc-800 rounded w-4/6"></div>
      </div>

      {/* Features skeleton */}
      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-zinc-800 rounded w-full"></div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-zinc-800 rounded w-full"></div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-zinc-800 rounded w-full"></div>
          </div>
        </div>
      </div>

      {/* Button skeleton */}
      <div className="w-full h-14 bg-zinc-800 rounded-xl"></div>
    </div>
  );
}
