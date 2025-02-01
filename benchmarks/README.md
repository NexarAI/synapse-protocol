# Nexar AI™ Synapse Protocol Benchmarks

A comprehensive benchmarking suite for measuring and analyzing the performance of the Synapse Protocol.

## Features

- Consensus mechanism benchmarking
- Neural network performance testing
- Network throughput and latency analysis
- System resource monitoring
- Detailed performance metrics
- Visualization of results

## Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0
- Solana local validator
- System with at least:
  - 4 CPU cores
  - 8GB RAM
  - 1GB free disk space

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

## Usage

### Running Benchmarks

Run all benchmarks:
```bash
npm run bench:all
```

Run specific benchmarks:
```bash
npm run bench:consensus  # Test consensus mechanism
npm run bench:neural    # Test neural network performance
npm run bench:network   # Test network performance
```

### Generating Reports

Generate performance report:
```bash
npm run report
```

Visualize results:
```bash
npm run visualize
```

## Benchmark Types

### Consensus Mechanism

Tests the performance of the protocol's consensus mechanism:
- Node registration and deregistration
- Proposal creation and voting
- State updates and validation
- Reputation scoring

Metrics:
- Transactions per second (TPS)
- Average latency
- Success rate
- Node participation rate

### Neural Network

Tests the neural state management capabilities:
- State synchronization
- Weight updates
- Gradient computation
- Model convergence

Metrics:
- Updates per second
- Data throughput
- Model accuracy
- Convergence rate

### Network Performance

Tests the network layer performance:
- API endpoint responsiveness
- Data transfer rates
- Connection stability
- Protocol overhead

Metrics:
- Request latency
- Throughput (Mbps)
- Packet loss rate
- Connection stability

## Results

Benchmark results are stored in the `results` directory in JSON format. Each result file contains:
- Timestamp
- Test configuration
- Performance metrics
- System information
- Resource utilization

Charts and visualizations are generated in the `charts` directory.

## Configuration

Benchmark parameters can be adjusted in the respective benchmark files:
- `src/consensus.ts`
- `src/neural.ts`
- `src/network.ts`

Key parameters:
- Number of iterations
- Batch sizes
- Concurrent requests
- Model sizes
- Network conditions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add or modify benchmarks
4. Update documentation
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 