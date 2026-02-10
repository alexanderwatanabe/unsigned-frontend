// Optimized unsig generator using 1D distribution lookups and row-by-row processing.
// Produces pixel-identical output to generator.ts but uses O(dim) memory instead of O(dim^2).

interface UnsigProperties {
  multipliers: number[];
  colors: string[];
  distributions: string[];
  rotations: number[];
}

interface Unsig {
  index: number;
  num_props: number;
  properties: UnsigProperties;
}

const U_RANGE = 4294967293;

const CHANNELS: Record<string, number> = { 'Red': 0, 'Green': 1, 'Blue': 2 };

function computeNormal1D(dim: number): Float64Array {
  const result = new Float64Array(dim);
  const mean = dim / 2;
  const std = dim / 6;
  for (let i = 0; i < dim; i++) {
    result[i] = ((Math.PI * std) * Math.exp(-0.5 * Math.pow((i - mean) / std, 2))) >>> 0;
  }
  return result;
}

function computeCDF1D(normal: Float64Array): Float64Array {
  const dim = normal.length;
  const result = new Float64Array(dim);
  let acc = 0;
  for (let i = 0; i < dim; i++) {
    acc = (acc + normal[i]) >>> 0;
    result[i] = acc;
  }
  return result;
}

function scale1D(s: Float64Array): Float64Array {
  let min = s[0], max = s[0];
  for (let i = 1; i < s.length; i++) {
    if (s[i] < min) min = s[i];
    if (s[i] > max) max = s[i];
  }
  const factor = U_RANGE / (max - min);
  const result = new Float64Array(s.length);
  for (let i = 0; i < s.length; i++) {
    result[i] = ((s[i] - min) * factor) >>> 0;
  }
  return result;
}

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

interface GenerateOptions {
  onProgress?: (percent: number) => void;
}

export function generateUnsigOptimized(
  unsig: Unsig,
  dim: number,
  options?: GenerateOptions
): { index: number; imageData: Uint8Array } {
  const { index, num_props, properties } = unsig;

  const output = new Uint8Array(dim * dim * 4);

  // Special case: no properties (e.g. unsig #00000) — all black with full alpha
  if (num_props === 0) {
    for (let i = 3; i < output.length; i += 4) {
      output[i] = 255;
    }
    return { index, imageData: output };
  }

  // Precompute 1D distributions
  const normal1D = computeNormal1D(dim);
  const cdf1D = computeCDF1D(normal1D);
  const scaledNormal = scale1D(normal1D);
  const scaledCDF = scale1D(cdf1D);

  const dists: Record<string, Float64Array> = {
    'Normal': scaledNormal,
    'CDF': scaledCDF,
  };

  // Pre-resolve layer parameters
  const layerScaled: Float64Array[] = [];
  const layerChannel: number[] = [];
  const layerMult: number[] = [];
  const layerK: number[] = [];

  for (let i = 0; i < num_props; i++) {
    layerScaled.push(dists[properties.distributions[i]]);
    layerChannel.push(CHANNELS[properties.colors[i]]);
    layerMult.push(properties.multipliers[i]);
    layerK.push(((properties.rotations[i] / 90) % 4 + 4) % 4);
  }

  // Row accumulator: 3 channels per pixel
  const rowAcc = new Float64Array(dim * 3);

  for (let x = 0; x < dim; x++) {
    // Reset accumulator
    rowAcc.fill(0);

    // Apply all layers for this row
    for (let i = 0; i < num_props; i++) {
      const scaled = layerScaled[i];
      const c = layerChannel[i];
      const mult = layerMult[i];
      const k = layerK[i];

      if (k === 0) {
        // value = scaled[y]
        for (let y = 0; y < dim; y++) {
          const idx = y * 3 + c;
          rowAcc[idx] = (rowAcc[idx] + ((mult * scaled[y]) >>> 0)) >>> 0;
        }
      } else if (k === 1) {
        // value = scaled[dim-1-x], constant across row
        const val = (mult * scaled[dim - 1 - x]) >>> 0;
        for (let y = 0; y < dim; y++) {
          const idx = y * 3 + c;
          rowAcc[idx] = (rowAcc[idx] + val) >>> 0;
        }
      } else if (k === 2) {
        // value = scaled[dim-1-y]
        for (let y = 0; y < dim; y++) {
          const idx = y * 3 + c;
          rowAcc[idx] = (rowAcc[idx] + ((mult * scaled[dim - 1 - y]) >>> 0)) >>> 0;
        }
      } else {
        // k === 3: value = scaled[x], constant across row
        const val = (mult * scaled[x]) >>> 0;
        for (let y = 0; y < dim; y++) {
          const idx = y * 3 + c;
          rowAcc[idx] = (rowAcc[idx] + val) >>> 0;
        }
      }
    }

    // Normalize row and write RGBA to output
    const rowOffset = x * dim * 4;
    for (let y = 0; y < dim; y++) {
      const pixelOffset = rowOffset + y * 4;
      const accBase = y * 3;
      for (let c = 0; c < 3; c++) {
        const normalizedValue = Math.floor((rowAcc[accBase + c] / U_RANGE) * 255);
        output[pixelOffset + c] = normalizedValue < 0 ? 0 : normalizedValue > 255 ? 255 : normalizedValue;
      }
      output[pixelOffset + 3] = 255;
    }

    // Progress reporting every 64 rows and on the last row
    if ((x & 63) === 63 || x === dim - 1) {
      const percent = Math.round(((x + 1) / dim) * 100);
      try {
        options?.onProgress?.(percent);
      } catch (e) {
        if (e instanceof CancelledError) throw e;
        throw e;
      }
    }
  }

  return { index, imageData: output };
}
