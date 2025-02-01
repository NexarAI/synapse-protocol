/**
 * Generate random neural state for benchmarking
 * @param size Number of weights in the neural state
 * @returns Random neural state object
 */
export function generateRandomNeuralState(size: number = 1000) {
  const weights = new Float32Array(size);
  const gradients = new Float32Array(size);

  // Generate random weights and gradients
  for (let i = 0; i < size; i++) {
    weights[i] = (Math.random() * 2) - 1; // Random values between -1 and 1
    gradients[i] = (Math.random() * 0.1) - 0.05; // Small random gradients
  }

  return {
    weights,
    gradients,
    timestamp: Date.now(),
    version: 1
  };
}

/**
 * Calculate neural state size in bytes
 * @param state Neural state object
 * @returns Size in bytes
 */
export function calculateStateSize(state: {
  weights: Float32Array;
  gradients: Float32Array;
  timestamp: number;
  version: number;
}): number {
  return (
    state.weights.length * 4 + // 4 bytes per float
    state.gradients.length * 4 + // 4 bytes per float
    8 + // 8 bytes for timestamp (number)
    4 // 4 bytes for version (number)
  );
}

/**
 * Validate neural state format and values
 * @param state Neural state object to validate
 * @returns True if valid, false otherwise
 */
export function validateNeuralState(state: any): boolean {
  if (!state || typeof state !== 'object') return false;

  // Check required properties
  if (!state.weights || !state.gradients || !state.timestamp || !state.version) {
    return false;
  }

  // Check types
  if (!(state.weights instanceof Float32Array) ||
      !(state.gradients instanceof Float32Array) ||
      typeof state.timestamp !== 'number' ||
      typeof state.version !== 'number') {
    return false;
  }

  // Check array lengths match
  if (state.weights.length !== state.gradients.length) {
    return false;
  }

  // Check value ranges
  for (let i = 0; i < state.weights.length; i++) {
    if (isNaN(state.weights[i]) || !isFinite(state.weights[i]) ||
        isNaN(state.gradients[i]) || !isFinite(state.gradients[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Compress neural state for efficient transmission
 * @param state Neural state object
 * @returns Compressed buffer
 */
export function compressNeuralState(state: {
  weights: Float32Array;
  gradients: Float32Array;
  timestamp: number;
  version: number;
}): Buffer {
  // Convert arrays to buffer
  const weightsBuffer = Buffer.from(state.weights.buffer);
  const gradientsBuffer = Buffer.from(state.gradients.buffer);

  // Create metadata buffer
  const metadataBuffer = Buffer.alloc(12); // 8 bytes for timestamp, 4 for version
  metadataBuffer.writeBigInt64LE(BigInt(state.timestamp), 0);
  metadataBuffer.writeInt32LE(state.version, 8);

  // Combine buffers
  return Buffer.concat([
    weightsBuffer,
    gradientsBuffer,
    metadataBuffer
  ]);
}

/**
 * Decompress neural state from buffer
 * @param buffer Compressed buffer
 * @param size Number of weights/gradients
 * @returns Decompressed neural state object
 */
export function decompressNeuralState(buffer: Buffer, size: number): {
  weights: Float32Array;
  gradients: Float32Array;
  timestamp: number;
  version: number;
} {
  const weightsBuffer = buffer.subarray(0, size * 4);
  const gradientsBuffer = buffer.subarray(size * 4, size * 8);
  const metadataBuffer = buffer.subarray(size * 8);

  return {
    weights: new Float32Array(weightsBuffer.buffer),
    gradients: new Float32Array(gradientsBuffer.buffer),
    timestamp: Number(metadataBuffer.readBigInt64LE(0)),
    version: metadataBuffer.readInt32LE(8)
  };
} 