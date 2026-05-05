/**
 * Mass Assignment Prevention Middleware
 * 
 * Prevents mass assignment attacks by strictly validating input schemas
 * Enforces .strict() Zod validation and removes dangerous properties
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

interface MassAssignmentConfig {
  logValidationFailures: boolean;
  strictMode: boolean;
  removeDangerousProps: boolean;
}

class MassAssignmentPrevention {
  private config: MassAssignmentConfig = {
    logValidationFailures: true,
    strictMode: true,
    removeDangerousProps: true
  };

  /**
   * Define strict schemas for different resource types
   */
  private schemas = {
    user: z.object({
      email: z.string().email(),
      name: z.string().min(2).max(50),
      preferences: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean()
      }).optional()
    }).strict(),

    content: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000),
      category: z.string().max(50),
      tags: z.array(z.string().max(20)).max(5).optional()
    }).strict(),

    proposal: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000),
      category: z.string().max(50),
      client_name: z.string().min(1).max(100),
      status: z.enum(['pending', 'approved', 'rejected'])
    }).strict(),

    favorite: z.object({
      content_id: z.string().uuid(),
      category: z.string().max(50).optional()
    }).strict(),

    membership: z.object({
      plan: z.enum(['basic', 'premium', 'enterprise']),
      status: z.enum(['active', 'inactive', 'cancelled'])
    }).strict()
  };

  /**
   * Remove dangerous properties from input
   */
  private removeDangerousProperties(obj: any): any {
    const dangerousKeys = [
      '__proto__',
      'constructor',
      'prototype',
      'role',
      'tenantId',
      'isAdmin',
      'id',
      'userId',
      'createdAt',
      'updatedAt',
      'deletedAt'
    ];

    const sanitized = { ...obj };

    for (const key of dangerousKeys) {
      delete sanitized[key];
    }

    return sanitized;
  }

  /**
   * Validate input against strict schema
   */
  private validateInput(input: any, schema: z.ZodSchema, resourceType: string): { valid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];

    try {
      // Remove dangerous properties first
      let sanitized = this.config.removeDangerousProps ? this.removeDangerousProperties(input) : input;

      // Validate against strict schema
      const validated = schema.parse(sanitized);

      return { valid: true, sanitized: validated, errors: [] };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errors.push(...error.issues.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed');
      }

      // Log validation failures for security monitoring
      if (this.config.logValidationFailures) {
        console.error(`[MASS ASSIGNMENT] Validation failed for ${resourceType}:`, {
          errors,
          input: this.config.removeDangerousProps ? this.removeDangerousProperties(input) : input,
          timestamp: new Date().toISOString()
        });
      }

      return { valid: false, sanitized: null, errors };
    }
  }

  /**
   * Middleware to prevent mass assignment for specific resource type
   */
  preventMassAssignment(resourceType: keyof typeof this.schemas) {
    const schema = this.schemas[resourceType];

    if (!schema) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const validation = this.validateInput(req.body, schema, resourceType);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains invalid or prohibited data',
          details: validation.errors,
          blocked: true
        });
      }

      // Replace request body with validated data
      req.body = validation.sanitized;
      next();
    };
  }

  /**
   * Generic mass assignment prevention middleware
   */
  preventGenericMassAssignment() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      // Remove dangerous properties from any input
      const sanitized = this.removeDangerousProperties(req.body);

      // Check for suspicious properties
      const suspiciousKeys = ['role', 'isAdmin', 'tenantId', 'userId'];
      const foundSuspicious = suspiciousKeys.some(key => key in req.body);

      if (foundSuspicious) {
        console.warn(`[MASS ASSIGNMENT] Suspicious properties detected:`, {
          suspiciousKeys: suspiciousKeys.filter(key => key in req.body),
          ip: req.ip,
          path: req.path,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains prohibited properties',
          blocked: true
        });
      }

      req.body = sanitized;
      next();
    };
  }

  /**
   * Create safe input object with only allowed properties
   */
  createSafeInput(input: any, allowedKeys: string[]): any {
    const safe: any = {};

    for (const key of allowedKeys) {
      if (key in input) {
        safe[key] = input[key];
      }
    }

    return safe;
  }
}

// Export singleton instance
export const massAssignmentPrevention = new MassAssignmentPrevention();

// Export middleware functions
export const {
  preventMassAssignment,
  preventGenericMassAssignment,
  createSafeInput
} = massAssignmentPrevention;
