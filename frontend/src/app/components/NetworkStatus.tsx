import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Network Status Banner
 *
 * Shows warnings when:
 * - User is offline
 * - Connection is slow
 */
export function NetworkStatus() {
  const { isOnline, isSlow } = useNetworkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline || isSlow) {
      setShow(true);
    } else {
      // Delay hiding to avoid flicker
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlow]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: !isOnline ? '#dc2626' : '#f59e0b',
        color: 'white',
        padding: '12px 20px',
        textAlign: 'center',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      {!isOnline ? (
        <span>⚠️ You're offline. Some features may not work.</span>
      ) : isSlow ? (
        <span>🐌 Slow connection detected. Loading may take longer.</span>
      ) : null}
    </div>
  );
}
