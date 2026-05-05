/**
 * Input Validation Middleware
 * 
 * Comprehensive input validation using Zod schema
 * Prevents XSS, SQL injection, and injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation schemas
const contentQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().min(1).max(100),
    "Limit must be a number between 1 and 100"
  ),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().min(0),
    "Offset must be a non-negative number"
  ),
  search: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(5).optional()
});

const contentIdSchema = z.object({
  id: z.string().uuid("Invalid content ID format")
});

const userUpdateSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1).max(100).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.boolean().optional()
  }).optional()
});

const favoriteSchema = z.object({
  content_id: z.string().uuid("Invalid content ID"),
  category: z.string().max(50).optional()
});

const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  category: z.string().max(50),
  client_name: z.string().min(1).max(100),
  status: z.enum(['pending', 'approved', 'rejected'])
});

class InputValidator {
  /**
   * Validate content query parameters
   */
  validateContentQuery(req: Request, res: Response, next: NextFunction): void {
    try {
      const validated = contentQuerySchema.parse(req.query);
      req.query = validated;
      next();
    } catch (error: any) {
      console.warn('[INPUT VALIDATION] Content query validation failed:', error.errors);
      res.status(400).json({
        error: 'Invalid query parameters',
        message: 'Request contains invalid parameters',
        details: error.errors
      });
    }
  }

  /**
   * Validate content ID parameter
   */
  validateContentId(req: Request, res: Response, next: NextFunction): void {
    try {
      const validated = contentIdSchema.parse(req.params);
      req.params = validated;
      next();
    } catch (error: any) {
      console.warn('[INPUT VALIDATION] Content ID validation failed:', error.errors);
      res.status(400).json({
        error: 'Invalid content ID',
        message: 'Content ID must be a valid UUID',
        details: error.errors
      });
    }
  }

  /**
   * Validate user update data
   */
  validateUserUpdate(req: Request, res: Response, next: NextFunction): void {
    try {
      const validated = userUpdateSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      console.warn('[INPUT VALIDATION] User update validation failed:', error.errors);
      res.status(400).json({
        error: 'Invalid user data',
        message: 'Request contains invalid user data',
        details: error.errors
      });
    }
  }

  /**
   * Validate favorite creation
   */
  validateFavorite(req: Request, res: Response, next: NextFunction): void {
    try {
      const validated = favoriteSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      console.warn('[INPUT VALIDATION] Favorite validation failed:', error.errors);
      res.status(400).json({
        error: 'Invalid favorite data',
        message: 'Request contains invalid favorite data',
        details: error.errors
      });
    }
  }

  /**
   * Validate proposal creation
   */
  validateProposal(req: Request, res: Response, next: NextFunction): void {
    try {
      const validated = proposalSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      console.warn('[INPUT VALIDATION] Proposal validation failed:', error.errors);
      res.status(400).json({
        error: 'Invalid proposal data',
        message: 'Request contains invalid proposal data',
        details: error.errors
      });
    }
  }

  /**
   * Generic request body sanitization
   */
  sanitizeRequestBody(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      // Remove dangerous properties
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      const sanitized = { ...req.body };
      
      for (const key of dangerousKeys) {
        delete sanitized[key];
      }
      
      req.body = sanitized;
    }
    
    next();
  }
}

// Export middleware functions
export const inputValidator = new InputValidator();

export const {
  validateContentQuery,
  validateContentId,
  validateUserUpdate,
  validateFavorite,
  validateProposal,
  sanitizeRequestBody
} = inputValidator;
