/**
 * Resilience Middleware
 * 
 * Express middleware that integrates self-correcting runtime patterns
 * to provide automatic adaptation and recovery.
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter, gracefulDegradation, circuitBreaker } from '../utils/self-correcting-runtime';

// Request tracking for rate limiting
const requestCounts = new Map<string, number>();

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await rateLimiter.requestSlot();
    next();
  } catch (error) {
    console.warn('Rate limit exceeded:', error);
    res.status(429).json({
      status: 'throttled',
      message: 'Too many requests, please try again later',
      retryAfter: 60
    });
  }
}

export function circuitBreakerMiddleware(serviceName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await circuitBreaker.execute(async () => {
        return new Promise<void>((resolve, reject) => {
          const originalJson = res.json;
          const originalStatus = res.status;
          
          res.json = function(data: any) {
            if (res.statusCode >= 500) {
              reject(new Error(`Service ${serviceName} failed`));
            } else {
              originalJson.call(this, data);
              resolve();
            }
          };
          
          res.status = function(code: number) {
            originalStatus.call(this, code);
            return this;
          };
          
          next();
        });
      });
    } catch (error) {
      console.error(`Circuit breaker triggered for ${serviceName}:`, error);
      
      if (gracefulDegradation.isDegraded(serviceName)) {
        res.status(200).json(
          gracefulDegradation.createDegradedResponse(
            null,
            `${serviceName} service is currently degraded`
          )
        );
      } else {
        gracefulDegradation.markDegraded(serviceName, 'Circuit breaker triggered');
        res.status(503).json({
          status: 'unavailable',
          message: `${serviceName} service temporarily unavailable`,
          retryAfter: 30
        });
      }
    }
  };
}

export function gracefulDegradationMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(data: any) {
      if (gracefulDegradation.isDegraded(serviceName) && res.statusCode === 200) {
        const degradedResponse = gracefulDegradation.createDegradedResponse(
          data,
          `${serviceName} operating in degraded mode`
        );
        originalJson.call(this, degradedResponse);
      } else {
        originalJson.call(this, data);
      }
    };
    
    res.send = function(data: any) {
      if (gracefulDegradation.isDegraded(serviceName) && res.statusCode === 200) {
        const degradedResponse = gracefulDegradation.createDegradedResponse(
          data,
          `${serviceName} operating in degraded mode`
        );
        originalSend.call(this, degradedResponse);
      } else {
        originalSend.call(this, data);
      }
    };
    
    next();
  };
}

export function adaptiveTimeoutMiddleware(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`Request timeout for ${req.method} ${req.path}`);
        res.status(408).json({
          status: 'timeout',
          message: 'Request timeout',
          timeout: timeoutMs
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
}

export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      circuitBreaker: circuitBreaker.getState(),
      rateLimiter: rateLimiter.getStatus(),
      degradedServices: gracefulDegradation.getDegradedServices()
    };

    // Check each service health
    const services = ['database', 'supabase', 'cache'];
    services.forEach(service => {
      health.services[service] = {
        status: gracefulDegradation.isDegraded(service) ? 'degraded' : 'healthy'
      };
    });

    const hasIssues = Object.values(health.services).some(s => s.status === 'degraded') ||
                    health.circuitBreaker.state !== 'CLOSED' ||
                    health.degradedServices.length > 0;

    if (hasIssues) {
      health.status = 'degraded';
      res.status(200).json(health);
    } else {
      res.status(200).json(health);
    }
    return;
  }

  next();
}

export function errorHandlingMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Request error:', error);

  // Record error for auto-restart guard
  const { autoRestartGuard } = require('../utils/self-correcting-runtime');
  if (autoRestartGuard && typeof autoRestartGuard.recordError === 'function') {
    autoRestartGuard.recordError();
  }

  // Check if we should return degraded response
  const serviceName = req.path.split('/')[1] || 'unknown';
  if (gracefulDegradation.isDegraded(serviceName)) {
    res.status(200).json(
      gracefulDegradation.createDegradedResponse(
        null,
        `${serviceName} service experiencing issues`
      )
    );
    return;
  }

  // Return appropriate error response
  if (res.headersSent) {
    return;
  }

  const statusCode = (error as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    status: 'error',
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
}
