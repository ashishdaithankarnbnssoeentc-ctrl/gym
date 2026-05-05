import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Import custom middleware
// import { requireAuth, optionalAuth } from './middleware/auth';
// import { requireActiveMembership } from './middleware/membership.middleware';
// import { cacheMiddleware } from './middleware/cache.middleware';
// import { enhancedRateLimit } from './middleware/resilience-middleware';
// import { guaranteedTransaction } from './middleware/guaranteed-transaction.middleware';
// import { massAssignmentProtection } from './middleware/mass-assignment.middleware';
// import { ownershipEnforcement } from './middleware/ownership.middleware';
// import { csrfProtection } from './middleware/csrf.middleware';
import { comprehensiveSecurity } from './middleware/security.comprehensive';
// import { requestLogging } from './middleware/request-logging.middleware';
// import { transactionSecurity } from './middleware/transaction.security';

// Import production monitoring middleware
import { requestTracer } from './middleware/request-tracing.middleware';
import { apiLimiter } from './middleware/safe-rate-limit.middleware';

// Import routes
// import authRoutes from './routes/auth';
// import contentRoutes from './routes/content';
// import favoritesRoutes from './routes/favorites';
// import proposalsRoutes from './routes/proposals';
// import adminRoutes from './routes/admin';
// import membershipRoutes from './routes/membership';
// import notificationRoutes from './routes/notifications';
import healthRoutes from './routes/health.routes';
import monitoringRoutes from './routes/monitoring.routes';

// Import services
// import { initSentry } from './utils/sentry';
// import { validateEnvConfig } from './utils/env-validation';
// import { envConfig } from './config/environment';

// Import self-correcting runtime
// import { startSelfCorrectingRuntime } from './self-correcting-bootstrap';

// Load environment variables
dotenv.config();

// Validate environment configuration
// if (!validateEnvConfig()) {
//   process.exit(1);
// }

// Initialize Sentry for error tracking
// initSentry();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ✅ PUBLIC HEALTH CHECK (for CI, Render, uptime checks) - MUST BE FIRST ROUTE
app.get('/api/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint (bypasses security middleware)
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

// Parse multiple origins from env (comma-separated)
const allowedOrigins = FRONTEND_URL.split(',').map(url => url.trim());

// Apply production monitoring middleware (before security for full visibility)
app.use(requestTracer);

// Apply rate limiting
app.use('/api', apiLimiter);

// Apply production-grade security middleware
app.use(comprehensiveSecurity.middleware());

// Production CORS and Security Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In production, be strict about origins
    if (process.env.NODE_ENV === 'production') {
      // Only allow configured frontend URL
      if (origin === FRONTEND_URL) {
        return callback(null, true);
      }

      // Block all other origins in production
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow all origins
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Apply compression middleware
app.use(compression());

// Apply request logging
// app.use(requestLogging);

// Apply rate limiting
// app.use(enhancedRateLimit);

// Apply guaranteed transaction middleware
// app.use(guaranteedTransaction);

// Apply mass assignment protection
// app.use(massAssignmentProtection);

// Apply ownership enforcement
// app.use(ownershipEnforcement);

// Apply CSRF protection
// app.use(csrfProtection);

// Apply transaction security
// app.use(transactionSecurity);

// Apply cache middleware
// app.use(cacheMiddleware);

// API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/content', contentRoutes);
// app.use('/api/favorites', favoritesRoutes);
// app.use('/api/proposals', proposalsRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/membership', membershipRoutes);
// app.use('/api/notifications', notificationRoutes);

// Health and Monitoring Routes (always public)
app.use('/api', healthRoutes);
app.use('/monitoring', monitoringRoutes);

// Global error handler with context enrichment
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Use error context enrichment for better visibility
  errorContextEnricher.logError(err, req, res);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Elite Fitness Backend Server`);
  console.log(`================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Frontend URL: ${FRONTEND_URL}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                         - Health check');
  console.log('  GET  /api/health               - Public health check (CI/monitoring)');
  console.log('');
  console.log('  Auth:');
  console.log('    POST /api/auth/sync-user     - Sync Firebase user to Supabase');
  console.log('    GET  /api/auth/me            - Get current user profile');
  console.log('    PATCH /api/auth/me           - Update user profile');
  console.log('');
  console.log('  Favorites:');
  console.log('    GET  /api/favorites          - Get user favorites (paginated)');
  console.log('    POST /api/favorites          - Add favorite');
  console.log('    DELETE /api/favorites/:id    - Remove favorite');
  console.log('    GET  /api/favorites/check/:id - Check if favorited');
  console.log('');
  console.log('  Content:');
  console.log('    GET  /api/content            - Get all content (filtered)');
  console.log('    GET  /api/content/search     - Search content');
  console.log('    GET  /api/content/:id        - Get content by ID');
  console.log('    GET  /api/content/category/:cat - Get content by category');
  console.log('');
  console.log('  Proposals:');
  console.log('    POST /api/proposals          - Create new proposal');
  console.log('    GET  /api/proposals          - Get all proposals (paginated)');
  console.log('    GET  /api/proposals/:id      - Get proposal by ID');
  console.log('    PATCH /api/proposals/:id     - Update proposal status');
  console.log('    DELETE /api/proposals/:id    - Delete proposal');
  console.log('    GET  /api/proposals/clients/:name - Get client memory');
  console.log('');
  console.log('  Membership:');
  console.log('    GET  /api/membership         - Get membership status');
  console.log('    POST /api/membership/upgrade  - Upgrade membership');
  console.log('    POST /api/membership/cancel   - Cancel membership');
  console.log('');
  console.log('  Admin:');
  console.log('    GET  /api/admin/users          - Get all users (admin)');
  console.log('    GET  /api/admin/analytics      - Get system analytics');
  console.log('    POST /api/admin/notifications  - Send notifications');
  console.log('');
  console.log('  Notifications:');
  console.log('    GET  /api/notifications      - Get user notifications');
  console.log('');
});

// Start self-correcting runtime
// startSelfCorrectingRuntime(app);
