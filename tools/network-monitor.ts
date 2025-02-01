import { Connection, PublicKey } from '@solana/web3.js';
import { SynapseClient } from '../api/src/services/synapseClient';
import * as dotenv from 'dotenv';
import { SingleBar, Presets } from 'cli-progress';
import { writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface NetworkStats {
  timestamp: string;
  activeNodes: number;
  totalStake: bigint;
  proposalsPerMinute: number;
  avgConsensusTime: number;
  networkLatency: number;
  successRate: number;
}

class NetworkMonitor {
  private client: SynapseClient;
  private stats: NetworkStats[] = [];
  private readonly updateInterval = 60000; // 1 minute
  private readonly logFile: string;
  private progressBar: SingleBar;

  constructor(
    connection: Connection,
    programId: string,
    protocolStateAddress: string
  ) {
    this.client = new SynapseClient(connection, programId, protocolStateAddress);
    this.logFile = join(process.cwd(), 'network-stats.json');
    this.progressBar = new SingleBar({}, Presets.shades_classic);
  }

  private async getNetworkStats(): Promise<NetworkStats> {
    const [consensusMetrics, neuralMetrics] = await Promise.all([
      this.client.getConsensusMetrics(),
      this.client.getNeuralMetrics()
    ]);

    return {
      timestamp: new Date().toISOString(),
      activeNodes: consensusMetrics.activeNodes,
      totalStake: consensusMetrics.totalStake,
      proposalsPerMinute: consensusMetrics.proposalsPerMinute,
      avgConsensusTime: consensusMetrics.averageConsensusTime,
      networkLatency: neuralMetrics.networkLatency,
      successRate: consensusMetrics.successRate
    };
  }

  private saveStats(): void {
    writeFileSync(this.logFile, JSON.stringify(this.stats, null, 2));
  }

  private printStats(stats: NetworkStats): void {
    console.clear();
    console.log('📊 Network Statistics\n');
    console.log(`Active Nodes: ${stats.activeNodes}`);
    console.log(`Total Stake: ${stats.totalStake} SOL`);
    console.log(`Proposals/min: ${stats.proposalsPerMinute.toFixed(2)}`);
    console.log(`Avg Consensus Time: ${stats.avgConsensusTime.toFixed(2)}ms`);
    console.log(`Network Latency: ${stats.networkLatency.toFixed(2)}ms`);
    console.log(`Success Rate: ${(stats.successRate * 100).toFixed(2)}%\n`);
  }

  private checkAlerts(stats: NetworkStats): void {
    // Define alert thresholds
    const ALERTS = {
      MIN_ACTIVE_NODES: 3,
      MIN_TOTAL_STAKE: BigInt(10_000_000_000), // 10 SOL
      MAX_CONSENSUS_TIME: 5000, // 5 seconds
      MIN_SUCCESS_RATE: 0.95
    };

    const alerts: string[] = [];

    if (stats.activeNodes < ALERTS.MIN_ACTIVE_NODES) {
      alerts.push(`⚠️ Low node count: ${stats.activeNodes}`);
    }

    if (stats.totalStake < ALERTS.MIN_TOTAL_STAKE) {
      alerts.push(`⚠️ Low total stake: ${stats.totalStake}`);
    }

    if (stats.avgConsensusTime > ALERTS.MAX_CONSENSUS_TIME) {
      alerts.push(`⚠️ High consensus time: ${stats.avgConsensusTime}ms`);
    }

    if (stats.successRate < ALERTS.MIN_SUCCESS_RATE) {
      alerts.push(`⚠️ Low success rate: ${(stats.successRate * 100).toFixed(2)}%`);
    }

    if (alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      alerts.forEach(alert => console.log(alert));
    }
  }

  public async start(duration?: number): Promise<void> {
    console.log('🚀 Starting Network Monitor');
    let iterations = duration ? Math.floor(duration / this.updateInterval) : Infinity;
    
    this.progressBar.start(iterations, 0);
    let currentIteration = 0;

    while (currentIteration < iterations) {
      try {
        // Collect network statistics
        const stats = await this.getNetworkStats();
        this.stats.push(stats);
        this.saveStats();

        // Update display
        this.printStats(stats);
        this.checkAlerts(stats);
        this.progressBar.increment();
        currentIteration++;

        // Wait for next update
        if (currentIteration < iterations) {
          await new Promise(resolve => setTimeout(resolve, this.updateInterval));
        }
      } catch (error) {
        console.error('❌ Error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retrying
      }
    }

    this.progressBar.stop();
    console.log('\n✨ Monitoring completed');
  }

  public getStoredStats(): NetworkStats[] {
    return this.stats;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const duration = args[0] ? parseInt(args[0]) * 60000 : undefined; // Convert minutes to ms

  const monitor = new NetworkMonitor(
    new Connection(process.env.SOLANA_RPC_URL || 'http://localhost:8899'),
    process.env.PROGRAM_ID!,
    process.env.PROTOCOL_STATE_ADDRESS!
  );

  try {
    await monitor.start(duration);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 