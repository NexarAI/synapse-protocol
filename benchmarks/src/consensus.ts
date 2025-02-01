import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, Provider } from '@project-serum/anchor';
import { SingleBar, Presets } from 'cli-progress';
import { SynapseClient } from '../../api/src/services/synapseClient';
import { generateRandomNeuralState } from './utils/neural';
import { BenchmarkResult, saveBenchmarkResult } from './utils/results';
import { getSystemInfo } from './utils/system';

const TOTAL_NODES = 100;
const PROPOSALS_PER_NODE = 10;
const VOTES_PER_PROPOSAL = 50;

async function benchmarkConsensus() {
  console.log('Starting Consensus Mechanism Benchmark...');

  const connection = new Connection('http://localhost:8899', 'confirmed');
  const nodes: Keypair[] = Array(TOTAL_NODES).fill(0).map(() => Keypair.generate());
  const progressBar = new SingleBar({}, Presets.shades_classic);
  
  const startTime = process.hrtime.bigint();
  let totalLatency = BigInt(0);
  let proposalCount = 0;
  let voteCount = 0;

  progressBar.start(TOTAL_NODES * PROPOSALS_PER_NODE, 0);

  try {
    // Initialize nodes
    for (const node of nodes) {
      const client = new SynapseClient(
        connection,
        process.env.PROGRAM_ID!,
        process.env.PROTOCOL_STATE_ADDRESS!
      );

      // Register node
      await client.registerNode(
        BigInt(1000000), // 1 SOL stake
        generateRandomNeuralState()
      );
    }

    // Benchmark proposal creation and voting
    for (let i = 0; i < TOTAL_NODES; i++) {
      const proposer = nodes[i];
      const client = new SynapseClient(
        connection,
        process.env.PROGRAM_ID!,
        process.env.PROTOCOL_STATE_ADDRESS!
      );

      for (let j = 0; j < PROPOSALS_PER_NODE; j++) {
        const proposalStart = process.hrtime.bigint();
        
        // Create proposal
        const neuralState = generateRandomNeuralState();
        const proposalTx = await client.proposeUpdate(neuralState);
        proposalCount++;

        // Simulate voting
        const voters = nodes
          .filter(n => n.publicKey !== proposer.publicKey)
          .slice(0, VOTES_PER_PROPOSAL);

        for (const voter of voters) {
          const voterClient = new SynapseClient(
            connection,
            process.env.PROGRAM_ID!,
            process.env.PROTOCOL_STATE_ADDRESS!
          );
          await voterClient.voteOnProposal(new PublicKey(proposalTx));
          voteCount++;
        }

        const proposalEnd = process.hrtime.bigint();
        totalLatency += proposalEnd - proposalStart;
        progressBar.increment();
      }
    }

    const endTime = process.hrtime.bigint();
    progressBar.stop();

    // Calculate metrics
    const totalTimeMs = Number(endTime - startTime) / 1_000_000;
    const avgLatencyMs = Number(totalLatency) / (proposalCount * 1_000_000);
    const proposalsPerSecond = (proposalCount / totalTimeMs) * 1000;
    const votesPerSecond = (voteCount / totalTimeMs) * 1000;

    const result: BenchmarkResult = {
      timestamp: new Date().toISOString(),
      type: 'consensus',
      metrics: {
        totalTimeMs,
        avgLatencyMs,
        proposalsPerSecond,
        votesPerSecond,
        totalProposals: proposalCount,
        totalVotes: voteCount,
        nodesUsed: TOTAL_NODES
      },
      systemInfo: await getSystemInfo()
    };

    await saveBenchmarkResult(result);
    console.log('\nBenchmark Results:', JSON.stringify(result, null, 2));

  } catch (error) {
    progressBar.stop();
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  benchmarkConsensus().catch(console.error);
} 