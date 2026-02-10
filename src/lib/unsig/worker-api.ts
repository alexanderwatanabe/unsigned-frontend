// Main-thread async wrapper for the unsig generation worker.
// SSR-safe: worker is only created in the browser.

interface UnsigInput {
  index: number;
  num_props: number;
  properties: {
    multipliers: number[];
    colors: string[];
    distributions: string[];
    rotations: number[];
  };
}

interface GenerateResult {
  index: number;
  imageData: Uint8Array;
}

interface GenerateOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

let worker: Worker | null = null;
let jobCounter = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./unsig.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function generateUnsigAsync(
  unsig: UnsigInput,
  dim: number,
  options?: GenerateOptions
): Promise<GenerateResult> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('generateUnsigAsync is only available in the browser'));
  }

  const w = getWorker();
  const jobId = ++jobCounter;

  return new Promise<GenerateResult>((resolve, reject) => {
    const signal = options?.signal;

    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    function onAbort() {
      w.postMessage({ type: 'cancel', jobId });
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    }

    function onMessage(e: MessageEvent) {
      const msg = e.data;
      if (msg.jobId !== jobId) return;

      if (msg.type === 'progress') {
        options?.onProgress?.(msg.percent);
      } else if (msg.type === 'complete') {
        cleanup();
        resolve({
          index: msg.index,
          imageData: new Uint8Array(msg.imageData),
        });
      } else if (msg.type === 'error') {
        cleanup();
        reject(new Error(msg.error));
      }
    }

    function cleanup() {
      w.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', onAbort);
    }

    w.addEventListener('message', onMessage);
    signal?.addEventListener('abort', onAbort);

    w.postMessage({
      type: 'generate',
      jobId,
      unsig: {
        index: unsig.index,
        num_props: unsig.num_props,
        properties: unsig.properties,
      },
      dim,
    });
  });
}
