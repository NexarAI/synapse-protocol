import { NeuralMesh } from '../core/NeuralMesh';
import { SecurityModule } from '../security/SecurityModule';
import { ConfigManager } from '../utils/ConfigManager';
import { Logger } from '../utils/Logger';
import { ModelConfig, ModelDeployment } from '../types';
import { ModelError, DeploymentError } from '../errors';
import { EventEmitter } from 'events';
import * as onnx from 'onnxruntime-node';
import * as tf from '@tensorflow/tfjs-node';

/**
 * Model deployment state
 */
interface ModelState {
  id: string;
  config: ModelConfig;
  status: 'pending' | 'active' | 'failed';
  metrics: {
    latency: number;
    throughput: number;
    accuracy: number;
    lastUpdated: number;
  };
  runtime: onnx.InferenceSession | tf.LayersModel;
}

/**
 * AI Model Manager
 * Handles model deployment and execution across the Neural Mesh network
 */
export class ModelManager extends EventEmitter {
  private readonly mesh: NeuralMesh;
  private readonly security: SecurityModule;
  private readonly config: ConfigManager;
  private readonly logger: Logger;
  private models: Map<string, ModelState>;
  private isInitialized: boolean;

  constructor(options: {
    mesh: NeuralMesh;
    security: SecurityModule;
    config: ConfigManager;
  }) {
    super();
    this.mesh = options.mesh;
    this.security = options.security;
    this.config = options.config;
    this.logger = Logger.forModule('ModelManager');
    this.models = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the model manager
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Model Manager...');

      // Initialize ONNX runtime
      await onnx.env.init();

      // Initialize TensorFlow
      await tf.ready();

      this.isInitialized = true;
      this.logger.info('Model Manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Model Manager', error);
      throw new ModelError('Model Manager initialization failed', { cause: error });
    }
  }

  /**
   * Deploy a new AI model
   */
  public async deployModel(config: ModelConfig): Promise<ModelDeployment> {
    if (!this.isInitialized) {
      throw new ModelError('Model Manager not initialized');
    }

    try {
      this.logger.info('Deploying model...', { config });

      // Validate model configuration
      await this.validateModelConfig(config);

      // Create model state
      const modelState: ModelState = {
        id: this.generateModelId(),
        config,
        status: 'pending',
        metrics: {
          latency: 0,
          throughput: 0,
          accuracy: 0,
          lastUpdated: Date.now()
        },
        runtime: await this.loadModel(config)
      };

      // Add to local state
      this.models.set(modelState.id, modelState);

      // Update status
      modelState.status = 'active';
      this.emit('modelDeployed', this.createDeploymentResponse(modelState));

      this.logger.info('Model deployed successfully', { modelId: modelState.id });

      return this.createDeploymentResponse(modelState);
    } catch (error) {
      this.logger.error('Failed to deploy model', error);
      throw new DeploymentError('Model deployment failed', { cause: error });
    }
  }

  /**
   * Load a model into memory
   */
  private async loadModel(config: ModelConfig): Promise<onnx.InferenceSession | tf.LayersModel> {
    try {
      if (config.file.endsWith('.onnx')) {
        return await onnx.InferenceSession.create(config.file);
      } else {
        return await tf.loadLayersModel(`file://${config.file}`);
      }
    } catch (error) {
      throw new ModelError('Failed to load model', { cause: error });
    }
  }

  /**
   * Validate model configuration
   */
  private async validateModelConfig(config: ModelConfig): Promise<void> {
    if (!config.file || !config.type || !config.config) {
      throw new ModelError('Invalid model configuration');
    }

    // Verify file exists and is accessible
    try {
      await this.security.verifyFile(config.file);
    } catch (error) {
      throw new ModelError('Model file verification failed', { cause: error });
    }
  }

  /**
   * Generate a unique model ID
   */
  private generateModelId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create deployment response
   */
  private createDeploymentResponse(state: ModelState): ModelDeployment {
    return {
      id: state.id,
      status: state.status,
      endpoint: `https://api.synapseprotocol.ai/models/${state.id}`,
      metrics: {
        latency: state.metrics.latency,
        throughput: state.metrics.throughput,
        accuracy: state.metrics.accuracy
      }
    };
  }

  /**
   * Get all deployed models
   */
  public getModels(): ModelDeployment[] {
    return Array.from(this.models.values()).map(state => 
      this.createDeploymentResponse(state)
    );
  }

  /**
   * Get a specific model
   */
  public getModel(modelId: string): ModelDeployment | undefined {
    const state = this.models.get(modelId);
    return state ? this.createDeploymentResponse(state) : undefined;
  }

  /**
   * Execute model inference
   */
  public async executeModel(modelId: string, input: any): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new ModelError('Model not found');
    }

    try {
      const startTime = Date.now();

      let output;
      if (model.runtime instanceof onnx.InferenceSession) {
        const feeds = { input: new onnx.Tensor(input) };
        output = await model.runtime.run(feeds);
      } else {
        const tensor = tf.tensor(input);
        output = await model.runtime.predict(tensor);
      }

      // Update metrics
      model.metrics.latency = Date.now() - startTime;
      model.metrics.throughput = 1000 / model.metrics.latency;
      model.metrics.lastUpdated = Date.now();

      return output;
    } catch (error) {
      throw new ModelError('Model execution failed', { cause: error });
    }
  }

  /**
   * Update model configuration
   */
  public async updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<ModelDeployment> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new ModelError('Model not found');
    }

    try {
      // Validate updates
      await this.validateModelConfig({ ...model.config, ...updates });

      // Apply updates
      model.config = { ...model.config, ...updates };

      // Reload model if necessary
      if (updates.file) {
        model.runtime = await this.loadModel(model.config);
      }

      this.emit('modelUpdated', this.createDeploymentResponse(model));
      return this.createDeploymentResponse(model);
    } catch (error) {
      throw new ModelError('Model update failed', { cause: error });
    }
  }

  /**
   * Delete a model
   */
  public async deleteModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new ModelError('Model not found');
    }

    try {
      // Cleanup resources
      if (model.runtime instanceof tf.LayersModel) {
        model.runtime.dispose();
      }

      this.models.delete(modelId);
      this.emit('modelDeleted', { modelId });
    } catch (error) {
      throw new ModelError('Model deletion failed', { cause: error });
    }
  }

  /**
   * Shutdown the model manager
   */
  public async shutdown(): Promise<void> {
    try {
      // Cleanup all models
      for (const [modelId, model] of this.models) {
        await this.deleteModel(modelId);
      }

      this.isInitialized = false;
      this.logger.info('Model Manager shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }
} 