import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ✅ SECURITY HEADERS (FIRST)
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

// ✅ BODY PARSING
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ COOKIE PARSING
app.use(cookieParser());

// ✅ COMPRESSION
app.use(compression());

// ✅ RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ✅ CORS PROTECTION
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

// ✅ HEALTH ENDPOINTS (PUBLIC - MUST BE FIRST ROUTES)
app.get('/', (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  
  res.json({
    status: 'ok',
    message: 'Elite Fitness Backend API',
    timestamp,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ✅ SIMPLE AUTH MIDDLEWARE FOR PROTECTED ROUTES
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Simple token check for now - replace with real auth later
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  // TODO: Add real JWT verification here
  next();
};

// ✅ PROTECTED API ROUTES
app.get('/api/protected', requireAuth, (req: Request, res: Response) => {
  res.json({
    message: 'Protected content',
    user: 'authenticated_user',
    timestamp: new Date().toISOString()
  });
});

// ✅ ERROR HANDLER
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message || err);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// ✅ 404 HANDLER
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ✅ START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Elite Fitness Backend Server`);
  console.log(`================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Frontend URL: ${FRONTEND_URL}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                         - Health check');
  console.log('  GET  /health                   - Health check');
  console.log('  GET  /api/health              - API health check');
  console.log('  GET  /api/protected           - Protected route (requires auth)');
  console.log('');
  console.log('Security features active:');
  console.log('  ✅ Helmet security headers');
  console.log('  ✅ CORS protection');
  console.log('  ✅ Rate limiting');
  console.log('  ✅ Compression');
  console.log('  ✅ Body parsing');
  console.log('  ✅ Cookie parsing');
  console.log('  ✅ Error handling');
});

export default app;
