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
const FULL_RES = 4096;  // Full resolution for distribution generation

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

// Helper function to rotate 2D array counterclockwise to match numpy's rot90
function rot90(matrix: number[][], k: number = 1): number[][] {
  k = ((k % 4) + 4) % 4; // Normalize k to be between 0 and 3
  if (k === 0) return matrix;
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  let result = Array(cols).fill(0).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // Change rotation direction to counterclockwise
      if (k === 1) result[cols - 1 - j][i] = matrix[i][j];         // 90° counterclockwise
      else if (k === 2) result[rows - 1 - i][cols - 1 - j] = matrix[i][j];  // 180°
      else if (k === 3) result[j][rows - 1 - i] = matrix[i][j];    // 270° counterclockwise
    }
  }
  
  return result;
}

// Initialize distributions and channels
function initializeDistributions(dim: number): { p_2d: number[][], c_2d: number[][] } {
  // Always generate at full resolution
  const x = Array.from({ length: FULL_RES }, (_, i) => i);
  const mean = FULL_RES / 2;
  const std = FULL_RES / 6;

  // Calculate probability distribution
  const p_1d = norm(x, mean, std);
  
  // Calculate cumulative distribution
  const c_1d = p_1d.reduce((acc: number[], val: number) => {
    const last = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(uint32(last + val));
    return acc;
  }, []);

  // Create 2D arrays at full resolution
  const p_2d_full = scaleMake2d(p_1d, FULL_RES);
  const c_2d_full = scaleMake2d(c_1d, FULL_RES);

  // Scale down if needed
  if (dim === FULL_RES) {
    return { p_2d: p_2d_full, c_2d: c_2d_full };
  }

  // Scale down distributions
  const scale = FULL_RES / dim;
  const p_2d = Array(dim).fill(0).map(() => Array(dim).fill(0));
  const c_2d = Array(dim).fill(0).map(() => Array(dim).fill(0));

  for (let x = 0; x < dim; x++) {
    for (let y = 0; y < dim; y++) {
      // Average the values in each scale x scale block
      let p_sum = 0;
      let c_sum = 0;
      for (let i = 0; i < scale; i++) {
        for (let j = 0; j < scale; j++) {
          const full_x = x * scale + i;
          const full_y = y * scale + j;
          p_sum += p_2d_full[full_x][full_y];
          c_sum += c_2d_full[full_x][full_y];
        }
      }
      p_2d[x][y] = Math.floor(p_sum / (scale * scale));
      c_2d[x][y] = Math.floor(c_sum / (scale * scale));
    }
  }

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

// New types for animation system
interface PropertyBuffer {
  values: number[];  // 1D array for current row/column values
  color: number;     // RGB channel index
  distribution: string;
  rotation: number;
  multiplier: number;
  currentPosition: number; // Current row or column index
  original2D: number[][]; // Keep original 2D array for reference
}

interface AnimationState {
  propertyBuffers: PropertyBuffer[];
  currentBuffer: number;
  isComplete: boolean;
}

// Helper function to generate property buffer
function generatePropertyBuffer(
  multiplier: number,
  color: number,
  distribution: string,
  rotation: number,
  dim: number
): PropertyBuffer {
  // Generate distributions at the output resolution
  const distributions = initializeDistributions(dim);
  
  // Get base distribution
  const dist = distribution === 'Normal' ? distributions.p_2d : distributions.c_2d;
  
  // First rotate the distribution
  const rotatedDist = rot90(dist, rotation / 90);

  // Apply multiplier using uint32 overflow, matching the original algorithm
  const values2D = rotatedDist.map(row =>
    row.map(val => {
      // First multiply using uint32 overflow
      const multiplied = uint32(multiplier * val);
      // Then scale to animation range, preserving relative values
      return Math.floor((multiplied / U_RANGE) * 255);
    })
  );

  // Initialize with first row/column based on rotation
  const initialValues = rotation === 90 || rotation === 270 
    ? values2D.map(row => row[0])  // First column for vertical
    : values2D[0];                 // First row for horizontal

  return {
    values: initialValues,
    color,
    distribution,
    rotation,
    multiplier,
    currentPosition: 0,
    original2D: values2D
  };
}

// New function to generate animation state
export function generateAnimationState(unsig: Unsig, dim: number): AnimationState {
  const propertyBuffers: PropertyBuffer[] = [];
  
  // Generate buffer for each property
  for (let i = 0; i < unsig.num_props; i++) {
    const mult = Number(unsig.properties.multipliers[i]);
    const col = unsig.properties.colors[i];
    const dist = unsig.properties.distributions[i];
    const rot = Number(unsig.properties.rotations[i]);
    
    // Convert color string to RGB channel index
    const colorIndex = col === 'Red' ? 0 : col === 'Green' ? 1 : 2;
    
    propertyBuffers.push(
      generatePropertyBuffer(mult, colorIndex, dist, rot, dim)
    );
  }
  
  return {
    propertyBuffers,
    currentBuffer: 0,
    isComplete: false
  };
}

// Function to perform one step of the animation
export function animationStep(
  state: AnimationState,
  imageData: Uint8Array,
  dim: number
): boolean {
  if (state.isComplete || state.currentBuffer >= state.propertyBuffers.length) {
    return true;
  }
  
  const buffer = state.propertyBuffers[state.currentBuffer];
  let hasRemainingValues = false;

  // Process based on rotation and distribution type
  const isVertical = buffer.rotation === 90 || buffer.rotation === 270;
  const isReverse = buffer.rotation === 180 || buffer.rotation === 270;
  
  // Process current row/column
  let anyUpdates = false;
  for (let i = 0; i < dim; i++) {
    if (buffer.values[i] > 0) {
      // Calculate pixel index based on whether we're processing rows or columns
      const x = isVertical ? i : buffer.currentPosition;
      const y = isVertical ? buffer.currentPosition : i;
      const pixelIndex = (x * dim + y) * 4 + buffer.color;
      
      // Update pixel value
      const currentValue = imageData[pixelIndex];
      const newValue = uint32(currentValue + 1);
      imageData[pixelIndex] = newValue % 256;
      
      // Decrement buffer value
      buffer.values[i]--;
      if (buffer.values[i] > 0) anyUpdates = true;
    }
  }

  // If current row/column still has values, keep processing it
  if (anyUpdates) {
    hasRemainingValues = true;
  } else {
    // Move to next row/column
    buffer.currentPosition = isReverse 
      ? buffer.currentPosition - 1 
      : buffer.currentPosition + 1;

    // Check if we should continue to next row/column
    if ((!isReverse && buffer.currentPosition < dim) || 
        (isReverse && buffer.currentPosition >= 0)) {
      // Load next row/column from original2D
      buffer.values = isVertical
        ? buffer.original2D.map(row => row[buffer.currentPosition])
        : buffer.original2D[buffer.currentPosition];
      hasRemainingValues = true;
    }
  }
  
  // Move to next buffer if current one is complete
  if (!hasRemainingValues) {
    state.currentBuffer++;
    // Initialize next buffer if available
    if (state.currentBuffer < state.propertyBuffers.length) {
      const nextBuffer = state.propertyBuffers[state.currentBuffer];
      const isNextVertical = nextBuffer.rotation === 90 || nextBuffer.rotation === 270;
      nextBuffer.currentPosition = nextBuffer.rotation === 180 || nextBuffer.rotation === 270 ? dim - 1 : 0;
      nextBuffer.values = isNextVertical
        ? nextBuffer.original2D.map(row => row[nextBuffer.currentPosition])
        : nextBuffer.original2D[nextBuffer.currentPosition];
    }
  }
  
  // Check if animation is complete
  state.isComplete = state.currentBuffer >= state.propertyBuffers.length;
  
  return state.isComplete;
}

// New types for video recording
interface VideoRecordingState {
  mediaRecorder: MediaRecorder;
  chunks: Blob[];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isRecording: boolean;
}

// Function to setup video recording
export function setupVideoRecording(canvas: HTMLCanvasElement): VideoRecordingState {
  const chunks: Blob[] = [];
  const stream = canvas.captureStream(30); // 30 FPS
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000 // 5Mbps for good quality
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return {
    mediaRecorder,
    chunks,
    canvas,
    ctx: canvas.getContext('2d')!,
    isRecording: false
  };
}

// Function to start recording
export function startRecording(recordingState: VideoRecordingState) {
  recordingState.chunks = [];
  recordingState.isRecording = true;
  recordingState.mediaRecorder.start();
}

// Function to stop recording and get video URL
export function stopRecording(recordingState: VideoRecordingState): Promise<string> {
  return new Promise((resolve) => {
    recordingState.mediaRecorder.onstop = () => {
      const blob = new Blob(recordingState.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      recordingState.isRecording = false;
      resolve(url);
    };
    recordingState.mediaRecorder.stop();
  });
}

// Modified animation step that works with video recording
export async function animateWithRecording(
  state: AnimationState,
  recordingState: VideoRecordingState,
  dim: number,
  frameDelay: number = 1000 / 30 // 30 FPS
): Promise<string> {
  // Start recording
  startRecording(recordingState);
  
  // Create image data for animation
  const imageData = new Uint8Array(dim * dim * 4);
  imageData.fill(0);
  for (let i = 3; i < imageData.length; i += 4) {
    imageData[i] = 255; // Set alpha channel
  }

  // Animation loop
  while (!state.isComplete) {
    animationStep(state, imageData, dim);
    
    // Update canvas with new frame
    const frame = new ImageData(
      new Uint8ClampedArray(imageData),
      dim,
      dim
    );
    recordingState.ctx.putImageData(frame, 0, 0);
    
    // Wait for next frame
    await new Promise(resolve => setTimeout(resolve, frameDelay));
  }

  // Stop recording and return video URL
  return stopRecording(recordingState);
}

// Helper function to create download link
export function createVideoDownloadLink(videoUrl: string, filename: string = 'unsig-animation.webm'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = videoUrl;
  link.download = filename;
  link.textContent = 'Download Animation';
  return link;
}

// Type for a single animation frame
interface AnimationFrame {
  imageData: Uint8Array;
  timestamp: number;
}

// Function to generate all animation frames
export async function generateAnimationFrames(
  unsig: Unsig,
  dim: number,
  onProgress?: (progress: number) => void
): Promise<AnimationFrame[]> {
  const frames: AnimationFrame[] = [];
  const state = generateAnimationState(unsig, dim);
  const FPS = 60; // Update to 60fps
  
  // Create initial frame
  const imageData = new Uint8Array(dim * dim * 4);
  imageData.fill(0);
  for (let i = 3; i < imageData.length; i += 4) {
    imageData[i] = 255; // Set alpha channel
  }
  
  // Add initial frame
  frames.push({
    imageData: new Uint8Array(imageData),
    timestamp: 0
  });
  
  // Generate frames until animation is complete
  let frameCount = 1;
  while (!state.isComplete) {
    animationStep(state, imageData, dim);
    
    // Create a copy of the current frame
    frames.push({
      imageData: new Uint8Array(imageData),
      timestamp: frameCount * (1000 / FPS) // Use 60fps timing
    });
    
    frameCount++;
    
    // Report progress
    if (onProgress) {
      const progress = (state.currentBuffer / state.propertyBuffers.length) * 100;
      onProgress(Math.floor(progress));
    }
  }
  
  return frames;
}

// Function to create video from frames
export async function createVideo(
  frames: AnimationFrame[],
  canvas: HTMLCanvasElement,
  dim: number,
  fps: number = 60,
  videoBitsPerSecond: number = 10000000
): Promise<string> {
  const ctx = canvas.getContext('2d')!;
  const stream = canvas.captureStream(0); // 0 fps, we'll add frames manually
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond
  });
  
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    
    mediaRecorder.start();
    
    // Function to add frame to video
    const addFrame = (index: number) => {
      if (index >= frames.length) {
        mediaRecorder.stop();
        return;
      }
      
      const frame = frames[index];
      const imageData = new ImageData(
        new Uint8ClampedArray(frame.imageData),
        dim,
        dim
      );
      
      ctx.putImageData(imageData, 0, 0);
      (stream.getVideoTracks()[0] as any).requestFrame();
      
      // Schedule next frame at 60fps timing
      setTimeout(() => addFrame(index + 1), 1000 / fps);
    };
    
    // Start adding frames
    addFrame(0);
  });
}

// Helper function to generate and create video in one step
export async function generateVideo(
  unsig: Unsig,
  canvas: HTMLCanvasElement,
  dim: number,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Generate all frames
  const frames = await generateAnimationFrames(unsig, dim, onProgress);
  
  // Create video from frames
  return createVideo(frames, canvas, dim);
} 
