// Web Worker for off-main-thread unsig generation.
// Vite auto-bundles this when imported via: new Worker(new URL('./unsig.worker.ts', import.meta.url))

import { generateUnsigOptimized, CancelledError } from './generator-optimized';

interface GenerateMessage {
  type: 'generate';
  jobId: number;
  unsig: {
    index: number;
    num_props: number;
    properties: {
      multipliers: number[];
      colors: string[];
      distributions: string[];
      rotations: number[];
    };
  };
  dim: number;
}

interface CancelMessage {
  type: 'cancel';
  jobId: number;
}

type WorkerMessage = GenerateMessage | CancelMessage;

let currentJobId: number | null = null;
let cancelledJobIds = new Set<number>();

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelledJobIds.add(msg.jobId);
    if (currentJobId === msg.jobId) {
      // The running job will check cancellation on next progress tick
    }
    return;
  }

  if (msg.type === 'generate') {
    // Implicitly cancel any previous job
    if (currentJobId !== null) {
      cancelledJobIds.add(currentJobId);
    }

    const { jobId, unsig, dim } = msg;
    currentJobId = jobId;

    try {
      const { index, imageData } = generateUnsigOptimized(unsig, dim, {
        onProgress(percent: number) {
          if (cancelledJobIds.has(jobId)) {
            throw new CancelledError();
          }
          self.postMessage({ type: 'progress', jobId, percent });
        },
      });

      // Transfer the underlying ArrayBuffer zero-copy
      const buffer = imageData.buffer;
      self.postMessage(
        { type: 'complete', jobId, index, imageData: buffer },
        [buffer] as any
      );
    } catch (e) {
      if (e instanceof CancelledError) {
        // Silently swallow — caller already moved on
      } else {
        self.postMessage({
          type: 'error',
          jobId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } finally {
      cancelledJobIds.delete(jobId);
      if (currentJobId === jobId) {
        currentJobId = null;
      }
    }
  }
};
