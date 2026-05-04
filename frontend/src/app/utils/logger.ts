/**
 * Production-Grade Logger
 *
 * Structured logging with levels and production safety
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Safe environment check (works in both browser and Node.js)
const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

class Logger {
  private log(level: LogLevel, context: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

    // Production: only errors
    if (isProd && level !== 'error') {
      return;
    }

    // Development: all levels with color coding
    const method = level === 'error' ? console.error :
                   level === 'warn' ? console.warn :
                   console.log;

    method(prefix, message, ...args);
  }

  debug(context: string, message: string, ...args: any[]) {
    this.log('debug', context, message, ...args);
  }

  info(context: string, message: string, ...args: any[]) {
    this.log('info', context, message, ...args);
  }

  warn(context: string, message: string, ...args: any[]) {
    this.log('warn', context, message, ...args);
  }

  error(context: string, message: string, ...args: any[]) {
    this.log('error', context, message, ...args);
  }
}

export const logger = new Logger();
