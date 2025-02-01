import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { ModelManager } from '../ai/ModelManager';
import { NeuralMesh } from './NeuralMesh';
import { SecurityModule } from '../security/SecurityModule';
import { ConfigManager } from '../utils/ConfigManager';
import { Logger } from '../utils/Logger';
import { MetricsCollector } from '../utils/MetricsCollector';
import { SynapseConfig, NetworkType, NodeConfig } from '../types';
import { DEFAULT_CONFIG } from '../config';
import { SynapseError } from '../errors';

/**
 * Main entry point for the Synapse Protocol SDK.
 * Manages the initialization and coordination of all protocol components.
 */
export class SynapseProtocol {
  private connection: Connection;
  private keypair: Keypair;
  private modelManager: ModelManager;
  private neuralMesh: NeuralMesh;
  private security: SecurityModule;
  private config: ConfigManager;
  private metrics: MetricsCollector;
  private logger: Logger;

  constructor(config: Partial<SynapseConfig> = {}) {
    this.config = new ConfigManager({ ...DEFAULT_CONFIG, ...config });
    this.logger = new Logger(this.config.get('logLevel'));
    this.metrics = new MetricsCollector();
    
    this.logger.info('Initializing Synapse Protocol SDK...');
  }

  /**
   * Initializes the protocol and establishes necessary connections.
   */
  public async initialize(): Promise<void> {
    try {
      await this.setupConnection();
      await this.setupSecurity();
      await this.setupNeuralMesh();
      await this.setupModelManager();

      this.logger.info('Synapse Protocol SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Synapse Protocol SDK', error);
      throw new SynapseError('Initialization failed', { cause: error });
    }
  }

  /**
   * Connects to the Neural Mesh network.
   * @param config Configuration for the mesh node
   */
  public async connectToMesh(config: NodeConfig): Promise<NeuralMesh> {
    try {
      await this.neuralMesh.connect(config);
      this.logger.info('Connected to Neural Mesh network');
      return this.neuralMesh;
    } catch (error) {
      this.logger.error('Failed to connect to Neural Mesh', error);
      throw new SynapseError('Mesh connection failed', { cause: error });
    }
  }

  /**
   * Deploys an AI model to the network.
   * @param modelConfig Configuration for the model deployment
   */
  public async deployModel(modelConfig: any): Promise<any> {
    try {
      const model = await this.modelManager.deployModel(modelConfig);
      this.logger.info('Model deployed successfully', { modelId: model.id });
      return model;
    } catch (error) {
      this.logger.error('Failed to deploy model', error);
      throw new SynapseError('Model deployment failed', { cause: error });
    }
  }

  /**
   * Creates a new adaptive smart contract.
   * @param contractConfig Configuration for the smart contract
   */
  public async createAdaptiveContract(contractConfig: any): Promise<any> {
    try {
      // Implementation for creating adaptive contracts
      this.logger.info('Creating adaptive contract...');
      return {};
    } catch (error) {
      this.logger.error('Failed to create adaptive contract', error);
      throw new SynapseError('Contract creation failed', { cause: error });
    }
  }

  /**
   * Sets up the connection to the Solana network.
   */
  private async setupConnection(): Promise<void> {
    const endpoint = this.config.get('network') as NetworkType;
    this.connection = new Connection(endpoint);
    
    // Load or generate keypair
    const privateKey = this.config.get('privateKey');
    this.keypair = privateKey 
      ? Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'))
      : Keypair.generate();

    await this.connection.getAccountInfo(this.keypair.publicKey);
  }

  /**
   * Initializes the security module.
   */
  private async setupSecurity(): Promise<void> {
    this.security = new SecurityModule(this.config.get('security'));
    await this.security.initialize();
  }

  /**
   * Sets up the Neural Mesh network.
   */
  private async setupNeuralMesh(): Promise<void> {
    this.neuralMesh = new NeuralMesh({
      connection: this.connection,
      keypair: this.keypair,
      security: this.security,
      config: this.config
    });
    await this.neuralMesh.initialize();
  }

  /**
   * Initializes the model manager.
   */
  private async setupModelManager(): Promise<void> {
    this.modelManager = new ModelManager({
      mesh: this.neuralMesh,
      security: this.security,
      config: this.config
    });
    await this.modelManager.initialize();
  }

  /**
   * Gets the current protocol metrics.
   */
  public getMetrics(): any {
    return this.metrics.getMetrics();
  }

  /**
   * Gets the protocol configuration.
   */
  public getConfig(): any {
    return this.config.getAll();
  }

  /**
   * Updates the protocol configuration.
   * @param updates Configuration updates
   */
  public async updateConfig(updates: Partial<SynapseConfig>): Promise<void> {
    await this.config.update(updates);
    this.logger.info('Configuration updated successfully');
  }

  /**
   * Gracefully shuts down the protocol.
   */
  public async shutdown(): Promise<void> {
    try {
      await this.neuralMesh.disconnect();
      await this.modelManager.shutdown();
      await this.security.shutdown();
      this.logger.info('Protocol shutdown completed successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw new SynapseError('Shutdown failed', { cause: error });
    }
  }
} 