import * as si from 'systeminformation';

interface SystemInfo {
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
    loadPercentage: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    swapTotal: number;
    swapUsed: number;
  };
  os: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
  };
  network: {
    interfaceSpeed: number;
    type: string;
  };
}

/**
 * Get detailed system information
 * @returns System information object
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const [cpu, mem, os, net] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo(),
    si.networkInterfaces()
  ]);

  // Get primary network interface (usually the first non-internal one)
  const primaryInterface = net.find(iface => 
    !iface.internal && iface.type !== 'virtual'
  );

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      loadPercentage: (await si.currentLoad()).currentLoad
    },
    memory: {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    },
    os: {
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      arch: os.arch
    },
    network: {
      interfaceSpeed: primaryInterface?.speed || 0,
      type: primaryInterface?.type || 'unknown'
    }
  };
}

/**
 * Monitor CPU usage during benchmark
 * @param durationMs Duration to monitor in milliseconds
 * @returns Array of CPU load percentages
 */
export async function monitorCpuUsage(durationMs: number): Promise<number[]> {
  const samples: number[] = [];
  const interval = 1000; // Sample every second
  const iterations = Math.floor(durationMs / interval);

  for (let i = 0; i < iterations; i++) {
    const load = (await si.currentLoad()).currentLoad;
    samples.push(load);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return samples;
}

/**
 * Monitor memory usage during benchmark
 * @param durationMs Duration to monitor in milliseconds
 * @returns Array of memory usage percentages
 */
export async function monitorMemoryUsage(durationMs: number): Promise<number[]> {
  const samples: number[] = [];
  const interval = 1000; // Sample every second
  const iterations = Math.floor(durationMs / interval);

  for (let i = 0; i < iterations; i++) {
    const mem = await si.mem();
    const usagePercent = (mem.used / mem.total) * 100;
    samples.push(usagePercent);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return samples;
}

/**
 * Check if system meets minimum requirements
 * @returns True if system meets requirements
 */
export async function checkSystemRequirements(): Promise<boolean> {
  const [cpu, mem] = await Promise.all([
    si.cpu(),
    si.mem()
  ]);

  // Define minimum requirements
  const MIN_CORES = 4;
  const MIN_MEMORY_GB = 8;
  const MIN_CPU_SPEED = 2.0;

  // Convert memory to GB
  const totalMemoryGB = mem.total / (1024 * 1024 * 1024);

  return (
    cpu.physicalCores >= MIN_CORES &&
    totalMemoryGB >= MIN_MEMORY_GB &&
    cpu.speed >= MIN_CPU_SPEED
  );
}

/**
 * Get available system resources
 * @returns Object with available CPU and memory
 */
export async function getAvailableResources(): Promise<{
  cpuAvailable: number;
  memoryAvailable: number;
}> {
  const [load, mem] = await Promise.all([
    si.currentLoad(),
    si.mem()
  ]);

  return {
    cpuAvailable: 100 - load.currentLoad,
    memoryAvailable: mem.free
  };
} 