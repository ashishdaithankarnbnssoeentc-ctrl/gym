import React from 'react';

interface AnalyticsProps {
  trackingId?: string; // Google Analytics 4 Measurement ID
}

// Helper function to safely get environment variables
const getEnvVar = (key: string, fallback: string): string => {
  try {
    return (import.meta.env && import.meta.env[key]) || fallback;
  } catch {
    return fallback;
  }
};

// Get tracking ID from environment or props
const getTrackingId = (propsId?: string): string => {
  return propsId || getEnvVar('VITE_GA_TRACKING_ID', 'G-LNE3HD8V2X');
};

// Analytics helper functions
export const analytics = {
  // Track page views
  pageView: (url: string, trackingId?: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const id = getTrackingId(trackingId);
      (window as any).gtag('config', id, {
        page_path: url,
      });
    }
  },

  // Track custom events
  event: (action: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, params);
    }
  },

  // Track conversions
  conversion: (conversionName: string, value?: number) => {
    analytics.event('conversion', {
      send_to: conversionName,
      value: value,
      currency: 'USD',
    });
  },

  // Track user sign ups
  signUp: (method: string) => {
    analytics.event('sign_up', {
      method: method, // 'email', 'google', 'phone'
    });
  },

  // Track membership selection
  selectMembership: (plan: string, price: number) => {
    analytics.event('select_membership', {
      membership_plan: plan,
      value: price,
      currency: 'USD',
    });
  },

  // Track class bookings
  bookClass: (className: string, trainer: string) => {
    analytics.event('book_class', {
      class_name: className,
      trainer: trainer,
    });
  },

  // Track video plays
  playVideo: (videoTitle: string, videoCategory: string) => {
    analytics.event('video_play', {
      video_title: videoTitle,
      video_category: videoCategory,
    });
  },

  // Track button clicks
  buttonClick: (buttonName: string, location: string) => {
    analytics.event('button_click', {
      button_name: buttonName,
      location: location,
    });
  },

  // Track form submissions
  formSubmit: (formName: string, success: boolean) => {
    analytics.event('form_submit', {
      form_name: formName,
      success: success,
    });
  },

  // Track social shares
  share: (method: string, contentType: string, contentId: string) => {
    analytics.event('share', {
      method: method,
      content_type: contentType,
      content_id: contentId,
    });
  },

  // Track errors
  error: (errorMessage: string, errorLocation: string) => {
    analytics.event('error', {
      error_message: errorMessage,
      error_location: errorLocation,
      fatal: false,
    });
  },

  // Track user engagement time
  engagementTime: (timeInSeconds: number) => {
    analytics.event('user_engagement', {
      engagement_time_msec: timeInSeconds * 1000,
    });
  },
};

export function Analytics({ trackingId = 'G-XXXXXXXXXX' }: AnalyticsProps) {
  React.useEffect(() => {
    // Load Google Analytics
    if (typeof window !== 'undefined' && !document.querySelector(`script[src*="googletagmanager"]`)) {
      // Create script for gtag.js
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      document.head.appendChild(script);

      // Initialize gtag
      script.onload = () => {
        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
          (window as any).dataLayer.push(args);
        }
        (window as any).gtag = gtag;

        gtag('js', new Date());
        gtag('config', trackingId, {
          page_path: window.location.pathname,
          send_page_view: true,
        });

        // Analytics initialized successfully
      };
    }

    // Track engagement time
    let startTime = Date.now();
    const trackEngagement = () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent > 10) { // Only track if user spent more than 10 seconds
        analytics.engagementTime(timeSpent);
      }
    };

    window.addEventListener('beforeunload', trackEngagement);

    return () => {
      trackEngagement();
      window.removeEventListener('beforeunload', trackEngagement);
    };
  }, [trackingId]);

  return null;
}

// Custom hook for tracking page views
export function usePageTracking() {
  React.useEffect(() => {
    analytics.pageView(window.location.pathname);
  }, []);
}

// Custom hook for tracking scroll depth
export function useScrollTracking() {
  React.useEffect(() => {
    let maxScroll = 0;
    const thresholds = [25, 50, 75, 90, 100];
    const tracked = new Set<number>();

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Track threshold crossings
        thresholds.forEach((threshold) => {
          if (scrollPercent >= threshold && !tracked.has(threshold)) {
            tracked.add(threshold);
            analytics.event('scroll_depth', {
              percent: threshold,
              page: window.location.pathname,
            });
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}