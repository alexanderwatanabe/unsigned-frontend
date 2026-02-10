// Worker pool for parallel unsig image generation.
// Spawns N workers and distributes generation jobs across idle workers.

import type { UnsigData } from '$lib/types';

type OnResultCallback = (index: number, imageUrl: string) => void;

interface QueuedJob {
  unsig: UnsigData;
  dim: number;
  batchId: number;
  onResult: OnResultCallback;
}

interface WorkerEntry {
  worker: Worker;
  busy: boolean;
  jobId: number | null;
}

let nextJobId = 0;

// Reusable canvas for RGBA → data URL conversion
let cvs: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function rgbaToDataUrl(buffer: ArrayBuffer, dim: number): string {
  if (!cvs) {
    cvs = document.createElement('canvas');
    ctx = cvs.getContext('2d')!;
  }
  if (cvs.width !== dim || cvs.height !== dim) {
    cvs.width = dim;
    cvs.height = dim;
  }
  const imageData = new ImageData(new Uint8ClampedArray(buffer), dim, dim);
  ctx!.putImageData(imageData, 0, 0);
  return cvs.toDataURL();
}

export function createWorkerPool() {
  const workerCount = Math.min(navigator.hardwareConcurrency || 4, 8);

  const workers: WorkerEntry[] = [];
  const queue: QueuedJob[] = [];
  const jobCallbacks = new Map<number, { onResult: OnResultCallback; dim: number; batchId: number }>();
  let currentBatchId = 0;
  let destroyed = false;

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(
      new URL('./unsig.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const entry: WorkerEntry = { worker, busy: false, jobId: null };

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'complete') {
        entry.busy = false;
        entry.jobId = null;

        const cb = jobCallbacks.get(msg.jobId);
        if (cb && cb.batchId === currentBatchId) {
          const dataUrl = rgbaToDataUrl(msg.imageData, cb.dim);
          cb.onResult(msg.index, dataUrl);
        }
        jobCallbacks.delete(msg.jobId);
        processQueue();
      } else if (msg.type === 'error') {
        console.warn('[worker-pool] job error:', msg.error);
        entry.busy = false;
        entry.jobId = null;
        jobCallbacks.delete(msg.jobId);
        processQueue();
      }
    };

    worker.onerror = (e) => {
      console.error('[worker-pool] worker failed to load:', e.message);
    };

    workers.push(entry);
  }

  function processQueue() {
    if (destroyed) return;

    while (queue.length > 0) {
      const idleWorker = workers.find(w => !w.busy);
      if (!idleWorker) break;

      const job = queue.shift()!;
      if (job.batchId !== currentBatchId) continue;

      const jobId = nextJobId++;
      idleWorker.busy = true;
      idleWorker.jobId = jobId;

      jobCallbacks.set(jobId, {
        onResult: job.onResult,
        dim: job.dim,
        batchId: job.batchId,
      });

      idleWorker.worker.postMessage({
        type: 'generate',
        jobId,
        unsig: {
          index: job.unsig.index,
          num_props: job.unsig.num_props,
          properties: job.unsig.properties,
        },
        dim: job.dim,
      });
    }
  }

  function generateBatch(unsigItems: UnsigData[], dim: number, onResult: OnResultCallback) {
    cancelAll();
    currentBatchId++;
    const batchId = currentBatchId;

    for (const unsig of unsigItems) {
      queue.push({ unsig, dim, batchId, onResult });
    }

    processQueue();
  }

  function cancelAll() {
    currentBatchId++;
    queue.length = 0;
    jobCallbacks.clear();

    for (const entry of workers) {
      if (entry.busy && entry.jobId !== null) {
        entry.worker.postMessage({ type: 'cancel', jobId: entry.jobId });
        entry.busy = false;
        entry.jobId = null;
      }
    }
  }

  function destroy() {
    destroyed = true;
    cancelAll();
    for (const entry of workers) {
      entry.worker.terminate();
    }
    workers.length = 0;
  }

  return { generateBatch, cancelAll, destroy };
}
