import { Connection, Keypair } from '@solana/web3.js';
import { SingleBar, Presets } from 'cli-progress';
import fetch from 'node-fetch';
import { SynapseClient } from '../../api/src/services/synapseClient';
import { generateRandomNeuralState } from './utils/neural';
import { BenchmarkResult, saveBenchmarkResult } from './utils/results';
import { getSystemInfo } from './utils/system';
import { measureLatency } from './utils/network';

const ITERATIONS = 100;
const CONCURRENT_REQUESTS = [1, 5, 10, 20, 50];
const ENDPOINTS = [
  'http://localhost:3000/api/v1/nodes',
  'http://localhost:3000/api/v1/proposals',
  'http://localhost:3000/api/v1/metrics'
];

async function benchmarkNetwork() {
  console.log('Starting Network Performance Benchmark...');

  const connection = new Connection('http://localhost:8899', 'confirmed');
  const node = Keypair.generate();
  const progressBar = new SingleBar({}, Presets.shades_classic);
  const results: BenchmarkResult[] = [];

  try {
    // Initialize test data
    const client = new SynapseClient(
      connection,
      process.env.PROGRAM_ID!,
      process.env.PROTOCOL_STATE_ADDRESS!
    );

    await client.registerNode(
      BigInt(1000000),
      generateRandomNeuralState()
    );

    // Test each endpoint with different concurrency levels
    for (const endpoint of ENDPOINTS) {
      for (const concurrency of CONCURRENT_REQUESTS) {
        console.log(`\nTesting endpoint: ${endpoint} with ${concurrency} concurrent requests`);
        progressBar.start(ITERATIONS, 0);

        const startTime = process.hrtime.bigint();
        let totalLatency = BigInt(0);
        let successfulRequests = 0;
        let totalBytes = 0;

        // Create request batches
        for (let i = 0; i < ITERATIONS; i++) {
          const batch = Array(concurrency).fill(null).map(async () => {
            const requestStart = process.hrtime.bigint();

            try {
              const response = await fetch(endpoint);
              const data = await response.text();
              totalBytes += Buffer.from(data).length;
              successfulRequests++;

              const requestEnd = process.hrtime.bigint();
              totalLatency += requestEnd - requestStart;
            } catch (error) {
              console.error(`Request failed:`, error);
            }
          });

          await Promise.all(batch);
          progressBar.increment();
        }

        const endTime = process.hrtime.bigint();
        progressBar.stop();

        // Calculate metrics
        const totalTimeMs = Number(endTime - startTime) / 1_000_000;
        const avgLatencyMs = Number(totalLatency) / (successfulRequests * 1_000_000);
        const requestsPerSecond = (successfulRequests / totalTimeMs) * 1000;
        const throughputMbps = (totalBytes * 8) / (totalTimeMs * 1000); // Convert to Mbps

        // Measure network conditions
        const networkMetrics = await measureLatency(endpoint);

        const result: BenchmarkResult = {
          timestamp: new Date().toISOString(),
          type: 'network',
          configuration: {
            endpoint,
            concurrency,
          },
          metrics: {
            totalTimeMs,
            avgLatencyMs,
            requestsPerSecond,
            throughputMbps,
            successRate: (successfulRequests / (ITERATIONS * concurrency)) * 100,
            totalRequests: ITERATIONS * concurrency,
            successfulRequests,
            totalBytes,
            networkLatency: networkMetrics.latencyMs,
            packetLoss: networkMetrics.packetLoss,
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
  benchmarkNetwork().catch(console.error);
} 