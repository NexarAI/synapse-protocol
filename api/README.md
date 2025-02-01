# Nexar AI™ Synapse Protocol API

A RESTful API for interacting with the Nexar AI™ Synapse Protocol on Solana.

## Features

- Node registration and management
- Neural state proposal and voting system
- Protocol metrics and monitoring
- Comprehensive API documentation with Swagger
- TypeScript implementation with full type safety

## Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0
- Solana CLI tools
- A Solana wallet with SOL for transactions

## Installation

1. Clone the repository:
```bash
git clone https://github.com/NexarAI/synapse-protocol.git
cd synapse-protocol/api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```env
PORT=3000
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=SYNPSv1protocol11111111111111111111111111111
PROTOCOL_STATE_ADDRESS=your_protocol_state_address
```

## Development

Start the development server:
```bash
npm run dev
```

## Build

Build the project:
```bash
npm run build
```

## Testing

Run the test suite:
```bash
npm test
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### Nodes

- `POST /api/v1/nodes/register` - Register a new node
- `GET /api/v1/nodes/:address` - Get node metrics
- `POST /api/v1/nodes/stake` - Update node stake
- `POST /api/v1/nodes/deregister` - Deregister a node

### Proposals

- `POST /api/v1/proposals/create` - Create a new proposal
- `POST /api/v1/proposals/:proposalId/vote` - Vote on a proposal
- `GET /api/v1/proposals/:proposalId` - Get proposal details
- `GET /api/v1/proposals` - Get all active proposals

### Metrics

- `GET /api/v1/metrics/consensus` - Get consensus metrics
- `GET /api/v1/metrics/protocol` - Get protocol metrics
- `GET /api/v1/metrics/neural` - Get neural network metrics

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 