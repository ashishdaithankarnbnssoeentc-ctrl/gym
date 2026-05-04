import { useState } from 'react';
import { Play, Filter, ExternalLink, Sparkles, TrendingUp, Gift, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { EnhancedVideoModal } from './EnhancedVideoModal';
import { VideoCardSkeleton } from './VideoCardSkeleton';
import { AdvancedFilters, FilterState } from './AdvancedFilters';
import { youtubeVideos, videoCategories, getVideosByCategory } from '../data/youtubeVideos';
import { CleanVideo } from '../types/video';

export function VideoGallery() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState<CleanVideo | null>(null);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    minDuration: 0,
    maxDuration: 999,
    selectedDifficulty: [],
    selectedTags: [],
  });

  // Apply all filters
  const getFilteredVideos = (): CleanVideo[] => {
    let videos = getVideosByCategory(selectedCategory);

    // Apply duration filter
    if (advancedFilters.minDuration > 0 || advancedFilters.maxDuration < 999) {
      videos = videos.filter((video) => {
        const duration = video.duration; // CleanVideo has duration as number
        return (
          duration >= advancedFilters.minDuration &&
          duration <= advancedFilters.maxDuration
        );
      });
    }

    // Apply difficulty filter
    if (advancedFilters.selectedDifficulty.length > 0) {
      videos = videos.filter((video) =>
        advancedFilters.selectedDifficulty.includes(video.level)
      );
    }

    // Apply tags filter
    if (advancedFilters.selectedTags.length > 0) {
      videos = videos.filter((video) =>
        advancedFilters.selectedTags.some((tag) =>
          video.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        )
      );
    }

    return videos;
  };

  const filteredVideos = getFilteredVideos();

  // Get videos for display based on showAllVideos state
  const displayVideos = showAllVideos ? filteredVideos : filteredVideos.slice(0, 6);

  const handleCategoryChange = (category: string) => {
    setIsLoading(true);
    setSelectedCategory(category);
    setShowAllVideos(false);
    // Simulate loading for smooth transition
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleImageError = (videoId: string) => {
    setImageErrors(prev => new Set(prev).add(videoId));
  };

  return (
    <section id="videos" className="py-32 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/30 via-red-900/10 to-transparent" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Enhanced Section Header */}
        <div className="text-center mb-20">
          {/* Badge above title */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Premium Workout Content</span>
          </div>
          
          {/* Main Title - Much more prominent */}
          <h2 className="text-white text-5xl md:text-6xl lg:text-7xl mb-6 bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent">
            Train Like Never Before
          </h2>
          
          {/* Subtitle with icon */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <p className="text-white/80 text-xl md:text-2xl font-medium">
              World-Class Workout Videos from Top Fitness Creators
            </p>
          </div>
          
          <p className="text-white/60 text-lg max-w-3xl mx-auto mb-10 leading-relaxed">
            Access an exclusive collection of professionally curated workout videos. From HIIT to yoga, strength training to cardio - 
            find your perfect workout. All videos embedded with proper attribution and respect for creators.
          </p>
          
          {/* Enhanced Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {videoCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => handleCategoryChange(category)}
                size="lg"
                className={
                  selectedCategory === category
                    ? category === 'Free'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/50 border-0 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/50 border-0 text-white'
                    : 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm'
                }
              >
                {category === 'Free' ? (
                  <Gift className="w-4 h-4 mr-2" />
                ) : (
                  <Filter className="w-4 h-4 mr-2" />
                )}
                {category}
              </Button>
            ))}
          </div>

          {/* Advanced Filters */}
          <div className="flex justify-center mb-8">
            <AdvancedFilters
              currentFilters={advancedFilters}
              onFilterChange={setAdvancedFilters}
            />
          </div>

          {/* Video Credits Link */}
          <div className="flex justify-center">
            <a
              href="/legal/VIDEO_CREDITS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="group text-orange-400 hover:text-orange-300 text-sm inline-flex items-center gap-2 transition-all duration-300 px-4 py-2 rounded-lg hover:bg-orange-500/10"
            >
              <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
              View Full Video Credits & Attribution
            </a>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, index) => (
              <VideoCardSkeleton key={`skeleton-${index}`} />
            ))
          ) : (
            displayVideos.map((video) => (
              <div 
                key={video.id} 
                className="group cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                  {/* Thumbnail */}
                  <div className="aspect-video relative bg-zinc-800">
                    {imageErrors.has(video.videoId) ? (
                      // Fallback UI for broken images
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-700">
                        <div className="text-center p-4">
                          <Play className="w-12 h-12 text-white/30 mx-auto mb-2" />
                          <p className="text-white/50 text-sm">Preview unavailable</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => handleImageError(video.videoId)}
                      />
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                    
                    {/* Subtle glow on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-orange-500/20 via-transparent to-transparent" />
                    
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-orange-500/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-500 transition-all duration-300 shadow-lg shadow-orange-500/50">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <Badge className="bg-black/80 text-white border-0 backdrop-blur-sm">
                        {video.durationDisplay}
                      </Badge>
                      {video.isFree && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 font-bold shadow-lg shadow-green-500/50">
                          <Gift className="w-3 h-3 mr-1" />
                          FREE
                        </Badge>
                      )}
                    </div>

                    {/* Difficulty badge */}
                    {video.level && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                          {video.level}
                        </Badge>
                      </div>
                    )}

                    {/* Watch buttons (appears on hover) */}
                    <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button
                        size="sm"
                        className="bg-white text-black hover:bg-white/90 font-semibold shadow-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo(video);
                        }}
                      >
                        <Play className="w-4 h-4 mr-2 fill-black" />
                        Watch Here
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-black/80 text-white border-white/30 hover:bg-black hover:border-white shadow-xl backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(video.originalUrl, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        YouTube
                      </Button>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-white mb-1 line-clamp-2">{video.title}</h3>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-white/70">by {video.creator}</p>
                      <Badge variant="outline" className="border-white/30 text-white/70 text-xs">
                        {video.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Enhanced View More Button */}
        {filteredVideos.length > 6 && (
          <div className="text-center mt-16">
            <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-xl border border-white/10 shadow-2xl">
              <p className="text-white/80 text-lg mb-2">
                Showing <span className="text-orange-400 font-bold">{displayVideos.length}</span> of <span className="text-orange-400 font-bold">{filteredVideos.length}</span> videos
              </p>
              <p className="text-white/50 text-sm mb-6">
                in {selectedCategory === 'All' ? 'all categories' : selectedCategory}
              </p>
              <Button
                size="lg"
                onClick={() => setShowAllVideos(!showAllVideos)}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-6 text-lg shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
              >
                <Play className="w-5 h-5 mr-2" />
                {showAllVideos ? 'Show Less' : 'Browse All Videos'}
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Copyright Notice */}
        <div className="mt-8 text-center">
          <div className="max-w-4xl mx-auto p-6 rounded-xl bg-zinc-900/30 backdrop-blur-sm border border-white/5">
            <p className="text-white/50 text-sm leading-relaxed">
              All videos are embedded from YouTube with proper attribution to original creators.
              We do not host, own, or redistribute these videos. Videos remain the intellectual property
              of their respective creators and are used in compliance with YouTube's Terms of Service.
              If a video cannot be embedded here, you can always watch it directly on YouTube.
            </p>
          </div>
        </div>
      </div>

      {/* Video Modal - Enhanced with robust error handling */}
      {selectedVideo && (
        <EnhancedVideoModal
          videoId={selectedVideo.videoId}
          title={selectedVideo.title}
          creator={selectedVideo.creator}
          channelUrl={selectedVideo.channelUrl}
          videoUrl={selectedVideo.originalUrl}
          duration={selectedVideo.durationDisplay}
          category={selectedVideo.category}
          level={selectedVideo.level}
          description={selectedVideo.description}
          tags={selectedVideo.tags}
          validateVideo={false}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </section>
  );
}