import * as tf from '@tensorflow/tfjs-node';
import { Logger } from '../utils/Logger';
import { ModelError } from '../errors';
import { EventEmitter } from 'events';

/**
 * Learning module configuration
 */
interface LearningConfig {
  inputDimension: number;
  outputDimension: number;
  learningRate: number;
  hiddenLayers?: number[];
  activation?: string;
  optimizer?: string;
  batchSize?: number;
}

/**
 * Training metrics
 */
interface TrainingMetrics {
  loss: number;
  accuracy: number;
  epoch: number;
  timestamp: number;
}

/**
 * Learning Module
 * Handles machine learning functionality for adaptive components
 */
export class LearningModule extends EventEmitter {
  private readonly config: LearningConfig;
  private readonly logger: Logger;
  private model: tf.LayersModel | null;
  private isInitialized: boolean;
  private metrics: TrainingMetrics[];

  constructor(config: LearningConfig) {
    super();
    this.config = {
      ...config,
      hiddenLayers: config.hiddenLayers || [64, 32],
      activation: config.activation || 'relu',
      optimizer: config.optimizer || 'adam',
      batchSize: config.batchSize || 32
    };
    this.logger = Logger.forModule('LearningModule');
    this.model = null;
    this.isInitialized = false;
    this.metrics = [];
  }

  /**
   * Initialize the learning module
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Learning Module...');

      // Create neural network model
      this.model = this.createModel();

      // Compile model
      this.model.compile({
        optimizer: this.config.optimizer,
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });

      this.isInitialized = true;
      this.logger.info('Learning Module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Learning Module', error);
      throw new ModelError('Learning Module initialization failed', { cause: error });
    }
  }

  /**
   * Create the neural network model
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      units: this.config.hiddenLayers![0],
      activation: this.config.activation,
      inputShape: [this.config.inputDimension]
    }));

    // Hidden layers
    for (let i = 1; i < this.config.hiddenLayers!.length; i++) {
      model.add(tf.layers.dense({
        units: this.config.hiddenLayers![i],
        activation: this.config.activation
      }));
    }

    // Output layer
    model.add(tf.layers.dense({
      units: this.config.outputDimension,
      activation: 'linear'
    }));

    return model;
  }

  /**
   * Train the model on a single example
   */
  public async learn(input: number[], output: number[]): Promise<void> {
    if (!this.isInitialized || !this.model) {
      throw new ModelError('Learning Module not initialized');
    }

    try {
      // Convert to tensors
      const inputTensor = tf.tensor2d([input]);
      const outputTensor = tf.tensor2d([output]);

      // Train for one step
      const result = await this.model.trainOnBatch(inputTensor, outputTensor);

      // Update metrics
      this.updateMetrics(result as [number, number]);

      // Cleanup tensors
      inputTensor.dispose();
      outputTensor.dispose();

      this.emit('learned', {
        loss: result[0],
        accuracy: result[1]
      });
    } catch (error) {
      this.logger.error('Learning failed', error);
      throw new ModelError('Learning failed', { cause: error });
    }
  }

  /**
   * Train the model on a batch of examples
   */
  public async trainOnBatch(inputs: number[][], outputs: number[][]): Promise<void> {
    if (!this.isInitialized || !this.model) {
      throw new ModelError('Learning Module not initialized');
    }

    try {
      // Convert to tensors
      const inputTensor = tf.tensor2d(inputs);
      const outputTensor = tf.tensor2d(outputs);

      // Train on batch
      const result = await this.model.trainOnBatch(inputTensor, outputTensor);

      // Update metrics
      this.updateMetrics(result as [number, number]);

      // Cleanup tensors
      inputTensor.dispose();
      outputTensor.dispose();

      this.emit('batchTrained', {
        loss: result[0],
        accuracy: result[1],
        batchSize: inputs.length
      });
    } catch (error) {
      this.logger.error('Batch training failed', error);
      throw new ModelError('Batch training failed', { cause: error });
    }
  }

  /**
   * Make predictions using the model
   */
  public async predict(input: number[]): Promise<number[]> {
    if (!this.isInitialized || !this.model) {
      throw new ModelError('Learning Module not initialized');
    }

    try {
      // Convert to tensor
      const inputTensor = tf.tensor2d([input]);

      // Make prediction
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const result = await prediction.array() as number[][];

      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();

      return result[0];
    } catch (error) {
      this.logger.error('Prediction failed', error);
      throw new ModelError('Prediction failed', { cause: error });
    }
  }

  /**
   * Update training metrics
   */
  private updateMetrics(result: [number, number]): void {
    const metrics: TrainingMetrics = {
      loss: result[0],
      accuracy: result[1],
      epoch: this.metrics.length,
      timestamp: Date.now()
    };

    this.metrics.push(metrics);
    this.emit('metricsUpdated', metrics);
  }

  /**
   * Get training metrics
   */
  public getMetrics(): TrainingMetrics[] {
    return [...this.metrics];
  }

  /**
   * Save the model
   */
  public async saveModel(path: string): Promise<void> {
    if (!this.isInitialized || !this.model) {
      throw new ModelError('Learning Module not initialized');
    }

    try {
      await this.model.save(`file://${path}`);
      this.logger.info('Model saved successfully', { path });
    } catch (error) {
      this.logger.error('Failed to save model', error);
      throw new ModelError('Model save failed', { cause: error });
    }
  }

  /**
   * Load a saved model
   */
  public async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`file://${path}`);
      this.isInitialized = true;
      this.logger.info('Model loaded successfully', { path });
    } catch (error) {
      this.logger.error('Failed to load model', error);
      throw new ModelError('Model load failed', { cause: error });
    }
  }

  /**
   * Reset the learning module
   */
  public async reset(): Promise<void> {
    try {
      // Dispose current model
      if (this.model) {
        this.model.dispose();
      }

      // Create new model
      this.model = this.createModel();
      this.model.compile({
        optimizer: this.config.optimizer,
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });

      // Reset metrics
      this.metrics = [];

      this.emit('reset');
      this.logger.info('Learning Module reset successfully');
    } catch (error) {
      this.logger.error('Failed to reset Learning Module', error);
      throw new ModelError('Learning Module reset failed', { cause: error });
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    this.metrics = [];
  }
} 