import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  message: {
    limit: 'Too many requests from this IP',
    value: '100 requests per minute'
  }
});
