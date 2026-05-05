import { Request, Response, NextFunction } from 'express';

interface RequestTrace {
  timestamp: string;
  method: string;
  route: string;
  responseTime: number;
  userId?: string;
  tenantId?: string;
  statusCode: number;
  userAgent?: string;
  ip: string;
}

class WorkingRequestTracer {
  private static traces: RequestTrace[] = [];
  private static readonly maxTraces = 1000;
  private static readonly slowThreshold = 300;

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      const originalEnd = res.end;
      const originalJson = res.json;
      
      res.end = function(this: Response, ...args: any[]) {
        const responseTime = Date.now() - startTime;
        
        const trace: RequestTrace = {
          timestamp: new Date().toISOString(),
          method: req.method,
          route: req.path,
          responseTime,
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress || 'unknown'
        };

        WorkingRequestTracer.traces.push(trace);
        
        if (WorkingRequestTracer.traces.length > WorkingRequestTracer.maxTraces) {
          WorkingRequestTracer.traces = WorkingRequestTracer.traces.slice(-WorkingRequestTracer.maxTraces);
        }

        if (responseTime > WorkingRequestTracer.slowThreshold) {
          console.warn(`[SLOW_REQUEST] ${req.method} ${req.path} - ${responseTime}ms - User: ${trace.userId || 'anonymous'}`);
        }

        return originalEnd.apply(this, args);
      };

      res.json = function(this: Response, data: any) {
        const responseTime = Date.now() - startTime;
        
        const trace: RequestTrace = {
          timestamp: new Date().toISOString(),
          method: req.method,
          route: req.path,
          responseTime,
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress || 'unknown'
        };

        WorkingRequestTracer.traces.push(trace);
        
        if (WorkingRequestTracer.traces.length > WorkingRequestTracer.maxTraces) {
          WorkingRequestTracer.traces = WorkingRequestTracer.traces.slice(-WorkingRequestTracer.maxTraces);
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  static getMetrics() {
    const recentTraces = WorkingRequestTracer.traces.slice(-100);
    
    if (recentTraces.length === 0) {
      return {
        avgResponseTime: 0,
        slowestRequests: [],
        errorRate: 0,
        requestsPerMinute: 0,
        totalRequests: 0,
        slowThreshold: WorkingRequestTracer.slowThreshold
      };
    }
    
    const avgResponseTime = recentTraces.reduce((sum, t) => sum + t.responseTime, 0) / recentTraces.length;
    const slowestRequests = recentTraces
      .filter(t => t.responseTime > WorkingRequestTracer.slowThreshold)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
    
    const errorRate = recentTraces.filter(t => t.statusCode >= 400).length / recentTraces.length * 100;
    const requestsPerMinute = WorkingRequestTracer.calculateRequestsPerMinute(recentTraces);

    return {
      avgResponseTime: Math.round(avgResponseTime),
      slowestRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerMinute,
      totalRequests: recentTraces.length,
      slowThreshold: WorkingRequestTracer.slowThreshold
    };
  }

  static getRouteMetrics() {
    const routeStats = new Map<string, {
      count: number;
      totalTime: number;
      errors: number;
      avgTime: number;
    }>();

    WorkingRequestTracer.traces.forEach(trace => {
      const route = trace.route;
      if (!routeStats.has(route)) {
        routeStats.set(route, { count: 0, totalTime: 0, errors: 0, avgTime: 0 });
      }
      
      const stats = routeStats.get(route)!;
      stats.count++;
      stats.totalTime += trace.responseTime;
      if (trace.statusCode >= 400) stats.errors++;
    });

    routeStats.forEach(stats => {
      stats.avgTime = Math.round(stats.totalTime / stats.count);
    });

    return Object.fromEntries(routeStats);
  }

  private static calculateRequestsPerMinute(traces: RequestTrace[]) {
    if (traces.length === 0) return 0;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = traces.filter(t => 
      new Date(t.timestamp).getTime() > oneMinuteAgo
    );
    
    return recentRequests.length;
  }
}

export const workingRequestTracer = new WorkingRequestTracer();
