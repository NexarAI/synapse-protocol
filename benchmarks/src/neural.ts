import { Connection, Keypair } from '@solana/web3.js';
import { SingleBar, Presets } from 'cli-progress';
import { SynapseClient } from '../../api/src/services/synapseClient';
import { generateRandomNeuralState } from './utils/neural';
import { BenchmarkResult, saveBenchmarkResult } from './utils/results';
import { getSystemInfo } from './utils/system';

const ITERATIONS = 1000;
const BATCH_SIZES = [32, 64, 128, 256, 512];
const MODEL_SIZES = [1000, 10000, 100000]; // Number of weights

async function benchmarkNeural() {
  console.log('Starting Neural Network Performance Benchmark...');

  const connection = new Connection('http://localhost:8899', 'confirmed');
  const node = Keypair.generate();
  const progressBar = new SingleBar({}, Presets.shades_classic);
  const results: BenchmarkResult[] = [];

  try {
    // Initialize node
    const client = new SynapseClient(
      connection,
      process.env.PROGRAM_ID!,
      process.env.PROTOCOL_STATE_ADDRESS!
    );

    await client.registerNode(
      BigInt(1000000), // 1 SOL stake
      generateRandomNeuralState(1000) // Initial state
    );

    // Benchmark different configurations
    for (const modelSize of MODEL_SIZES) {
      for (const batchSize of BATCH_SIZES) {
        console.log(`\nTesting model size: ${modelSize}, batch size: ${batchSize}`);
        progressBar.start(ITERATIONS, 0);

        const startTime = process.hrtime.bigint();
        let totalLatency = BigInt(0);
        let successfulUpdates = 0;

        for (let i = 0; i < ITERATIONS; i++) {
          const updateStart = process.hrtime.bigint();

          try {
            // Generate and propose new neural state
            const neuralState = generateRandomNeuralState(modelSize);
            await client.proposeUpdate(neuralState);
            successfulUpdates++;

            const updateEnd = process.hrtime.bigint();
            totalLatency += updateEnd - updateStart;
          } catch (error) {
            console.error(`Update failed at iteration ${i}:`, error);
          }

          progressBar.increment();
        }

        const endTime = process.hrtime.bigint();
        progressBar.stop();

        // Calculate metrics
        const totalTimeMs = Number(endTime - startTime) / 1_000_000;
        const avgLatencyMs = Number(totalLatency) / (successfulUpdates * 1_000_000);
        const updatesPerSecond = (successfulUpdates / totalTimeMs) * 1000;
        const throughputMbps = (modelSize * 4 * updatesPerSecond) / (1024 * 1024); // Assuming 4 bytes per weight

        const result: BenchmarkResult = {
          timestamp: new Date().toISOString(),
          type: 'neural',
          configuration: {
            modelSize,
            batchSize,
          },
          metrics: {
            totalTimeMs,
            avgLatencyMs,
            updatesPerSecond,
            throughputMbps,
            successRate: (successfulUpdates / ITERATIONS) * 100,
            modelSize,
            batchSize,
          },
          systemInfo: await getSystemInfo()
        };

        results.push(result);
        await saveBenchmarkResult(result);
      }
    }

    console.log('\nBenchmark Results:', JSON.stringify(results, null, 2));

  } catch (error) {
    progressBar.stop();
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  benchmarkNeural().catch(console.error);
} 