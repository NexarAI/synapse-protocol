import { SynapseConfig } from '../types';
import { ConfigurationError } from '../errors';
import { DEFAULT_CONFIG } from '../config';
import { EventEmitter } from 'events';

/**
 * Configuration manager for handling SDK configuration
 */
export class ConfigManager extends EventEmitter {
  private config: SynapseConfig;
  private readonly validators: Map<keyof SynapseConfig, (value: any) => boolean>;

  constructor(initialConfig: Partial<SynapseConfig> = {}) {
    super();
    this.validators = this.setupValidators();
    this.config = this.validateConfig({ ...DEFAULT_CONFIG, ...initialConfig });
  }

  /**
   * Set up validators for configuration properties
   */
  private setupValidators(): Map<keyof SynapseConfig, (value: any) => boolean> {
    const validators = new Map();

    validators.set('network', (value: string) => {
      return ['mainnet-beta', 'testnet', 'devnet'].includes(value) || 
             value.startsWith('http://') || 
             value.startsWith('https://');
    });

    validators.set('logLevel', (value: string) => {
      return ['debug', 'info', 'warn', 'error'].includes(value);
    });

    validators.set('security', (value: any) => {
      return value && 
             typeof value === 'object' && 
             ['AES-256', 'AES-512'].includes(value.encryptionLevel) &&
             ['hourly', 'daily', 'weekly'].includes(value.auditFrequency) &&
             typeof value.modelVerification === 'boolean';
    });

    validators.set('node', (value: any) => {
      return value && 
             typeof value === 'object' &&
             ['compute', 'storage', 'validator'].includes(value.nodeType) &&
             ['low', 'medium', 'high'].includes(value.capacity);
    });

    validators.set('maxRetries', (value: number) => {
      return typeof value === 'number' && value >= 0 && value <= 10;
    });

    validators.set('timeout', (value: number) => {
      return typeof value === 'number' && value >= 1000 && value <= 60000;
    });

    return validators;
  }

  /**
   * Validate the entire configuration object
   */
  private validateConfig(config: Partial<SynapseConfig>): SynapseConfig {
    for (const [key, validator] of this.validators) {
      if (key in config && !validator(config[key])) {
        throw new ConfigurationError(`Invalid configuration value for ${key}`);
      }
    }

    return config as SynapseConfig;
  }

  /**
   * Get a configuration value
   */
  public get<K extends keyof SynapseConfig>(key: K): SynapseConfig[K] {
    return this.config[key];
  }

  /**
   * Get all configuration values
   */
  public getAll(): SynapseConfig {
    return { ...this.config };
  }

  /**
   * Update configuration values
   */
  public async update(updates: Partial<SynapseConfig>): Promise<void> {
    const newConfig = { ...this.config, ...updates };
    const validatedConfig = this.validateConfig(newConfig);

    const changes = Object.entries(updates).reduce((acc, [key, value]) => {
      if (this.config[key as keyof SynapseConfig] !== value) {
        acc[key] = {
          old: this.config[key as keyof SynapseConfig],
          new: value
        };
      }
      return acc;
    }, {} as Record<string, { old: any; new: any }>);

    this.config = validatedConfig;

    if (Object.keys(changes).length > 0) {
      this.emit('configUpdated', changes);
    }
  }

  /**
   * Reset configuration to defaults
   */
  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.emit('configReset');
  }

  /**
   * Check if a configuration value exists
   */
  public has(key: keyof SynapseConfig): boolean {
    return key in this.config;
  }

  /**
   * Get a nested configuration value using dot notation
   */
  public getNested(path: string): any {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Set a nested configuration value using dot notation
   */
  public async setNested(path: string, value: any): Promise<void> {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this.config);
    target[lastKey] = value;

    // Validate the entire configuration after the update
    this.validateConfig(this.config);
    this.emit('configUpdated', { [path]: { old: undefined, new: value } });
  }

  /**
   * Subscribe to configuration changes
   */
  public onConfigChange(callback: (changes: Record<string, { old: any; new: any }>) => void): void {
    this.on('configUpdated', callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  public offConfigChange(callback: (changes: Record<string, { old: any; new: any }>) => void): void {
    this.off('configUpdated', callback);
  }

  /**
   * Export configuration to JSON
   */
  public toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public async fromJSON(json: string): Promise<void> {
    try {
      const config = JSON.parse(json);
      await this.update(config);
    } catch (error) {
      throw new ConfigurationError('Invalid configuration JSON', { cause: error });
    }
  }
} 