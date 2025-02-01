import { Connection, Keypair } from '@solana/web3.js';
import { SynapseClient } from '../api/src/services/synapseClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Starting Basic Node Example');

  // Initialize connection and keypair
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'http://localhost:8899');
  const keypair = Keypair.generate();

  // Initialize Synapse client
  const client = new SynapseClient(
    connection,
    process.env.PROGRAM_ID!,
    process.env.PROTOCOL_STATE_ADDRESS!
  );

  try {
    // Register node with initial stake and neural state
    console.log('📝 Registering node...');
    const initialStake = BigInt(1_000_000_000); // 1 SOL
    const initialState = {
      weights: new Float32Array([0.1, 0.2, 0.3]),
      gradients: new Float32Array([0.01, 0.02, 0.03]),
      timestamp: Date.now(),
      version: 1
    };

    await client.registerNode(initialStake, initialState);
    console.log('✅ Node registered successfully');

    // Get node metrics
    console.log('\n📊 Fetching node metrics...');
    const metrics = await client.getNodeMetrics(keypair.publicKey);
    console.log('Node Metrics:', metrics);

    // Propose a neural state update
    console.log('\n🔄 Proposing neural state update...');
    const newState = {
      weights: new Float32Array([0.15, 0.25, 0.35]),
      gradients: new Float32Array([0.015, 0.025, 0.035]),
      timestamp: Date.now(),
      version: 2
    };

    const proposalTx = await client.proposeUpdate(newState);
    console.log('Proposal submitted:', proposalTx);

    // Get consensus metrics
    console.log('\n🌐 Fetching consensus metrics...');
    const consensusMetrics = await client.getConsensusMetrics();
    console.log('Consensus Metrics:', consensusMetrics);

    // Get neural metrics
    console.log('\n🧠 Fetching neural metrics...');
    const neuralMetrics = await client.getNeuralMetrics();
    console.log('Neural Metrics:', neuralMetrics);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 