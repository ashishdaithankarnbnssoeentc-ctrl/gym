import { useState } from 'react';
import { Sliders, X, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { difficultyLevels, popularTags } from '../data/youtubeVideos';

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export interface FilterState {
  minDuration: number;
  maxDuration: number;
  selectedDifficulty: string[];
  selectedTags: string[];
}

export function AdvancedFilters({
  onFilterChange,
  currentFilters,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  const durationRanges = [
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '30+ min', value: 999 },
  ];

  const handleDurationChange = (min: number, max: number) => {
    const newFilters = { ...filters, minDuration: min, maxDuration: max };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleDifficulty = (level: string) => {
    const newDifficulty = filters.selectedDifficulty.includes(level)
      ? filters.selectedDifficulty.filter((d) => d !== level)
      : [...filters.selectedDifficulty, level];
    
    const newFilters = { ...filters, selectedDifficulty: newDifficulty };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter((t) => t !== tag)
      : [...filters.selectedTags, tag];
    
    const newFilters = { ...filters, selectedTags: newTags };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      minDuration: 0,
      maxDuration: 999,
      selectedDifficulty: [],
      selectedTags: [],
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFiltersCount =
    (filters.minDuration > 0 || filters.maxDuration < 999 ? 1 : 0) +
    filters.selectedDifficulty.length +
    filters.selectedTags.length;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm relative"
      >
        <Sliders className="w-4 h-4 mr-2" />
        Advanced Filters
        {activeFiltersCount > 0 && (
          <Badge className="ml-2 bg-orange-500 text-white border-0 px-2 py-0.5">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-500" />
              Advanced Filters
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Duration Filter */}
          <div className="mb-6">
            <label className="text-white/80 text-sm mb-3 block">
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {durationRanges.map((range, index) => {
                const isActive =
                  (index === 0 && filters.maxDuration === range.value) ||
                  (index > 0 &&
                    index < durationRanges.length - 1 &&
                    filters.minDuration === range.value &&
                    filters.maxDuration === range.value) ||
                  (index === durationRanges.length - 1 &&
                    filters.minDuration === 30);

                return (
                  <Button
                    key={range.label}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => {
                      if (index === 0) {
                        handleDurationChange(0, range.value);
                      } else if (index === durationRanges.length - 1) {
                        handleDurationChange(30, 999);
                      } else {
                        handleDurationChange(range.value, range.value);
                      }
                    }}
                    className={
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 border-0 text-white'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    }
                  >
                    {range.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="mb-6">
            <label className="text-white/80 text-sm mb-3 block">
              Difficulty Level
            </label>
            <div className="flex flex-wrap gap-2">
              {difficultyLevels
                .filter((level) => level !== 'All Levels')
                .map((level) => (
                  <Button
                    key={level}
                    size="sm"
                    variant={
                      filters.selectedDifficulty.includes(level)
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => toggleDifficulty(level)}
                    className={
                      filters.selectedDifficulty.includes(level)
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 border-0 text-white'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    }
                  >
                    {level}
                  </Button>
                ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div className="mb-6">
            <label className="text-white/80 text-sm mb-3 block">
              Workout Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant={
                    filters.selectedTags.includes(tag) ? 'default' : 'outline'
                  }
                  onClick={() => toggleTag(tag)}
                  className={
                    filters.selectedTags.includes(tag)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 border-0 text-white text-xs'
                      : 'bg-white/5 border-white/20 text-white hover:bg-white/10 text-xs'
                  }
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 border-0 text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
