/**
 * VideoErrorBoundary - Prevent video player crashes from breaking the page
 *
 * HIGH PRIORITY: Video players can fail in many ways
 * This boundary contains failures and shows graceful fallback
 */

import React, { Component, ReactNode } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { logger } from '../utils/logger';
import { trackVideoError } from '../lib/monitoring';
import { monitorFeature } from '../lib/autoRollback';
import { sendAlert } from '../lib/alerting';

interface Props {
  children: ReactNode;
  videoId?: string;
  videoUrl?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('VIDEO_BOUNDARY', 'Video player crashed', {
      error: error.message,
      videoId: this.props.videoId,
      componentStack: errorInfo.componentStack,
    });

    // Track to Sentry for production monitoring
    if (this.props.videoId) {
      trackVideoError(this.props.videoId, error.message);
    }

    // Monitor for auto-rollback (disables feature if too many errors)
    monitorFeature('VIDEO_PLAYER', error);

    // Send alert for error spike
    sendAlert('error_spike');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-red-500/20">
          <div className="text-center px-4 max-w-md">
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-white text-xl mb-3">Video Player Error</h3>
            <p className="text-white/70 text-sm mb-6">
              Something went wrong loading this video. You can still watch it on YouTube.
            </p>
            {this.props.videoUrl && (
              <Button
                onClick={() => window.open(this.props.videoUrl, '_blank', 'noopener,noreferrer')}
                className="bg-red-600 hover:bg-red-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Watch on YouTube
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
