import { Request, Response, NextFunction } from 'express';
import { requestTracer } from './request-tracing.middleware';
import { adaptiveRateLimiter } from './adaptive-rate-limit.middleware';

class ResponseTracker {
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const clientId = this.getClientId(req);

      // Override res.end to capture response completion
      const originalEnd = res.end;
      const originalJson = res.json;

      res.end = function (this: Response, ...args: any[]) {
        const responseTime = Date.now() - startTime;

        // Update rate limiter metrics
        adaptiveRateLimiter.updateResponseMetrics(clientId, responseTime, res.statusCode);

        // Call original end with proper arguments
        return originalEnd.apply(this, args as any);
      };

      res.json = function (this: Response, data: any) {
        const responseTime = Date.now() - startTime;

        // Update rate limiter metrics
        adaptiveRateLimiter.updateResponseMetrics(clientId, responseTime, res.statusCode);

        // Call original json
        return originalJson.call(this, data);
      };

      next();
    };
  }

  private getClientId(req: Request): string {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (userId && tenantId) {
      return `user:${userId}:tenant:${tenantId}`;
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }
}

export const responseTracker = new ResponseTracker();
