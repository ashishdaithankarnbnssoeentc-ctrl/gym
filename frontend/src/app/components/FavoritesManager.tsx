import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';

interface FavoritesManagerProps {
  onClose: () => void;
  userEmail: string;
  onPlayVideo?: (url: string, title: string) => void;
}

export interface FavoriteItem {
  id: string;
  itemId: string;
  type: 'video' | 'class';
  title: string;
  description: string;
  image: string;
  videoUrl?: string;
  duration?: string;
  category?: string;
  userEmail: string;
  savedAt: any;
}

export function FavoritesManager({ onClose, userEmail, onPlayVideo }: FavoritesManagerProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'video' | 'class'>('all');

  useEffect(() => {
    loadFavorites();
  }, [userEmail]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'favorites'),
        where('userEmail', '==', userEmail)
      );
      const querySnapshot = await getDocs(q);
      const favs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FavoriteItem));
      
      // Sort by most recent
      favs.sort((a, b) => {
        const timeA = a.savedAt?.toMillis?.() || 0;
        const timeB = b.savedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', favoriteId));
      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast.success('Removed from Favorites', {
        description: `${title} has been removed from your favorites.`
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const filteredFavorites = favorites.filter(fav => 
    filter === 'all' || fav.type === filter
  );

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-white text-3xl md:text-4xl mb-2 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                My Favorites
              </h2>
              <p className="text-white/60">
                {favorites.length} saved item{favorites.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {[
              { value: 'all', label: 'All' },
              { value: 'video', label: 'Videos' },
              { value: 'class', label: 'Classes' }
            ].map(({ value, label }) => (
              <Button
                key={value}
                onClick={() => setFilter(value as any)}
                size="sm"
                variant={filter === value ? 'default' : 'outline'}
                className={filter === value
                  ? 'bg-orange-500 text-white border-0'
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/60">Loading your favorites...</p>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-white text-xl mb-2">
                {filter === 'all' ? 'No Favorites Yet' : `No ${filter}s saved`}
              </h3>
              <p className="text-white/60 max-w-md mx-auto">
                Start adding your favorite workouts and classes to quickly access them here
              </p>
              <Button
                onClick={onClose}
                className="mt-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                Browse Content
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFavorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  className="bg-white/5 border-white/10 overflow-hidden group"
                >
                  {/* Image */}
                  <div className="relative h-48">
                    <ImageWithFallback
                      src={favorite.image}
                      alt={favorite.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    
                    {/* Play button for videos */}
                    {favorite.type === 'video' && favorite.videoUrl && onPlayVideo && (
                      <button
                        onClick={() => onPlayVideo(favorite.videoUrl!, favorite.title)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="w-16 h-16 rounded-full bg-orange-500/90 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" fill="white" />
                        </div>
                      </button>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={
                        favorite.type === 'video'
                          ? 'bg-blue-500 text-white border-0'
                          : 'bg-orange-500 text-white border-0'
                      }>
                        {favorite.type === 'video' ? 'Video' : 'Class'}
                      </Badge>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFavorite(favorite.id, favorite.title)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <CardContent className="p-4">
                    <h4 className="text-white mb-2">{favorite.title}</h4>
                    <p className="text-white/60 text-sm mb-3 line-clamp-2">
                      {favorite.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        {favorite.type === 'video' ? (
                          <Play className="w-3 h-3" />
                        ) : (
                          <Calendar className="w-3 h-3" />
                        )}
                        {favorite.duration || '30 min'}
                      </span>
                      {favorite.category && (
                        <span className="text-orange-500">{favorite.category}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage favorites
export function useFavorites(userEmail: string) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userEmail) return;
    loadFavoriteIds();
  }, [userEmail]);

  const loadFavoriteIds = async () => {
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userEmail', '==', userEmail)
      );
      const querySnapshot = await getDocs(q);
      const ids = querySnapshot.docs.map(doc => doc.data().itemId);
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error loading favorite IDs:', error);
    }
  };

  const addFavorite = async (item: Omit<FavoriteItem, 'id' | 'userEmail' | 'savedAt'>) => {
    try {
      await addDoc(collection(db, 'favorites'), {
        ...item,
        userEmail,
        savedAt: serverTimestamp()
      });
      
      setFavoriteIds([...favoriteIds, item.itemId]);
      
      toast.success('Added to Favorites!', {
        description: `${item.title} has been saved to your favorites.`,
        icon: '❤️'
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error('Failed to add to favorites');
    }
  };

  const removeFavorite = async (itemId: string, title: string) => {
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userEmail', '==', userEmail),
        where('itemId', '==', itemId)
      );
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'favorites', document.id));
      });
      
      setFavoriteIds(favoriteIds.filter(id => id !== itemId));
      
      toast.success('Removed from Favorites', {
        description: `${title} has been removed from your favorites.`
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const isFavorite = (itemId: string) => favoriteIds.includes(itemId);

  return { isFavorite, addFavorite, removeFavorite, favoriteIds };
}