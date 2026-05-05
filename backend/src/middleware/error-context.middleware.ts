import { Request, Response, NextFunction } from 'express';

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  endpoint: string;
  method: string;
  payloadSize?: number;
  userAgent?: string;
  ip: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    type: string;
  };
}

class ErrorContextEnricher {
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add error context enrichment to response locals
      res.locals.errorContext = {
        userId: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
        endpoint: req.path,
        method: req.method,
        payloadSize: this.calculatePayloadSize(req),
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Override res.json to capture response data size
      const originalJson = res.json;
      res.json = function(this: Response, data: any) {
        if (res.locals.errorContext) {
          (res.locals.errorContext as any).responseSize = JSON.stringify(data).length;
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  private calculatePayloadSize(req: Request): number {
    try {
      if (req.body) {
        return JSON.stringify(req.body).length;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  enrichError(error: Error, req: Request, res: Response): ErrorContext {
    const baseContext = res.locals.errorContext || {};
    
    return {
      ...baseContext,
      error: {
        message: error.message,
        stack: error.stack,
        type: this.getErrorType(error)
      }
    };
  }

  private getErrorType(error: Error): string {
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'UnauthorizedError') return 'auth';
    if (error.name === 'ForbiddenError') return 'permission';
    if (error.message.includes('database') || error.message.includes('DB')) return 'database';
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('rate limit')) return 'rate_limit';
    return 'unknown';
  }

  logError(error: Error, req: Request, res: Response) {
    const context = this.enrichError(error, req, res);
    
    // Group errors by root cause for better visibility
    const logLevel = this.getLogLevel(context);
    
    const logData = {
      level: logLevel,
      error: context.error,
      context: {
        userId: context.userId,
        tenantId: context.tenantId,
        endpoint: context.endpoint,
        method: context.method,
        payloadSize: context.payloadSize,
        responseSize: (context as any).responseSize,
        userAgent: context.userAgent,
        ip: context.ip,
        timestamp: context.timestamp
      }
    };

    if (logLevel === 'critical') {
      console.error(`[CRITICAL_ERROR]`, JSON.stringify(logData, null, 2));
    } else if (logLevel === 'error') {
      console.error(`[ERROR]`, JSON.stringify(logData, null, 2));
    } else {
      console.warn(`[WARNING]`, JSON.stringify(logData, null, 2));
    }
  }

  private getLogLevel(context: ErrorContext): string {
    // Critical errors that need immediate attention
    if (context.error.type === 'database' || context.error.type === 'timeout') {
      return 'critical';
    }
    
    // Security-related errors
    if (context.error.type === 'auth' || context.error.type === 'permission') {
      return 'warning';
    }
    
    // Standard application errors
    return 'error';
  }
}

export const errorContextEnricher = new ErrorContextEnricher();
