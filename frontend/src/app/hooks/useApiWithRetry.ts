import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../lib/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * API Hook with Automatic Retry
 *
 * Features:
 * - Automatic token refresh
 * - Retry on failure
 * - Loading states
 * - Error handling
 *
 * Example:
 *   const { fetchApi, data, error, loading } = useApiWithRetry<Workout[]>();
 *   await fetchApi('/api/gym/workouts');
 */
export function useApiWithRetry<T>() {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchApi = useCallback(
    async (
      endpoint: string,
      options: FetchOptions = {}
    ): Promise<ApiResponse<T>> => {
      const {
        method = 'GET',
        body,
        retries = 3,
        retryDelay = 1000,
      } = options;

      setLoading(true);
      setError(null);

      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < retries) {
        try {
          // Always get fresh token
          const token = await getAuthToken(user);

          if (!token && endpoint.includes('/api/')) {
            throw new Error('Not authenticated');
          }

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Session expired. Please login again.');
            }
            if (response.status === 403) {
              throw new Error('You do not have permission to access this.');
            }
            if (response.status === 404) {
              throw new Error('Resource not found.');
            }
            if (response.status >= 500) {
              throw new Error('Server error. Please try again later.');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed: ${response.status}`);
          }

          const responseData = await response.json();
          setData(responseData.data || responseData);
          setLoading(false);

          return {
            data: responseData.data || responseData,
            error: null,
            loading: false,
          };
        } catch (err: any) {
          lastError = err;
          attempt++;

          // Don't retry on authentication or permission errors
          if (err.message.includes('authenticated') || err.message.includes('permission')) {
            break;
          }

          // Wait before retrying
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      // All retries failed
      const errorMessage = lastError?.message || 'Request failed';
      setError(errorMessage);
      setLoading(false);

      return {
        data: null,
        error: errorMessage,
        loading: false,
      };
    },
    [user]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    fetchApi,
    data,
    error,
    loading,
    reset,
  };
}
