import { useState, useEffect } from 'react';

/**
 * Network Status Hook
 *
 * Detects online/offline status and slow connections
 * Useful for showing connection warnings to users
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect slow connection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const checkSpeed = () => {
        // effectiveType: 'slow-2g', '2g', '3g', '4g'
        setIsSlow(
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g'
        );
      };

      checkSpeed();
      connection.addEventListener('change', checkSpeed);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', checkSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlow };
}
