import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { workingRequestTracer } from '../middleware/working-request-tracing.middleware';

const router = Router();

// Readiness check - verifies system dependencies
router.get('/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks = {
    database: false,
    supabase: false,
    memory: false,
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Memory check
    const memUsage = process.memoryUsage();
    const memThreshold = 500 * 1024 * 1024; // 500MB threshold
    checks.memory = memUsage.heapUsed < memThreshold;

    // 2. Supabase connection check
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Simple query to test connectivity
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      checks.supabase = !error;
      checks.database = !error;
    } else {
      console.warn('[READY_CHECK] Missing Supabase environment variables');
    }

    const responseTime = Date.now() - startTime;

    // Determine overall readiness
    const allChecksPass = Object.values(checks).every(val =>
      typeof val === 'boolean' ? val : true
    );

    const statusCode = allChecksPass ? 200 : 503;

    res.status(statusCode).json({
      status: allChecksPass ? 'ready' : 'not_ready',
      checks,
      responseTime: `${responseTime}ms`,
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    });

    // Log readiness checks for monitoring
    console.log(`[READY_CHECK] Status: ${allChecksPass ? 'READY' : 'NOT_READY'}, Response: ${responseTime}ms`);

  } catch (error) {
    console.error('[READY_CHECK] Error during readiness check:', error);

    res.status(503).json({
      status: 'not_ready',
      checks,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Performance metrics endpoint (admin only)
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = requestTracer.getMetrics();
    const routeMetrics = requestTracer.getRouteMetrics();

    // Add system metrics
    const systemMetrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage()
    };

    res.json({
      timestamp: new Date().toISOString(),
      requestMetrics: metrics,
      routeMetrics,
      systemMetrics,
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    console.error('[METRICS] Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
