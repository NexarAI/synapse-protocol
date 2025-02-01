import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface NetworkMetrics {
  latencyMs: number;
  packetLoss: number;
}

/**
 * Measure network latency to an endpoint
 * @param endpoint URL to test
 * @returns Network metrics including latency and packet loss
 */
export async function measureLatency(endpoint: string): Promise<NetworkMetrics> {
  const url = new URL(endpoint);
  const host = url.hostname;
  
  try {
    // Measure latency using ping
    const { stdout } = await execAsync(`ping -n 10 ${host}`);
    
    // Parse ping output
    const lines = stdout.split('\n');
    const stats = lines[lines.length - 2]; // Get the statistics line
    
    // Extract average latency and packet loss
    const latencyMatch = stats.match(/Average = (\d+)ms/);
    const lossMatch = stats.match(/Lost = (\d+) \((\d+)%\)/);
    
    return {
      latencyMs: latencyMatch ? parseInt(latencyMatch[1]) : 0,
      packetLoss: lossMatch ? parseInt(lossMatch[2]) : 0
    };
  } catch (error) {
    console.warn('Failed to measure network metrics:', error);
    return {
      latencyMs: 0,
      packetLoss: 0
    };
  }
}

/**
 * Test network throughput by downloading a sample payload
 * @param endpoint URL to test
 * @param payloadSize Size of payload in bytes
 * @returns Throughput in Mbps
 */
export async function measureThroughput(
  endpoint: string,
  payloadSize: number = 1024 * 1024 // 1MB default
): Promise<number> {
  try {
    const startTime = process.hrtime.bigint();
    
    // Download payload
    const response = await fetch(endpoint);
    const buffer = await response.arrayBuffer();
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    // Calculate throughput in Mbps
    return (buffer.byteLength * 8) / (durationMs * 1000);
  } catch (error) {
    console.warn('Failed to measure throughput:', error);
    return 0;
  }
}

/**
 * Test connection stability by making multiple requests
 * @param endpoint URL to test
 * @param iterations Number of requests to make
 * @returns Success rate percentage
 */
export async function testConnectionStability(
  endpoint: string,
  iterations: number = 100
): Promise<number> {
  let successCount = 0;
  
  for (let i = 0; i < iterations; i++) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        successCount++;
      }
    } catch (error) {
      // Connection failed
    }
  }
  
  return (successCount / iterations) * 100;
}

/**
 * Check if endpoint supports HTTP/2
 * @param endpoint URL to test
 * @returns True if HTTP/2 is supported
 */
export async function checkHttp2Support(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(endpoint);
    const protocol = response.headers.get('x-protocol') || '';
    return protocol.includes('h2');
  } catch (error) {
    console.warn('Failed to check HTTP/2 support:', error);
    return false;
  }
}

/**
 * Measure DNS resolution time
 * @param hostname Hostname to resolve
 * @returns Resolution time in milliseconds
 */
export async function measureDnsResolution(hostname: string): Promise<number> {
  try {
    const startTime = process.hrtime.bigint();
    
    await execAsync(`nslookup ${hostname}`);
    
    const endTime = process.hrtime.bigint();
    return Number(endTime - startTime) / 1_000_000;
  } catch (error) {
    console.warn('Failed to measure DNS resolution:', error);
    return 0;
  }
} 