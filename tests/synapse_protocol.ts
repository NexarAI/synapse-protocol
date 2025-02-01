import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SynapseProtocol } from "../target/types/synapse_protocol";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Nexar AI™ Synapse Protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SynapseProtocol as Program<SynapseProtocol>;
  
  // Test accounts
  let protocolState: anchor.web3.Keypair;
  let synapseToken: anchor.web3.PublicKey;
  let protocolVault: anchor.web3.PublicKey;
  let nodeStates: anchor.web3.Keypair[] = [];
  let userTokenAccounts: anchor.web3.PublicKey[] = [];
  
  // Test parameters
  const MIN_STAKE = new anchor.BN(1000000); // 1 token
  const EPOCH_DURATION = new anchor.BN(300); // 5 minutes
  
  before(async () => {
    // Create protocol state account
    protocolState = anchor.web3.Keypair.generate();
    
    // Create synapse token mint
    synapseToken = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9 // 9 decimals
    );
    
    // Create protocol vault
    protocolVault = await createAccount(
      provider.connection,
      provider.wallet.payer,
      synapseToken,
      provider.wallet.publicKey
    );
    
    // Create test node accounts
    for (let i = 0; i < 3; i++) {
      const user = anchor.web3.Keypair.generate();
      nodeStates.push(user);
      
      // Create token account for user
      const tokenAccount = await createAccount(
        provider.connection,
        provider.wallet.payer,
        synapseToken,
        user.publicKey
      );
      userTokenAccounts.push(tokenAccount);
      
      // Mint initial tokens to user
      await mintTo(
        provider.connection,
        provider.wallet.payer,
        synapseToken,
        tokenAccount,
        provider.wallet.payer,
        2000000 // 2 tokens
      );
    }
  });

  it("Initializes protocol state", async () => {
    await program.methods
      .initialize(MIN_STAKE, EPOCH_DURATION)
      .accounts({
        protocolState: protocolState.publicKey,
        admin: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([protocolState])
      .rpc();

    const state = await program.account.protocolState.fetch(protocolState.publicKey);
    assert.equal(state.admin.toString(), provider.wallet.publicKey.toString());
    assert.equal(state.minStake.toString(), MIN_STAKE.toString());
    assert.equal(state.epochDuration.toString(), EPOCH_DURATION.toString());
    assert.equal(state.activeNodeCount.toString(), "0");
  });

  it("Registers a node", async () => {
    const node = nodeStates[0];
    const nodeTokenAccount = userTokenAccounts[0];
    const stakeAmount = new anchor.BN(1500000); // 1.5 tokens
    const neuralStateRoot = Buffer.alloc(32, 1); // Test neural state

    const [nodeState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("node"), node.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode(stakeAmount, neuralStateRoot)
      .accounts({
        protocolState: protocolState.publicKey,
        nodeState,
        staker: node.publicKey,
        stakerTokenAccount: nodeTokenAccount,
        protocolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([node])
      .rpc();

    const state = await program.account.nodeState.fetch(nodeState);
    assert.equal(state.owner.toString(), node.publicKey.toString());
    assert.equal(state.stake.toString(), stakeAmount.toString());
    assert.equal(state.isActive, true);
    assert.equal(state.reputation.toString(), "1000");
  });

  it("Proposes neural state update", async () => {
    const node = nodeStates[0];
    const neuralStateRoot = Buffer.alloc(32, 2); // New neural state
    const signature = Buffer.alloc(64); // Mock signature

    const [nodeState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("node"), node.publicKey.toBuffer()],
      program.programId
    );

    const proposal = anchor.web3.Keypair.generate();

    await program.methods
      .proposeNeuralState(neuralStateRoot, signature)
      .accounts({
        protocolState: protocolState.publicKey,
        nodeState,
        proposal: proposal.publicKey,
        staker: node.publicKey,
      })
      .signers([node, proposal])
      .rpc();

    const proposalState = await program.account.proposal.fetch(proposal.publicKey);
    assert.equal(proposalState.proposer.toString(), node.publicKey.toString());
    assert.equal(proposalState.voteCount.toString(), "1");
    assert.equal(proposalState.executed, false);
  });

  it("Votes on proposal", async () => {
    const voter = nodeStates[1];
    const proposal = anchor.web3.Keypair.generate();

    const [voterState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("node"), voter.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .voteOnProposal()
      .accounts({
        protocolState: protocolState.publicKey,
        nodeState: voterState,
        proposal: proposal.publicKey,
        voter: voter.publicKey,
      })
      .signers([voter])
      .rpc();

    const proposalState = await program.account.proposal.fetch(proposal.publicKey);
    assert.equal(proposalState.voteCount.toString(), "2");
  });

  it("Updates stake amount", async () => {
    const node = nodeStates[0];
    const nodeTokenAccount = userTokenAccounts[0];
    const increaseAmount = new anchor.BN(500000); // 0.5 tokens

    const [nodeState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("node"), node.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateStake(increaseAmount, true)
      .accounts({
        protocolState: protocolState.publicKey,
        nodeState,
        staker: node.publicKey,
        stakerTokenAccount: nodeTokenAccount,
        protocolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([node])
      .rpc();

    const state = await program.account.nodeState.fetch(nodeState);
    assert.equal(state.stake.toString(), "2000000"); // 1.5 + 0.5 tokens
  });

  it("Deregisters node", async () => {
    const node = nodeStates[0];
    const nodeTokenAccount = userTokenAccounts[0];

    const [nodeState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("node"), node.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .deregisterNode()
      .accounts({
        protocolState: protocolState.publicKey,
        nodeState,
        staker: node.publicKey,
        stakerTokenAccount: nodeTokenAccount,
        protocolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([node])
      .rpc();

    const state = await program.account.nodeState.fetch(nodeState);
    assert.equal(state.isActive, false);
    assert.equal(state.stake.toString(), "0");
  });
}); 