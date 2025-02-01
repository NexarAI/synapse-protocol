export type SynapseProtocol = {
  "version": "0.1.0",
  "name": "synapse_protocol",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "minStake",
          "type": "u64"
        },
        {
          "name": "epochDuration",
          "type": "i64"
        }
      ]
    },
    {
      "name": "registerNode",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nodeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "staker",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stakeAmount",
          "type": "u64"
        },
        {
          "name": "neuralStateRoot",
          "type": "[u8;32]"
        }
      ]
    },
    {
      "name": "proposeNeuralState",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nodeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "staker",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "neuralStateRoot",
          "type": "[u8;32]"
        },
        {
          "name": "signature",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "voteOnProposal",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "updateStake",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "staker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "increase",
          "type": "bool"
        }
      ]
    },
    {
      "name": "deregisterNode",
      "accounts": [
        {
          "name": "protocolState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nodeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "staker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "minStake",
            "type": "u64"
          },
          {
            "name": "epochDuration",
            "type": "i64"
          },
          {
            "name": "activeNodeCount",
            "type": "u64"
          },
          {
            "name": "proposalCount",
            "type": "u64"
          },
          {
            "name": "lastEpochUpdate",
            "type": "i64"
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "nodeState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "reputation",
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          },
          {
            "name": "neuralStateRoot",
            "type": "[u8;32]"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "neuralStateRoot",
            "type": "[u8;32]"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "proposer",
            "type": "publicKey"
          },
          {
            "name": "voteCount",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "votes",
            "type": {
              "map": {
                "key": "publicKey",
                "value": "bool"
              }
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "NodeRegistered",
      "fields": [
        {
          "name": "node",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "stake",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ProposalCreated",
      "fields": [
        {
          "name": "proposalId",
          "type": "u64",
          "index": true
        },
        {
          "name": "neuralStateRoot",
          "type": "[u8;32]",
          "index": false
        },
        {
          "name": "proposer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ConsensusReached",
      "fields": [
        {
          "name": "proposalId",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "neuralStateRoot",
          "type": "[u8;32]",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "StakeIncreased",
      "fields": [
        {
          "name": "node",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "StakeDecreased",
      "fields": [
        {
          "name": "node",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "NodeDeregistered",
      "fields": [
        {
          "name": "node",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientStake",
      "msg": "Insufficient stake amount"
    },
    {
      "code": 6001,
      "name": "NodeNotActive",
      "msg": "Node is not active"
    },
    {
      "code": 6002,
      "name": "InvalidSignature",
      "msg": "Invalid signature"
    },
    {
      "code": 6003,
      "name": "ProposalAlreadyExecuted",
      "msg": "Proposal already executed"
    },
    {
      "code": 6004,
      "name": "AlreadyVoted",
      "msg": "Already voted on proposal"
    }
  ]
}; 