import { SynapseConfig } from '../types';

/**
 * Default configuration for the Synapse Protocol
 */
export const DEFAULT_CONFIG: SynapseConfig = {
  network: 'mainnet-beta',
  logLevel: 'info',
  security: {
    encryptionLevel: 'AES-256',
    auditFrequency: 'daily',
    modelVerification: true,
    accessControl: {
      roles: ['admin', 'user'],
      permissions: {
        admin: ['read', 'write', 'deploy', 'manage'],
        user: ['read']
      }
    }
  },
  node: {
    nodeType: 'compute',
    capacity: 'medium',
    redundancy: 0.99,
    maxConnections: 1000
  },
  maxRetries: 3,
  timeout: 30000 // 30 seconds
};

/**
 * Network endpoints for different environments
 */
export const NETWORK_ENDPOINTS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'devnet': 'https://api.devnet.solana.com'
};

/**
 * Default neural network configurations
 */
export const DEFAULT_NEURAL_CONFIGS = {
  small: {
    layers: [64, 32, 16],
    activation: 'relu',
    optimizer: 'adam',
    learningRate: 0.001
  },
  medium: {
    layers: [128, 64, 32],
    activation: 'relu',
    optimizer: 'adam',
    learningRate: 0.001
  },
  large: {
    layers: [256, 128, 64],
    activation: 'relu',
    optimizer: 'adam',
    learningRate: 0.001
  }
};

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  TOKEN_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  REQUIRED_ENTROPY: 70,
  HASH_ROUNDS: 10
};

/**
 * Performance tuning parameters
 */
export const PERFORMANCE_CONFIGS = {
  batchSize: 32,
  cacheSize: 1000,
  workerThreads: 4,
  maxConcurrentRequests: 100,
  timeoutMS: 5000,
  retryDelayMS: 1000
};

/**
 * Protocol limits
 */
export const PROTOCOL_LIMITS = {
  maxNodesPerNetwork: 1000,
  maxModelsPerNode: 10,
  maxConnectionsPerNode: 100,
  maxRequestsPerSecond: 1000,
  maxDataSizeBytes: 10 * 1024 * 1024 // 10MB
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INITIALIZATION: 'Failed to initialize Synapse Protocol',
  CONNECTION: 'Failed to establish connection',
  INVALID_CONFIG: 'Invalid configuration provided',
  SECURITY_VIOLATION: 'Security violation detected',
  NODE_OFFLINE: 'Neural Mesh node is offline',
  MODEL_ERROR: 'Error in AI model operation',
  NETWORK_ERROR: 'Network communication error'
};

/**
 * Feature flags for experimental features
 */
export const FEATURE_FLAGS = {
  enableExperimentalModels: false,
  useNewOptimizer: false,
  enableAdvancedMetrics: true,
  useGPUAcceleration: true,
  enableAutoScaling: true
}; 