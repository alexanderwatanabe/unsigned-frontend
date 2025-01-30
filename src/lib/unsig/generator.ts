// TypeScript implementation of the unsig image generation algorithm

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

// Constants
const U_RANGE = 4294967293;

// Helper function to simulate uint32 overflow
function uint32(n: number): number {
  return n >>> 0; // Convert to unsigned 32-bit integer
}

// Helper function to calculate normal distribution
function norm(x: number[], mean: number, std: number): number[] {
  return x.map(val => 
    uint32((Math.PI * std) * Math.exp(-0.5 * Math.pow((val - mean) / std, 2)))
  );
}

// Helper function to scale and create 2D array
function scaleMake2d(s: number[], dim: number): number[][] {
  const min = Math.min(...s);
  const max = Math.max(...s);
  const scaled = s.map(val => 
    uint32((val - min) * (U_RANGE / (max - min)))
  );
  return Array(dim).fill(scaled);
}

// Helper function to rotate 2D array
function rot90(matrix: number[][], k: number = 1): number[][] {
  k = ((k % 4) + 4) % 4; // Normalize k to be between 0 and 3
  if (k === 0) return matrix;
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  let result = Array(cols).fill(0).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (k === 1) result[j][rows - 1 - i] = matrix[i][j];
      else if (k === 2) result[rows - 1 - i][cols - 1 - j] = matrix[i][j];
      else if (k === 3) result[cols - 1 - j][i] = matrix[i][j];
    }
  }
  
  return result;
}

// Initialize distributions and channels
function initializeDistributions(dim: number): { p_2d: number[][], c_2d: number[][] } {
  const x = Array.from({ length: dim }, (_, i) => i);
  const mean = dim / 2;
  const std = dim / 6;

  // Calculate probability distribution
  const p_1d = norm(x, mean, std);
  
  // Calculate cumulative distribution
  const c_1d = p_1d.reduce((acc: number[], val: number) => {
    const last = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(uint32(last + val));
    return acc;
  }, []);

  // Create 2D arrays
  const p_2d = scaleMake2d(p_1d, dim);
  const c_2d = scaleMake2d(c_1d, dim);

  return { p_2d, c_2d };
}

const channels: { [key: string]: number } = { 'Red': 0, 'Green': 1, 'Blue': 2 };

// Main function to generate NFT
export function generateUnsig(unsig: Unsig, dim: number = 4096): { index: number, imageData: Uint8Array } {
  const { index, num_props, properties } = unsig;
  
  // Initialize distributions for the given dimensions
  const distributions = initializeDistributions(dim);
  const dists: { [key: string]: number[][] } = {
    'Normal': distributions.p_2d,
    'CDF': distributions.c_2d
  };
  
  // Initialize 3D array for RGB values
  let n = Array(dim).fill(0).map(() => 
    Array(dim).fill(0).map(() => 
      Array(3).fill(0)
    )
  );

  // Process each property
  for (let i = 0; i < num_props; i++) {
    const mult = properties.multipliers[i];
    const col = properties.colors[i];
    const dist = properties.distributions[i];
    const rot = properties.rotations[i];
    const c = channels[col];
    
    // Get and rotate distribution
    const rotatedDist = rot90(dists[dist], rot / 90);
    
    // Apply multiplier and add to the appropriate channel with uint32 overflow
    for (let x = 0; x < dim; x++) {
      for (let y = 0; y < dim; y++) {
        n[x][y][c] = uint32(n[x][y][c] + uint32(mult * rotatedDist[x][y]));
      }
    }
  }

  // Normalize to 0-255 range and convert to Uint8Array with alpha channel
  const flattenedData = new Uint8Array(dim * dim * 4); // 4 for RGBA
  let idx = 0;
  
  for (let x = 0; x < dim; x++) {
    for (let y = 0; y < dim; y++) {
      for (let c = 0; c < 3; c++) {
        const normalizedValue = Math.floor((n[x][y][c] / U_RANGE) * 255);
        flattenedData[idx++] = Math.min(255, Math.max(0, normalizedValue));
      }
      flattenedData[idx++] = 255; // Alpha channel (fully opaque)
    }
  }

  return {
    index,
    imageData: flattenedData
  };
}

// Helper function to convert the output to ImageData for canvas rendering
export function unsigToImageData(imageData: Uint8Array, dim: number = 4096): ImageData {
  // ImageData expects RGBA format
  return new ImageData(
    new Uint8ClampedArray(imageData),
    dim,
    dim
  );
}

// Helper function to create a minimal unsig object
export function createUnsig(
  index: number,
  properties: UnsigProperties
): Unsig {
  return {
    index,
    num_props: properties.multipliers.length,
    properties
  };
} 
