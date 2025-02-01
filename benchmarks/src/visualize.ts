import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { BenchmarkResult, loadBenchmarkResults, analyzeResults } from './utils/results';

const CHARTS_DIR = join(__dirname, '../charts');
const width = 800;
const height = 600;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

interface ChartConfig {
  type: string;
  data: any;
  options: any;
}

async function generateChart(config: ChartConfig, filename: string): Promise<void> {
  try {
    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    await writeFile(join(CHARTS_DIR, filename), buffer);
  } catch (error) {
    console.error(`Failed to generate chart ${filename}:`, error);
    throw error;
  }
}

async function visualizeResults() {
  try {
    const results = await loadBenchmarkResults();

    // Group results by type
    const consensusResults = results.filter(r => r.type === 'consensus');
    const neuralResults = results.filter(r => r.type === 'neural');
    const networkResults = results.filter(r => r.type === 'network');

    // Generate performance over time charts
    await generatePerformanceChart(consensusResults, 'consensus_performance.png');
    await generatePerformanceChart(neuralResults, 'neural_performance.png');
    await generatePerformanceChart(networkResults, 'network_performance.png');

    // Generate comparison charts
    await generateComparisonChart(results, 'metrics_comparison.png');

    // Generate system impact charts
    await generateSystemImpactChart(results, 'system_impact.png');

    console.log('Charts generated successfully!');
  } catch (error) {
    console.error('Failed to visualize results:', error);
    process.exit(1);
  }
}

async function generatePerformanceChart(
  results: BenchmarkResult[],
  filename: string
): Promise<void> {
  const timestamps = results.map(r => r.timestamp);
  const throughput = results.map(r => r.metrics.throughputMbps || 0);
  const latency = results.map(r => r.metrics.avgLatencyMs || 0);

  const config: ChartConfig = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Throughput (Mbps)',
          data: throughput,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Latency (ms)',
          data: latency,
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Throughput (Mbps)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Latency (ms)'
          }
        }
      }
    }
  };

  await generateChart(config, filename);
}

async function generateComparisonChart(
  results: BenchmarkResult[],
  filename: string
): Promise<void> {
  const metrics = ['throughputMbps', 'avgLatencyMs', 'successRate'];
  const types = ['consensus', 'neural', 'network'];

  const datasets = metrics.map(metric => ({
    label: metric,
    data: types.map(type => {
      const typeResults = results.filter(r => r.type === type);
      const stats = analyzeResults(typeResults, metric);
      return stats.avg;
    }),
    backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`
  }));

  const config: ChartConfig = {
    type: 'bar',
    data: {
      labels: types,
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Performance Metrics Comparison'
        }
      }
    }
  };

  await generateChart(config, filename);
}

async function generateSystemImpactChart(
  results: BenchmarkResult[],
  filename: string
): Promise<void> {
  const cpuUsage = results.map(r => r.systemInfo.cpu.loadPercentage);
  const memoryUsage = results.map(r => 
    (r.systemInfo.memory.used / r.systemInfo.memory.total) * 100
  );
  const timestamps = results.map(r => r.timestamp);

  const config: ChartConfig = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: cpuUsage,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Memory Usage (%)',
          data: memoryUsage,
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'System Resource Usage'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Usage (%)'
          }
        }
      }
    }
  };

  await generateChart(config, filename);
}

if (require.main === module) {
  visualizeResults().catch(console.error);
} 