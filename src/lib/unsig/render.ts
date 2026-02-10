import { generateUnsig, unsigToImageData, createUnsig } from './generator';

interface RenderConfig {
  layerDelay?: number;
  fadeInDuration?: number;
  onLayerComplete?: (layer: number, total: number) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

interface UnsigData {
  index: number;
  num_props: number;
  properties: {
    multipliers: number[];
    colors: string[];
    distributions: string[];
    rotations: number[];
  };
}

/**
 * Render an unsig progressively onto a canvas, layer by layer.
 * Returns a promise that resolves when rendering is complete.
 */
export async function renderProgressively(
  canvas: HTMLCanvasElement,
  unsig: UnsigData,
  dim: number = 512,
  config: RenderConfig = {}
): Promise<string | null> {
  const {
    layerDelay = 1500,
    onLayerComplete,
    onComplete,
    signal,
  } = config;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = dim;
  canvas.height = dim;

  // Special case: unsig 00000 (no properties)
  if (unsig.index === 0 || unsig.num_props === 0) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, dim, dim);
    onComplete?.();
    return canvas.toDataURL('image/png');
  }

  let lastDataUrl: string | null = null;

  for (let i = 1; i <= unsig.num_props; i++) {
    if (signal?.aborted) return null;

    const formattedUnsig = createUnsig(unsig.index, {
      multipliers: unsig.properties.multipliers.slice(0, i),
      colors: unsig.properties.colors.slice(0, i),
      distributions: unsig.properties.distributions.slice(0, i),
      rotations: unsig.properties.rotations.slice(0, i),
    });

    const { imageData } = generateUnsig(formattedUnsig, dim);
    const imgData = unsigToImageData(imageData, dim);
    ctx.putImageData(imgData, 0, 0);

    lastDataUrl = canvas.toDataURL('image/png');
    onLayerComplete?.(i, unsig.num_props);

    if (i < unsig.num_props) {
      await new Promise(resolve => setTimeout(resolve, layerDelay));
    }
  }

  onComplete?.();
  return lastDataUrl;
}

/**
 * Render a single unsig fully (all layers at once) and return a data URL.
 */
export function renderFull(
  canvas: HTMLCanvasElement,
  unsig: UnsigData,
  dim: number = 512
): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = dim;
  canvas.height = dim;

  if (unsig.index === 0 || unsig.num_props === 0) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, dim, dim);
    return canvas.toDataURL('image/png');
  }

  const formattedUnsig = createUnsig(unsig.index, {
    multipliers: unsig.properties.multipliers.map(Number),
    colors: unsig.properties.colors,
    distributions: unsig.properties.distributions,
    rotations: unsig.properties.rotations.map(Number),
  });

  const { imageData } = generateUnsig(formattedUnsig, dim);
  const imgData = unsigToImageData(imageData, dim);
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/png');
}
