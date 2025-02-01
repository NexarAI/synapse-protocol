import { Connection, Keypair } from '@solana/web3.js';
import { SecurityModule } from '../security/SecurityModule';
import { ConfigManager } from '../utils/ConfigManager';

/**
 * Network types supported by the protocol
 */
export type NetworkType = 
  | 'mainnet-beta'
  | 'testnet'
  | 'devnet'
  | string;

/**
 * Log levels for the logger
 */
export type LogLevel = 
  | 'debug'
  | 'info'
  | 'warn'
  | 'error';

/**
 * Security configuration options
 */
export interface SecurityConfig {
  encryptionLevel: 'AES-256' | 'AES-512';
  auditFrequency: 'hourly' | 'daily' | 'weekly';
  modelVerification: boolean;
  accessControl: {
    roles: string[];
    permissions: Record<string, string[]>;
  };
}

/**
 * Neural Mesh node configuration
 */
export interface NodeConfig {
  nodeType: 'compute' | 'storage' | 'validator';
  capacity: 'low' | 'medium' | 'high';
  region?: string;
  redundancy?: number;
  maxConnections?: number;
}

/**
 * AI model configuration
 */
export interface ModelConfig {
  type: 'prediction' | 'classification' | 'generation';
  file: string;
  config: {
    inputShape: number[];
    outputShape: number[];
    monitoring?: {
      metrics: string[];
      alerts: boolean;
    };
  };
}

/**
 * Main protocol configuration
 */
export interface SynapseConfig {
  network: NetworkType;
  privateKey?: string;
  logLevel: LogLevel;
  security: SecurityConfig;
  node: NodeConfig;
  rpcEndpoint?: string;
  maxRetries: number;
  timeout: number;
}

/**
 * Neural Mesh initialization options
 */
export interface NeuralMeshOptions {
  connection: Connection;
  keypair: Keypair;
  security: SecurityModule;
  config: ConfigManager;
}

/**
 * Model deployment result
 */
export interface ModelDeployment {
  id: string;
  status: 'pending' | 'active' | 'failed';
  endpoint: string;
  metrics: {
    latency: number;
    throughput: number;
    accuracy: number;
  };
}

/**
 * Protocol metrics
 */
export interface ProtocolMetrics {
  activeNodes: number;
  totalModels: number;
  networkLatency: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    storage: number;
  };
  transactions: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Event types that can be emitted by the protocol
 */
export type EventType = 
  | 'modelDeployed'
  | 'nodeConnected'
  | 'nodeDisconnected'
  | 'securityAlert'
  | 'configUpdated'
  | 'error';

/**
 * Event payload structure
 */
export interface EventPayload {
  type: EventType;
  timestamp: number;
  data: any;
}

/**
 * Error codes used throughout the protocol
 */
export enum ErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  INVALID_CONFIG = 'INVALID_CONFIG',
  NODE_OFFLINE = 'NODE_OFFLINE',
  MODEL_ERROR = 'MODEL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
} 