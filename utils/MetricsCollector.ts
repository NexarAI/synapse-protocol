import { ProtocolMetrics } from '../types';
import { EventEmitter } from 'events';

/**
 * Metrics collector for gathering performance and usage statistics
 */
export class MetricsCollector extends EventEmitter {
  private metrics: ProtocolMetrics;
  private readonly updateInterval: number;
  private intervalId?: NodeJS.Timeout;

  constructor(updateInterval: number = 5000) {
    super();
    this.updateInterval = updateInterval;
    this.metrics = this.initializeMetrics();
    this.startCollection();
  }

  /**
   * Initialize metrics with default values
   */
  private initializeMetrics(): ProtocolMetrics {
    return {
      activeNodes: 0,
      totalModels: 0,
      networkLatency: 0,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        storage: 0
      },
      transactions: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };
  }

  /**
   * Start collecting metrics
   */
  private startCollection(): void {
    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, this.updateInterval);
  }

  /**
   * Stop collecting metrics
   */
  public stopCollection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Update metrics with current values
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Update resource utilization
      const resourceMetrics = await this.collectResourceMetrics();
      this.metrics.resourceUtilization = resourceMetrics;

      // Update network latency
      this.metrics.networkLatency = await this.measureNetworkLatency();

      this.emit('metricsUpdated', this.metrics);
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Collect system resource metrics
   */
  private async collectResourceMetrics(): Promise<{ cpu: number; memory: number; storage: number }> {
    // This would typically involve platform-specific implementations
    // For now, we'll return mock values
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      storage: Math.random() * 100
    };
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    // This would typically involve actual network measurements
    // For now, we'll return a mock value
    return Math.random() * 100;
  }

  /**
   * Record a transaction
   */
  public recordTransaction(successful: boolean): void {
    this.metrics.transactions.total++;
    if (successful) {
      this.metrics.transactions.successful++;
    } else {
      this.metrics.transactions.failed++;
    }
    this.emit('transactionRecorded', { successful });
  }

  /**
   * Update node count
   */
  public updateNodeCount(count: number): void {
    this.metrics.activeNodes = count;
    this.emit('nodeCountUpdated', count);
  }

  /**
   * Update model count
   */
  public updateModelCount(count: number): void {
    this.metrics.totalModels = count;
    this.emit('modelCountUpdated', count);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ProtocolMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics to initial values
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.emit('metricsReset');
  }

  /**
   * Get specific metric value
   */
  public getMetric<K extends keyof ProtocolMetrics>(key: K): ProtocolMetrics[K] {
    return this.metrics[key];
  }

  /**
   * Subscribe to metric updates
   */
  public onMetricsUpdate(callback: (metrics: ProtocolMetrics) => void): void {
    this.on('metricsUpdated', callback);
  }

  /**
   * Unsubscribe from metric updates
   */
  public offMetricsUpdate(callback: (metrics: ProtocolMetrics) => void): void {
    this.off('metricsUpdated', callback);
  }

  /**
   * Export metrics to JSON
   */
  public toJSON(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    }, null, 2);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopCollection();
    this.removeAllListeners();
  }
} 