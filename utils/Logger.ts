import { LogLevel } from '../types';

/**
 * Logger utility class for handling logging throughout the SDK
 */
export class Logger {
  private level: LogLevel;
  private context: string;

  constructor(level: LogLevel = 'info', context: string = 'Synapse') {
    this.level = level;
    this.context = context;
  }

  /**
   * Log levels with their corresponding numeric values
   */
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  /**
   * ANSI color codes for different log levels
   */
  private static readonly COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m'   // Reset
  };

  /**
   * Check if the given log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return Logger.LOG_LEVELS[level] >= Logger.LOG_LEVELS[this.level];
  }

  /**
   * Format the log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const color = Logger.COLORS[level];
    const reset = Logger.COLORS.reset;
    
    let formattedMessage = `${color}[${timestamp}] [${this.context}] [${level.toUpperCase()}] ${message}${reset}`;
    
    if (meta) {
      formattedMessage += '\n' + JSON.stringify(meta, null, 2);
    }

    return formattedMessage;
  }

  /**
   * Set the log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set the logger context
   */
  public setContext(context: string): void {
    this.context = context;
  }

  /**
   * Create a child logger with a new context
   */
  public createChild(context: string): Logger {
    return new Logger(this.level, `${this.context}:${context}`);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  /**
   * Log an error message
   */
  public error(message: string, error?: Error, meta?: any): void {
    if (this.shouldLog('error')) {
      const errorMeta = error ? {
        ...meta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      } : meta;

      console.error(this.formatMessage('error', message, errorMeta));
    }
  }

  /**
   * Log a group of messages
   */
  public group(label: string, fn: () => void): void {
    if (this.shouldLog('debug')) {
      console.group(this.formatMessage('debug', label));
      fn();
      console.groupEnd();
    }
  }

  /**
   * Log execution time of a function
   */
  public async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.shouldLog('debug')) {
      return fn();
    }

    console.time(label);
    try {
      const result = await fn();
      console.timeEnd(label);
      return result;
    } catch (error) {
      console.timeEnd(label);
      throw error;
    }
  }

  /**
   * Create a logger instance for a specific module
   */
  public static forModule(module: string, level: LogLevel = 'info'): Logger {
    return new Logger(level, module);
  }
} 