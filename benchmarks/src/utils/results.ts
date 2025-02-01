import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { SystemInfo } from './system';

export interface BenchmarkResult {
  timestamp: string;
  type: 'consensus' | 'neural' | 'network';
  configuration?: {
    [key: string]: any;
  };
  metrics: {
    [key: string]: number;
  };
  systemInfo: SystemInfo;
}

const RESULTS_DIR = join(__dirname, '../../results');

/**
 * Save benchmark result to file
 * @param result Benchmark result object
 */
export async function saveBenchmarkResult(result: BenchmarkResult): Promise<void> {
  try {
    // Ensure results directory exists
    await mkdir(RESULTS_DIR, { recursive: true });

    // Generate filename based on timestamp and type
    const filename = `${result.type}_${result.timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = join(RESULTS_DIR, filename);

    // Save result
    await writeFile(
      filepath,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save benchmark result:', error);
    throw error;
  }
}

/**
 * Load all benchmark results
 * @returns Array of benchmark results
 */
export async function loadBenchmarkResults(): Promise<BenchmarkResult[]> {
  try {
    // Ensure results directory exists
    await mkdir(RESULTS_DIR, { recursive: true });

    // Read all files in results directory
    const files = await readdir(RESULTS_DIR);
    const results: BenchmarkResult[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(RESULTS_DIR, file), 'utf-8');
        results.push(JSON.parse(content));
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to load benchmark results:', error);
    throw error;
  }
}

/**
 * Calculate statistics from benchmark results
 * @param results Array of benchmark results
 * @param metricKey Metric to analyze
 * @returns Statistical analysis
 */
export function analyzeResults(
  results: BenchmarkResult[],
  metricKey: string
): {
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
} {
  const values = results
    .map(r => r.metrics[metricKey])
    .filter(v => typeof v === 'number');

  if (values.length === 0) {
    throw new Error(`No valid values found for metric: ${metricKey}`);
  }

  // Sort values for median calculation
  values.sort((a, b) => a - b);

  // Calculate statistics
  const min = values[0];
  const max = values[values.length - 1];
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];

  // Calculate standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, avg, median, stdDev };
}

/**
 * Compare two benchmark results
 * @param result1 First benchmark result
 * @param result2 Second benchmark result
 * @param metrics Array of metrics to compare
 * @returns Comparison results
 */
export function compareResults(
  result1: BenchmarkResult,
  result2: BenchmarkResult,
  metrics: string[]
): {
  [metric: string]: {
    difference: number;
    percentageChange: number;
  };
} {
  const comparison: {
    [metric: string]: {
      difference: number;
      percentageChange: number;
    };
  } = {};

  for (const metric of metrics) {
    const value1 = result1.metrics[metric];
    const value2 = result2.metrics[metric];

    if (typeof value1 === 'number' && typeof value2 === 'number') {
      const difference = value2 - value1;
      const percentageChange = ((value2 - value1) / value1) * 100;

      comparison[metric] = {
        difference,
        percentageChange
      };
    }
  }

  return comparison;
} 