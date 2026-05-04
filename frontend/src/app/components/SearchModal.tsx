import { useState, useEffect } from 'react';
import { X, Search, Video, User, Calendar, Book, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SearchModalProps {
  onClose: () => void;
  onResultClick?: (type: string, id: string) => void;
}

interface SearchResult {
  id: string;
  type: 'class' | 'trainer' | 'video' | 'article';
  title: string;
  description: string;
  image?: string;
  category?: string;
  metadata?: string;
}

const searchableContent: SearchResult[] = [
  // Classes
  {
    id: 'hiit-training',
    type: 'class',
    title: 'HIIT Training',
    description: 'High-intensity interval training to torch calories and build endurance',
    category: 'Cardio',
    metadata: '45 min • Intermediate',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400'
  },
  {
    id: 'strength-power',
    type: 'class',
    title: 'Strength & Power',
    description: 'Build muscle and strength with compound lifts',
    category: 'Strength',
    metadata: '60 min • All Levels',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'
  },
  {
    id: 'boxing-fitness',
    type: 'class',
    title: 'Boxing Fitness',
    description: 'Learn boxing techniques while getting an intense workout',
    category: 'Boxing',
    metadata: '50 min • Intermediate',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400'
  },
  {
    id: 'crossfit-wod',
    type: 'class',
    title: 'CrossFit WOD',
    description: 'Workout of the day with functional movements',
    category: 'CrossFit',
    metadata: '45 min • Advanced',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400'
  },
  {
    id: 'yoga-flow',
    type: 'class',
    title: 'Yoga Flow',
    description: 'Energizing yoga flows and mindfulness practice',
    category: 'Yoga',
    metadata: '60 min • All Levels',
    image: 'https://images.unsplash.com/photo-1651077837628-52b3247550ae?w=400'
  },
  {
    id: 'spin-burn',
    type: 'class',
    title: 'Spin & Burn',
    description: 'High-energy cycling class with motivating music',
    category: 'Cardio',
    metadata: '45 min • All Levels',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400'
  },
  // Trainers
  {
    id: 'sarah-johnson',
    type: 'trainer',
    title: 'Sarah Johnson',
    description: 'Elite Performance Coach specializing in HIIT and functional training',
    category: 'HIIT Specialist',
    metadata: '10+ years experience',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400'
  },
  {
    id: 'marcus-davis',
    type: 'trainer',
    title: 'Marcus Davis',
    description: 'Strength & Conditioning Expert with Olympic weightlifting background',
    category: 'Strength Coach',
    metadata: '15+ years experience',
    image: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=400'
  },
  {
    id: 'emma-wilson',
    type: 'trainer',
    title: 'Emma Wilson',
    description: 'Certified Nutritionist & Wellness Coach',
    category: 'Nutrition',
    metadata: '8+ years experience',
    image: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400'
  },
  {
    id: 'michael-chen',
    type: 'trainer',
    title: 'Michael Chen',
    description: 'Yoga Master & Mindfulness Instructor',
    category: 'Yoga',
    metadata: '12+ years experience',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'
  },
  // Videos
  {
    id: 'full-body-strength',
    type: 'video',
    title: 'Full Body Strength Training',
    description: 'Complete strength workout targeting all major muscle groups',
    category: 'Strength',
    metadata: '30 min workout',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'
  },
  {
    id: 'hiit-cardio-burn',
    type: 'video',
    title: 'HIIT Cardio Burn',
    description: 'High-intensity cardio to maximize calorie burn',
    category: 'Cardio',
    metadata: '25 min workout',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400'
  },
  {
    id: 'yoga-morning-flow',
    type: 'video',
    title: 'Morning Yoga Flow',
    description: 'Gentle flow to energize your day',
    category: 'Yoga',
    metadata: '20 min practice',
    image: 'https://images.unsplash.com/photo-1651077837628-52b3247550ae?w=400'
  },
  {
    id: 'boxing-basics',
    type: 'video',
    title: 'Boxing Fundamentals',
    description: 'Learn proper boxing technique and combinations',
    category: 'Boxing',
    metadata: '35 min tutorial',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400'
  },
  // Articles
  {
    id: 'nutrition-guide',
    type: 'article',
    title: 'Complete Nutrition Guide',
    description: 'Everything you need to know about nutrition for fitness',
    category: 'Nutrition',
    metadata: '10 min read'
  },
  {
    id: 'recovery-tips',
    type: 'article',
    title: 'Recovery & Rest Days',
    description: 'Maximize your gains with proper recovery techniques',
    category: 'Recovery',
    metadata: '5 min read'
  },
];

export function SearchModal({ onClose, onResultClick }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = searchableContent.filter(item => {
      const matchesQuery = 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query);

      const matchesFilter = 
        selectedFilter === 'all' || 
        item.type === selectedFilter;

      return matchesQuery && matchesFilter;
    });

    setResults(filtered);
  }, [searchQuery, selectedFilter]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'class': return Calendar;
      case 'trainer': return User;
      case 'video': return Video;
      case 'article': return Book;
      default: return TrendingUp;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-orange-500/20 text-orange-500';
      case 'trainer': return 'bg-purple-500/20 text-purple-500';
      case 'video': return 'bg-blue-500/20 text-blue-500';
      case 'article': return 'bg-green-500/20 text-green-500';
      default: return 'bg-white/20 text-white';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result.type, result.id);
    }
    onClose();
  };

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-screen py-8 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-4xl mx-auto">
          {/* Search Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search classes, trainers, videos, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-12 pr-4 py-6 text-lg focus:border-orange-500"
                autoFocus
              />
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 shrink-0"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'class', 'trainer', 'video', 'article'].map(filter => (
              <Button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                size="sm"
                variant={selectedFilter === filter ? 'default' : 'outline'}
                className={selectedFilter === filter
                  ? 'bg-orange-500 text-white border-0'
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter === 'all' && 's'}
              </Button>
            ))}
          </div>

          {/* Results */}
          {searchQuery.trim() === '' ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-white text-xl mb-2">Start Searching</h3>
              <p className="text-white/60">
                Find classes, trainers, workout videos, and helpful articles
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="text-white text-xl mb-2">No Results Found</h3>
              <p className="text-white/60">
                Try different keywords or adjust your filters
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white/60 text-sm mb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result) => {
                const Icon = getIcon(result.type);
                
                return (
                  <Card
                    key={result.id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Image or Icon */}
                        {result.image ? (
                          <ImageWithFallback
                            src={result.image}
                            alt={result.title}
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <Icon className="w-10 h-10 text-white/40" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                              {result.type}
                            </Badge>
                            {result.category && (
                              <span className="text-white/40 text-xs">
                                {result.category}
                              </span>
                            )}
                          </div>
                          <h4 className="text-white mb-1 truncate">{result.title}</h4>
                          <p className="text-white/60 text-sm mb-2 line-clamp-2">
                            {result.description}
                          </p>
                          {result.metadata && (
                            <p className="text-white/40 text-xs">
                              {result.metadata}
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="text-white/40 shrink-0">
                          <TrendingUp className="w-5 h-5 rotate-90" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Popular Searches */}
          {searchQuery.trim() === '' && (
            <div className="mt-8">
              <h4 className="text-white text-sm mb-3">Popular Searches</h4>
              <div className="flex flex-wrap gap-2">
                {['HIIT', 'Strength Training', 'Yoga', 'Boxing', 'Nutrition', 'Personal Training'].map((term) => (
                  <Button
                    key={term}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 text-white border-white/10 hover:bg-white/10"
                    onClick={() => setSearchQuery(term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
