import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());

// ✅ PUBLIC HEALTH CHECK (for CI, Render, uptime checks)
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Elite Fitness Backend Server`);
  console.log(`================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                         - Health check');
  console.log('  GET  /api/health               - Public health check (CI/monitoring)');
  console.log('');
});
