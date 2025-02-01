import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SynapseClient } from '../api/src/services/synapseClient';
import * as tf from '@tensorflow/tfjs-node';
import * as dotenv from 'dotenv';

dotenv.config();

class DistributedTrainer {
  private client: SynapseClient;
  private model: tf.Sequential;
  private epoch: number = 0;
  private readonly batchSize = 32;
  private readonly learningRate = 0.001;

  constructor(
    connection: Connection,
    programId: string,
    protocolStateAddress: string
  ) {
    this.client = new SynapseClient(connection, programId, protocolStateAddress);
    this.model = this.createModel();
  }

  private createModel(): tf.Sequential {
    const model = tf.sequential();
    
    // Simple MNIST-like model architecture
    model.add(tf.layers.conv2d({
      inputShape: [28, 28, 1],
      filters: 32,
      kernelSize: 3,
      activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async loadData(): Promise<[tf.Tensor, tf.Tensor]> {
    // Simulated data loading - replace with actual dataset
    const numSamples = 1000;
    const inputShape = [28, 28, 1];
    const numClasses = 10;

    const x = tf.randomNormal([numSamples, ...inputShape]);
    const y = tf.oneHot(
      tf.randomUniform([numSamples], 0, numClasses, 'int32'),
      numClasses
    );

    return [x, y];
  }

  private async updateGlobalState() {
    // Extract model weights
    const weights = this.model.getWeights().map(w => {
      const data = w.dataSync();
      return Array.from(data);
    });

    // Flatten weights into a single array
    const flatWeights = weights.reduce((acc, w) => [...acc, ...w], []);
    
    // Calculate gradients (simplified)
    const gradients = flatWeights.map(() => Math.random() * 0.01 - 0.005);

    // Create neural state
    const neuralState = {
      weights: new Float32Array(flatWeights),
      gradients: new Float32Array(gradients),
      timestamp: Date.now(),
      version: this.epoch + 1
    };

    // Propose update to the network
    await this.client.proposeUpdate(neuralState);
  }

  private async incorporateGlobalUpdates() {
    // Get latest neural metrics
    const metrics = await this.client.getNeuralMetrics();
    
    if (metrics.globalWeights) {
      // Update local model with global weights (simplified)
      const shapes = this.model.getWeights().map(w => w.shape);
      let offset = 0;
      
      const newWeights = shapes.map(shape => {
        const size = shape.reduce((a, b) => a * b, 1);
        const weightData = metrics.globalWeights.slice(offset, offset + size);
        offset += size;
        return tf.tensor(weightData, shape);
      });

      this.model.setWeights(newWeights);
    }
  }

  public async train(numEpochs: number = 10) {
    console.log('🚀 Starting Distributed Training');

    // Register as a training node
    const initialStake = BigInt(5_000_000_000); // 5 SOL
    const initialWeights = this.model.getWeights().map(w => Array.from(w.dataSync()));
    const flatInitialWeights = initialWeights.reduce((acc, w) => [...acc, ...w], []);

    const initialState = {
      weights: new Float32Array(flatInitialWeights),
      gradients: new Float32Array(flatInitialWeights.length).fill(0),
      timestamp: Date.now(),
      version: 1
    };

    await this.client.registerNode(initialStake, initialState);
    console.log('✅ Node registered successfully');

    // Load training data
    const [x, y] = await this.loadData();
    console.log('📚 Data loaded:', x.shape, y.shape);

    // Training loop
    for (this.epoch = 0; this.epoch < numEpochs; this.epoch++) {
      console.log(`\n🔄 Epoch ${this.epoch + 1}/${numEpochs}`);

      // Local training step
      const result = await this.model.fit(x, y, {
        batchSize: this.batchSize,
        epochs: 1,
        verbose: 1
      });

      console.log('📊 Local training metrics:', result.history);

      // Update global state
      await this.updateGlobalState();
      console.log('🌐 Global state updated');

      // Incorporate global updates
      await this.incorporateGlobalUpdates();
      console.log('📥 Global updates incorporated');

      // Get consensus metrics
      const consensusMetrics = await this.client.getConsensusMetrics();
      console.log('🤝 Consensus metrics:', consensusMetrics);
    }

    console.log('\n✨ Training completed');
  }
}

async function main() {
  const trainer = new DistributedTrainer(
    new Connection(process.env.SOLANA_RPC_URL || 'http://localhost:8899'),
    process.env.PROGRAM_ID!,
    process.env.PROTOCOL_STATE_ADDRESS!
  );

  await trainer.train();
}

if (require.main === module) {
  main().catch(console.error);
} 