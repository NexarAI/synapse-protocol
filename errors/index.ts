import { ErrorCode } from '../types';

/**
 * Base error class for all Synapse Protocol errors
 */
export class SynapseError extends Error {
  public code: ErrorCode;
  public timestamp: number;
  public details?: any;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      cause?: Error;
      details?: any;
    } = {}
  ) {
    super(message);
    this.name = 'SynapseError';
    this.code = options.code || ErrorCode.NETWORK_ERROR;
    this.cause = options.cause;
    this.details = options.details;
    this.timestamp = Date.now();
  }

  /**
   * Converts the error to a JSON object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack,
      cause: this.cause instanceof Error ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : this.cause
    };
  }
}

/**
 * Error thrown when initialization fails
 */
export class InitializationError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.INITIALIZATION_FAILED
    });
    this.name = 'InitializationError';
  }
}

/**
 * Error thrown when connection fails
 */
export class ConnectionError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.CONNECTION_FAILED
    });
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when model deployment fails
 */
export class DeploymentError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.DEPLOYMENT_FAILED
    });
    this.name = 'DeploymentError';
  }
}

/**
 * Error thrown when a security violation is detected
 */
export class SecurityError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.SECURITY_VIOLATION
    });
    this.name = 'SecurityError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.INVALID_CONFIG
    });
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when a node is offline
 */
export class NodeError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.NODE_OFFLINE
    });
    this.name = 'NodeError';
  }
}

/**
 * Error thrown when an AI model encounters an error
 */
export class ModelError extends SynapseError {
  constructor(message: string, options: { cause?: Error; details?: any } = {}) {
    super(message, {
      ...options,
      code: ErrorCode.MODEL_ERROR
    });
    this.name = 'ModelError';
  }
}

/**
 * Helper function to wrap async functions with error handling
 */
export function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch(error => {
    if (error instanceof SynapseError) {
      throw error;
    }
    throw new SynapseError('An unexpected error occurred', {
      cause: error
    });
  });
}

/**
 * Helper function to create a specific error type based on error code
 */
export function createError(
  code: ErrorCode,
  message: string,
  options: { cause?: Error; details?: any } = {}
): SynapseError {
  switch (code) {
    case ErrorCode.INITIALIZATION_FAILED:
      return new InitializationError(message, options);
    case ErrorCode.CONNECTION_FAILED:
      return new ConnectionError(message, options);
    case ErrorCode.DEPLOYMENT_FAILED:
      return new DeploymentError(message, options);
    case ErrorCode.SECURITY_VIOLATION:
      return new SecurityError(message, options);
    case ErrorCode.INVALID_CONFIG:
      return new ConfigurationError(message, options);
    case ErrorCode.NODE_OFFLINE:
      return new NodeError(message, options);
    case ErrorCode.MODEL_ERROR:
      return new ModelError(message, options);
    default:
      return new SynapseError(message, { ...options, code });
  }
} 