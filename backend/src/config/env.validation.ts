/**
 * Environment Validation System
 * 
 * Bulletproof environment validation for production
 * Fails fast if critical variables are missing or invalid
 */

interface EnvConfig {
  // Core
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Firebase
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  
  // Frontend
  FRONTEND_URL: string;
  
  // Optional
  SENTRY_DSN?: string;
  REDIS_URL?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvConfig>;
}

class EnvValidator {
  private requiredVars: Array<keyof EnvConfig> = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FRONTEND_URL'
  ];

  /**
   * Validate all environment variables
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config: Partial<EnvConfig> = {};

    console.log('[ENV VALIDATION] Starting environment validation...');

    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
      errors.push('NODE_ENV is required');
    } else if (!['development', 'production', 'test'].includes(nodeEnv)) {
      errors.push(`NODE_ENV must be one of: development, production, test. Got: ${nodeEnv}`);
    } else {
      config.NODE_ENV = nodeEnv as 'development' | 'production' | 'test';
    }

    // Validate PORT
    const port = process.env.PORT;
    if (!port) {
      errors.push('PORT is required');
    } else {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`PORT must be a valid port number (1-65535). Got: ${port}`);
      } else {
        config.PORT = portNum;
      }
    }

    // Validate SUPABASE_URL
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      errors.push('SUPABASE_URL is required');
    } else {
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase.co')) {
          warnings.push('SUPABASE_URL does not appear to be a valid Supabase URL');
        }
        config.SUPABASE_URL = supabaseUrl;
      } catch {
        errors.push(`SUPABASE_URL must be a valid URL. Got: ${supabaseUrl}`);
      }
    }

    // Validate SUPABASE_SERVICE_ROLE_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    } else {
      if (supabaseKey.length < 100) {
        errors.push('SUPABASE_SERVICE_ROLE_KEY appears to be too short (should be a JWT)');
      }
      config.SUPABASE_SERVICE_ROLE_KEY = supabaseKey;
    }

    // Validate FIREBASE_PROJECT_ID
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    if (!firebaseProjectId) {
      errors.push('FIREBASE_PROJECT_ID is required');
    } else {
      if (firebaseProjectId.length < 3) {
        errors.push('FIREBASE_PROJECT_ID appears to be invalid (too short)');
      }
      config.FIREBASE_PROJECT_ID = firebaseProjectId;
    }

    // Validate FIREBASE_CLIENT_EMAIL
    const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (!firebaseClientEmail) {
      errors.push('FIREBASE_CLIENT_EMAIL is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(firebaseClientEmail)) {
        errors.push(`FIREBASE_CLIENT_EMAIL must be a valid email. Got: ${firebaseClientEmail}`);
      }
      config.FIREBASE_CLIENT_EMAIL = firebaseClientEmail;
    }

    // Validate FIREBASE_PRIVATE_KEY
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!firebasePrivateKey) {
      errors.push('FIREBASE_PRIVATE_KEY is required');
    } else {
      if (!firebasePrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        errors.push('FIREBASE_PRIVATE_KEY must be a valid PEM private key');
      }
      config.FIREBASE_PRIVATE_KEY = firebasePrivateKey;
    }

    // Validate FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      errors.push('FRONTEND_URL is required');
    } else {
      try {
        const url = new URL(frontendUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('FRONTEND_URL must use HTTP or HTTPS protocol');
        }
        config.FRONTEND_URL = frontendUrl;
      } catch {
        errors.push(`FRONTEND_URL must be a valid URL. Got: ${frontendUrl}`);
      }
    }

    // Validate optional SENTRY_DSN
    const sentryDsn = process.env.SENTRY_DSN;
    if (sentryDsn) {
      try {
        const url = new URL(sentryDsn);
        if (!url.hostname.includes('sentry.io')) {
          warnings.push('SENTRY_DSN does not appear to be a valid Sentry DSN');
        }
        config.SENTRY_DSN = sentryDsn;
      } catch {
        warnings.push(`SENTRY_DSN must be a valid URL. Got: ${sentryDsn}`);
      }
    }

    // Validate optional REDIS_URL
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        if (!['redis:', 'rediss:'].includes(url.protocol)) {
          warnings.push('REDIS_URL should use redis:// or rediss:// protocol');
        }
        config.REDIS_URL = redisUrl;
      } catch {
        warnings.push(`REDIS_URL must be a valid URL. Got: ${redisUrl}`);
      }
    }

    // Production-specific validations
    if (config.NODE_ENV === 'production') {
      if (config.PORT && (config.PORT < 80 || config.PORT > 65535)) {
        errors.push('Production PORT should be a standard port (80, 443, or 3000-9999)');
      }

      if (config.FRONTEND_URL && config.FRONTEND_URL.startsWith('http://')) {
        warnings.push('Production FRONTEND_URL should use HTTPS for security');
      }

      if (!config.SENTRY_DSN) {
        warnings.push('Production deployment should include SENTRY_DSN for error tracking');
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    };

    // Log validation results
    if (result.valid) {
      console.log('[ENV VALIDATION] ✅ All required environment variables are valid');
      if (warnings.length > 0) {
        console.log('[ENV VALIDATION] ⚠️  Warnings:', warnings);
      }
    } else {
      console.error('[ENV VALIDATION] ❌ Validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      if (warnings.length > 0) {
        console.warn('[ENV VALIDATION] ⚠️  Warnings:', warnings);
      }
    }

    return result;
  }

  /**
   * Get validated environment configuration
   * Throws if validation fails
   */
  getConfig(): EnvConfig {
    const result = this.validate();
    
    if (!result.valid) {
      throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
    }

    return result.config as EnvConfig;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get environment-specific log level
   */
  getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
    const nodeEnv = process.env.NODE_ENV;
    switch (nodeEnv) {
      case 'production': return 'error';
      case 'test': return 'warn';
      default: return 'info';
    }
  }
}

// Export singleton instance
export const envValidator = new EnvValidator();

// Export class for testing
export { EnvValidator };

// Export type for use in other modules
export type { EnvConfig, ValidationResult };
