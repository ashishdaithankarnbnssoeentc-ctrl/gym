/**
 * Favorites Service
 * 
 * Frontend service for interacting with favorites API
 */

import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Favorite {
  id: string;
  content_id: string;
  content_type: string;
  created_at: string;
}

/**
 * Get authorization header with Firebase ID token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Get all favorites for the current user
 */
export async function getFavorites(): Promise<Favorite[]> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch favorites');
    }

    const data = await response.json();
    return data.favorites || [];
  } catch (error: any) {
    console.error('[GET FAVORITES ERROR]', error.message);
    throw error;
  }
}

/**
 * Add a content item to favorites
 */
export async function addFavorite(contentId: string, contentType: string = 'video'): Promise<Favorite> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content_id: contentId,
        content_type: contentType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle duplicate gracefully
      if (response.status === 409) {
        throw new Error('Already in favorites');
      }
      
      throw new Error(error.message || 'Failed to add favorite');
    }

    const data = await response.json();
    return data.favorite;
  } catch (error: any) {
    console.error('[ADD FAVORITE ERROR]', error.message);
    throw error;
  }
}

/**
 * Remove a favorite by ID
 */
export async function removeFavorite(favoriteId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove favorite');
    }
  } catch (error: any) {
    console.error('[REMOVE FAVORITE ERROR]', error.message);
    throw error;
  }
}

/**
 * Remove a favorite by content ID
 */
export async function removeFavoriteByContent(contentId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/favorites/content/${contentId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove favorite');
    }
  } catch (error: any) {
    console.error('[REMOVE FAVORITE BY CONTENT ERROR]', error.message);
    throw error;
  }
}

/**
 * Check if a content item is favorited
 */
export async function isFavorited(contentId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some(fav => fav.content_id === contentId);
  } catch (error) {
    console.error('[IS FAVORITED ERROR]', error);
    return false;
  }
}

/**
 * Toggle favorite status for a content item
 * Returns true if favorited, false if unfavorited
 */
export async function toggleFavorite(contentId: string, contentType: string = 'video'): Promise<boolean> {
  try {
    const favorited = await isFavorited(contentId);

    if (favorited) {
      await removeFavoriteByContent(contentId);
      return false;
    } else {
      await addFavorite(contentId, contentType);
      return true;
    }
  } catch (error: any) {
    console.error('[TOGGLE FAVORITE ERROR]', error.message);
    throw error;
  }
}
