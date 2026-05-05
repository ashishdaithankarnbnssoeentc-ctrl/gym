/**
 * Self-Correcting Bootstrap
 * 
 * Initializes and starts the self-correcting runtime system
 * that provides automatic adaptation and recovery.
 */

import { 
  setupGlobalErrorHandling, 
  backgroundRecovery, 
  autoRestartGuard,
  gracefulDegradation 
} from './utils/self-correcting-runtime';

export function initializeSelfCorrectingRuntime() {
  console.log('🚀 Initializing self-correcting runtime system...');

  // Setup global error handling
  setupGlobalErrorHandling();

  // Start auto restart guard
  autoRestartGuard.start();

  // Add health checks for background recovery
  backgroundRecovery.addHealthCheck({
    name: 'database',
    check: async () => {
      try {
        // Replace with actual database health check
        const { resilientDatabaseService } = await import('./services/resilient-database-service');
        return await resilientDatabaseService.healthCheck();
      } catch (error) {
        console.error('Database health check error:', error);
        return false;
      }
    },
    interval: 30000 // 30 seconds
  });

  backgroundRecovery.addHealthCheck({
    name: 'supabase',
    check: async () => {
      try {
        // Replace with actual Supabase health check
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
          }
        });
        return response.ok;
      } catch (error) {
        console.error('Supabase health check error:', error);
        return false;
      }
    },
    interval: 45000 // 45 seconds
  });

  backgroundRecovery.addHealthCheck({
    name: 'memory',
    check: async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      // Consider unhealthy if memory usage is too high
      if (heapUsedMB > 400) { // 400MB threshold
        console.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
        return false;
      }
      
      return true;
    },
    interval: 60000 // 1 minute
  });

  // Start background recovery system
  backgroundRecovery.start();

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    backgroundRecovery.stop();
    autoRestartGuard.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    backgroundRecovery.stop();
    autoRestartGuard.stop();
    process.exit(0);
  });

  console.log('✅ Self-correcting runtime system initialized');
  console.log('📊 Monitoring systems:');
  console.log('   - Auto restart guard: Active');
  console.log('   - Background recovery: Active');
  console.log('   - Circuit breaker: Active');
  console.log('   - Rate limiting: Active');
  console.log('   - Graceful degradation: Active');
}

export function getSystemStatus() {
  return {
    timestamp: new Date().toISOString(),
    degradedServices: gracefulDegradation.getDegradedServices(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    version: process.version
  };
}
