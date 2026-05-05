/**
 * Elite Fitness Platform - Backend Server
 * 
 * Production-ready Express server with:
 * - Firebase Admin (token verification)
 * - Supabase (database operations with service role)
 * - CORS enabled for frontend
 * - Error handling
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initSentry, requestTrackingMiddleware, errorHandlerMiddleware } from './sentry.js';
import { requireAuth } from './middleware/auth.js';
import { requireActiveMembership } from './middleware/global.membership.middleware.js';
import { envValidator } from './config/env.validation.js';
import { performanceMonitor } from './middleware/performance.monitoring.js';
import { scalingMiddleware } from './middleware/scaling.middleware.js';
import { productionSecurity } from './middleware/security.production.js';
import authRoutes from './routes/auth.js';
import membershipRoutes from './routes/membership-basic.routes.js';
import favoritesRoutes from './routes/favorites.js';
import contentRoutes from './routes/content.js';
import proposalsRoutes from './routes/proposals.js';
import mediaRoutes from './routes/media.routes.js';

// Load environment variables
dotenv.config();

// Validate environment configuration immediately
let envConfig: ReturnType<typeof envValidator.getConfig>;
try {
  envConfig = envValidator.getConfig();
  console.log(`[ENV] ✅ Configuration validated for ${envConfig.NODE_ENV}`);
} catch (error) {
  console.error('[ENV] ❌ Environment validation failed:', error);
  process.exit(1);
}

// Initialize Sentry for error tracking
initSentry();

const app = express();
const PORT = envConfig.PORT;
const FRONTEND_URL = envConfig.FRONTEND_URL;

// Parse multiple origins from env (comma-separated)
const allowedOrigins = FRONTEND_URL.split(',').map(url => url.trim());

// Apply production-grade security middleware
app.use(productionSecurity.middleware());

// Production CORS and Security Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In production, be strict about origins
    if (envConfig.NODE_ENV === 'production') {
      // Only allow configured frontend URL
      if (origin === envConfig.FRONTEND_URL) {
        return callback(null, true);
      }

      // Block all other origins in production
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    } else {
      // In development, allow localhost and configured origins
      const devOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
        ...allowedOrigins
      ];

      if (devOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin in development: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

// Security Headers Middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');

  // Content Security Policy (only in production)
  if (envConfig.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.googleapis.com"
    );
  }

  next();
});

app.use(express.json());

// Rate limiting (protect against brute force and DoS)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Request logging with timestamps
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GET / - Health check`);

  res.json({
    status: 'ok',
    message: 'Elite Fitness Backend API',
    timestamp,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/media', mediaRoutes);

// Apply global membership enforcement to protected routes
app.use('/api/favorites', requireActiveMembership);
app.use('/api/content', requireActiveMembership);
app.use('/api/proposals', requireActiveMembership);

// SaaS Management Routes (with admin role validation)
app.use('/api/admin', requireAuth, (await import('./routes/admin.routes.js')).default);
app.use('/api/admin/notifications', requireAuth, (await import('./routes/admin.notifications.routes.js')).default);
app.use('/api/admin/analytics', requireAuth, (await import('./routes/admin.analytics.routes.js')).default);
app.use('/api/admin/actions', requireAuth, (await import('./routes/admin.actions.routes.js')).default);
app.use('/api/admin/retention', requireAuth, (await import('./routes/retention.analytics.routes.js')).default);
app.use('/api/user/notifications', requireAuth, (await import('./routes/user.notifications.routes.js')).default);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Elite Fitness Backend Server');
  console.log('================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Frontend URL: ${FRONTEND_URL}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /                         - Health check`);
  console.log('');
  console.log('  Auth:');
  console.log(`    POST /api/auth/sync-user     - Sync Firebase user to Supabase`);
  console.log(`    GET  /api/auth/me            - Get current user profile`);
  console.log(`    PATCH /api/auth/me           - Update user profile`);
  console.log('');
  console.log('  Favorites:');
  console.log(`    GET  /api/favorites          - Get user favorites (paginated)`);
  console.log(`    POST /api/favorites          - Add favorite`);
  console.log(`    DELETE /api/favorites/:id    - Remove favorite`);
  console.log(`    GET  /api/favorites/check/:id - Check if favorited`);
  console.log('');
  console.log('  Content:');
  console.log(`    GET  /api/content            - Get all content (filtered)`);
  console.log(`    GET  /api/content/search     - Search content`);
  console.log(`    GET  /api/content/:id        - Get content by ID`);
  console.log(`    GET  /api/content/category/:cat - Get content by category`);
  console.log('');
  console.log('  Proposals:');
  console.log(`    POST /api/proposals          - Create new proposal`);
  console.log(`    GET  /api/proposals          - Get all proposals (paginated)`);
  console.log(`    GET  /api/proposals/:id      - Get proposal by ID`);
  console.log(`    PATCH /api/proposals/:id     - Update proposal status`);
  console.log(`    DELETE /api/proposals/:id    - Delete proposal`);
  console.log(`    GET  /api/proposals/clients/:name - Get client memory`);
  console.log('');
});

// Sentry error handler (disabled due to compatibility issues)
// app.use(errorHandlerMiddleware());

export default app;
