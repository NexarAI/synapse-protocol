use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::collections::HashMap;

declare_id!("SYNPSv1protocol11111111111111111111111111111");

#[program]
pub mod synapse_protocol {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        min_stake: u64,
        epoch_duration: i64,
    ) -> Result<()> {
        let protocol_state = &mut ctx.accounts.protocol_state;
        protocol_state.admin = ctx.accounts.admin.key();
        protocol_state.min_stake = min_stake;
        protocol_state.epoch_duration = epoch_duration;
        protocol_state.active_node_count = 0;
        protocol_state.proposal_count = 0;
        protocol_state.last_epoch_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn register_node(
        ctx: Context<RegisterNode>,
        stake_amount: u64,
        neural_state_root: [u8; 32],
    ) -> Result<()> {
        let protocol_state = &mut ctx.accounts.protocol_state;
        let node_state = &mut ctx.accounts.node_state;
        let clock = Clock::get()?;

        require!(
            stake_amount >= protocol_state.min_stake,
            SynapseError::InsufficientStake
        );

        // Transfer stake tokens
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staker_token_account.to_account_info(),
                to: ctx.accounts.protocol_vault.to_account_info(),
                authority: ctx.accounts.staker.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, stake_amount)?;

        // Initialize node state
        node_state.stake = stake_amount;
        node_state.reputation = 1000; // Base reputation
        node_state.last_update = clock.unix_timestamp;
        node_state.neural_state_root = neural_state_root;
        node_state.is_active = true;
        node_state.owner = ctx.accounts.staker.key();

        protocol_state.active_node_count += 1;

        emit!(NodeRegistered {
            node: ctx.accounts.staker.key(),
            stake: stake_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn propose_neural_state(
        ctx: Context<ProposeNeuralState>,
        neural_state_root: [u8; 32],
        signature: Vec<u8>,
    ) -> Result<()> {
        let protocol_state = &mut ctx.accounts.protocol_state;
        let node_state = &mut ctx.accounts.node_state;
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        require!(node_state.is_active, SynapseError::NodeNotActive);
        require!(
            verify_signature(&neural_state_root, &signature, &ctx.accounts.staker.key()),
            SynapseError::InvalidSignature
        );

        let proposal_id = protocol_state.proposal_count;
        protocol_state.proposal_count += 1;

        proposal.neural_state_root = neural_state_root;
        proposal.timestamp = clock.unix_timestamp;
        proposal.proposer = ctx.accounts.staker.key();
        proposal.vote_count = 1;
        proposal.executed = false;

        // Auto-vote by proposer
        proposal.votes.insert(ctx.accounts.staker.key(), true);

        emit!(ProposalCreated {
            proposal_id,
            neural_state_root,
            proposer: ctx.accounts.staker.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>) -> Result<()> {
        let protocol_state = &ctx.accounts.protocol_state;
        let node_state = &ctx.accounts.node_state;
        let proposal = &mut ctx.accounts.proposal;

        require!(node_state.is_active, SynapseError::NodeNotActive);
        require!(!proposal.executed, SynapseError::ProposalAlreadyExecuted);
        require!(
            !proposal.votes.contains_key(&ctx.accounts.voter.key()),
            SynapseError::AlreadyVoted
        );

        proposal.votes.insert(ctx.accounts.voter.key(), true);
        proposal.vote_count += 1;

        // Check for consensus threshold (67%)
        if proposal.vote_count * 100 >= protocol_state.active_node_count * 67 {
            proposal.executed = true;
            update_reputations(ctx.accounts.proposal, protocol_state)?;

            emit!(ConsensusReached {
                proposal_id: ctx.accounts.proposal.key(),
                neural_state_root: proposal.neural_state_root,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        Ok(())
    }

    pub fn update_stake(
        ctx: Context<UpdateStake>,
        amount: u64,
        increase: bool,
    ) -> Result<()> {
        let protocol_state = &ctx.accounts.protocol_state;
        let node_state = &mut ctx.accounts.node_state;

        require!(node_state.is_active, SynapseError::NodeNotActive);

        if increase {
            // Transfer additional stake
            let transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staker_token_account.to_account_info(),
                    to: ctx.accounts.protocol_vault.to_account_info(),
                    authority: ctx.accounts.staker.to_account_info(),
                },
            );
            token::transfer(transfer_ctx, amount)?;
            node_state.stake += amount;

            emit!(StakeIncreased {
                node: ctx.accounts.staker.key(),
                amount,
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            require!(
                node_state.stake - amount >= protocol_state.min_stake,
                SynapseError::InsufficientStake
            );

            // Return stake to user
            let vault_authority_seeds = &[
                protocol_state.to_account_info().key.as_ref(),
                &[protocol_state.vault_authority_bump],
            ];
            let vault_signer = &[&vault_authority_seeds[..]];

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.protocol_vault.to_account_info(),
                    to: ctx.accounts.staker_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                vault_signer,
            );
            token::transfer(transfer_ctx, amount)?;
            node_state.stake -= amount;

            emit!(StakeDecreased {
                node: ctx.accounts.staker.key(),
                amount,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        Ok(())
    }

    pub fn deregister_node(ctx: Context<DeregisterNode>) -> Result<()> {
        let protocol_state = &mut ctx.accounts.protocol_state;
        let node_state = &mut ctx.accounts.node_state;

        require!(node_state.is_active, SynapseError::NodeNotActive);

        // Return staked tokens
        let vault_authority_seeds = &[
            protocol_state.to_account_info().key.as_ref(),
            &[protocol_state.vault_authority_bump],
        ];
        let vault_signer = &[&vault_authority_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.protocol_vault.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            vault_signer,
        );
        token::transfer(transfer_ctx, node_state.stake)?;

        node_state.is_active = false;
        node_state.stake = 0;
        protocol_state.active_node_count -= 1;

        emit!(NodeDeregistered {
            node: ctx.accounts.staker.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + ProtocolState::LEN)]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(
        init,
        payer = staker,
        space = 8 + NodeState::LEN,
        seeds = [b"node", staker.key().as_ref()],
        bump
    )]
    pub node_state: Account<'info, NodeState>,
    #[account(mut)]
    pub staker: Signer<'info>,
    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub protocol_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProtocolState {
    pub admin: Pubkey,
    pub min_stake: u64,
    pub epoch_duration: i64,
    pub active_node_count: u64,
    pub proposal_count: u64,
    pub last_epoch_update: i64,
    pub vault_authority_bump: u8,
}

#[account]
pub struct NodeState {
    pub owner: Pubkey,
    pub stake: u64,
    pub reputation: u64,
    pub last_update: i64,
    pub neural_state_root: [u8; 32],
    pub is_active: bool,
}

#[account]
pub struct Proposal {
    pub neural_state_root: [u8; 32],
    pub timestamp: i64,
    pub proposer: Pubkey,
    pub vote_count: u64,
    pub executed: bool,
    pub votes: HashMap<Pubkey, bool>,
}

#[error_code]
pub enum SynapseError {
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    #[msg("Node is not active")]
    NodeNotActive,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Proposal already executed")]
    ProposalAlreadyExecuted,
    #[msg("Already voted on proposal")]
    AlreadyVoted,
}

// Events
#[event]
pub struct NodeRegistered {
    pub node: Pubkey,
    pub stake: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreated {
    pub proposal_id: u64,
    pub neural_state_root: [u8; 32],
    pub proposer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConsensusReached {
    pub proposal_id: Pubkey,
    pub neural_state_root: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct StakeIncreased {
    pub node: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct StakeDecreased {
    pub node: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct NodeDeregistered {
    pub node: Pubkey,
    pub timestamp: i64,
}

// Helper functions
impl ProtocolState {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

impl NodeState {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 32 + 1;
}

fn verify_signature(
    neural_state_root: &[u8; 32],
    signature: &[u8],
    signer: &Pubkey,
) -> bool {
    // Implement Ed25519 signature verification
    // This is a placeholder - actual implementation would use ed25519_dalek
    true
}

fn update_reputations(
    proposal: &Account<Proposal>,
    protocol_state: &Account<ProtocolState>,
) -> Result<()> {
    // Implement reputation updates based on voting alignment
    // This would update each node's reputation score based on their votes
    Ok(())
} 