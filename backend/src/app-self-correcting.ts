/**
 * Self-Correcting Application Example
 * 
 * Shows how to integrate self-correcting runtime patterns
 * into the main Express application.
 */

import express from 'express';
import { initializeSelfCorrectingRuntime } from './self-correcting-bootstrap';
import {
  rateLimitMiddleware,
  circuitBreakerMiddleware,
  gracefulDegradationMiddleware,
  adaptiveTimeoutMiddleware,
  healthCheckMiddleware,
  errorHandlingMiddleware
} from './middleware/resilience-middleware';
import { resilientDatabaseService } from './services/resilient-database-service';

const app = express();

// Initialize self-correcting runtime
initializeSelfCorrectingRuntime();

// Basic middleware
app.use(express.json());
app.use(adaptiveTimeoutMiddleware(30000));

// Health check endpoint (no rate limiting)
app.use(healthCheckMiddleware);

// Apply resilience middleware to API routes
app.use('/api', rateLimitMiddleware);
app.use('/api', circuitBreakerMiddleware('api'));
app.use('/api', gracefulDegradationMiddleware('api'));

// API Routes with self-correction
app.get('/api/content', async (req, res) => {
  try {
    const result = await resilientDatabaseService.query('SELECT * FROM content');
    
    if (result.success) {
      res.json({
        status: 'success',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      // Return degraded response instead of error
      res.json({
        status: 'degraded',
        data: [],
        message: result.error || 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Content API error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    // This endpoint requires authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await resilientDatabaseService.query('SELECT * FROM favorites WHERE user_id = $1', [req.user?.id]);
    
    if (result.success) {
      res.json({
        status: 'success',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        status: 'degraded',
        data: [],
        message: result.error || 'Favorites service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Favorites API error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { content_id } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await resilientDatabaseService.query(
      'INSERT INTO favorites (user_id, content_id) VALUES ($1, $2) RETURNING *',
      [req.user?.id, content_id]
    );
    
    if (result.success) {
      res.status(201).json({
        status: 'success',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        status: 'degraded',
        data: null,
        message: result.error || 'Unable to add favorite at this time',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get('/system/status', (req, res) => {
  const { getSystemStatus } = require('./self-correcting-bootstrap');
  const status = getSystemStatus();
  
  res.json({
    status: 'healthy',
    system: status,
    features: {
      autoRestart: true,
      circuitBreaker: true,
      rateLimiting: true,
      gracefulDegradation: true,
      backgroundRecovery: true
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandlingMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Self-correcting server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 System status: http://localhost:${PORT}/system/status`);
});

export default app;
