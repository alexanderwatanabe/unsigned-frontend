// Shared singleton worker pool + LRU cache for unsig image generation.
// All components use this instead of S3 URLs. SSR-safe (no-ops on server).

import type { UnsigData } from '$lib/types';
import { unsigs } from '$lib/unsigs';

const MAX_CACHE_SIZE = 2000;

// ── LRU cache (Map preserves insertion order) ────────────────────────

const cache = new Map<string, string>();

function cacheKey(id: number, dim: number): string {
	return `${id}:${dim}`;
}

function cacheGet(id: number, dim: number): string | null {
	const key = cacheKey(id, dim);
	const url = cache.get(key);
	if (!url) return null;
	// Move to end (most recently used)
	cache.delete(key);
	cache.set(key, url);
	return url;
}

function cacheSet(id: number, dim: number, url: string): void {
	const key = cacheKey(id, dim);
	cache.delete(key);
	cache.set(key, url);
	if (cache.size > MAX_CACHE_SIZE) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
}

// ── In-flight deduplication ──────────────────────────────────────────

const inFlight = new Map<string, Promise<string>>();

// ── Singleton worker pool ────────────────────────────────────────────

interface WorkerEntry {
	worker: Worker;
	busy: boolean;
}

interface QueuedJob {
	unsigData: UnsigData;
	dim: number;
	jobId: number;
}

interface PoolHandle {
	generate(id: number, dim: number): Promise<string>;
}

let pool: PoolHandle | null = null;

function createPool(): PoolHandle {
	const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4);
	const workers: WorkerEntry[] = [];
	const queue: QueuedJob[] = [];
	const callbacks = new Map<
		number,
		{ resolve: (url: string) => void; reject: (err: Error) => void; dim: number; index: number }
	>();
	let nextId = 0;

	// Reusable canvas for RGBA → data URL
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

	function processQueue() {
		while (queue.length > 0) {
			const idle = workers.find((w) => !w.busy);
			if (!idle) break;
			const job = queue.shift()!;
			idle.busy = true;
			idle.worker.postMessage({
				type: 'generate',
				jobId: job.jobId,
				unsig: {
					index: job.unsigData.index,
					num_props: job.unsigData.num_props,
					properties: job.unsigData.properties,
				},
				dim: job.dim,
			});
		}
	}

	for (let i = 0; i < workerCount; i++) {
		const worker = new Worker(
			new URL('./unsig.worker.ts', import.meta.url),
			{ type: 'module' },
		);
		const entry: WorkerEntry = { worker, busy: false };

		worker.onmessage = (e) => {
			const msg = e.data;
			if (msg.type === 'complete') {
				entry.busy = false;
				const cb = callbacks.get(msg.jobId);
				if (cb) {
					const url = rgbaToDataUrl(msg.imageData, cb.dim);
					cacheSet(cb.index, cb.dim, url);
					cb.resolve(url);
					callbacks.delete(msg.jobId);
				}
				processQueue();
			} else if (msg.type === 'error') {
				entry.busy = false;
				const cb = callbacks.get(msg.jobId);
				if (cb) {
					cb.reject(new Error(msg.error));
					callbacks.delete(msg.jobId);
				}
				processQueue();
			}
		};

		worker.onerror = (e) => {
			console.error('[image-cache] worker error:', e.message);
		};

		workers.push(entry);
	}

	function generate(id: number, dim: number): Promise<string> {
		const unsigData = unsigs[id.toString()];
		if (!unsigData) {
			return Promise.reject(new Error(`Unknown unsig ${id}`));
		}

		return new Promise((resolve, reject) => {
			const jobId = nextId++;
			callbacks.set(jobId, { resolve, reject, dim, index: id });
			queue.push({ unsigData, dim, jobId });
			processQueue();
		});
	}

	return { generate };
}

function getPool(): PoolHandle {
	if (!pool) pool = createPool();
	return pool;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Get a cached data URL for an unsig, or null if not yet generated.
 */
export function getCachedUrl(id: number, dim: number): string | null {
	return cacheGet(id, dim);
}

/**
 * Generate (or return cached) data URL for a single unsig.
 * Deduplicates concurrent requests for the same id+dim.
 */
export function generateImage(id: number, dim: number): Promise<string> {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('generateImage requires a browser environment'));
	}

	const cached = cacheGet(id, dim);
	if (cached) return Promise.resolve(cached);

	const key = cacheKey(id, dim);
	const existing = inFlight.get(key);
	if (existing) return existing;

	const promise = getPool()
		.generate(id, dim)
		.finally(() => inFlight.delete(key));
	inFlight.set(key, promise);
	return promise;
}

/**
 * Generate images for a list of unsig IDs. Calls onResult for each
 * as they complete (cached ones fire immediately).
 */
export function generateBatch(
	ids: number[],
	dim: number,
	onResult: (id: number, url: string) => void,
): void {
	if (typeof window === 'undefined') return;

	for (const id of ids) {
		const cached = cacheGet(id, dim);
		if (cached) {
			onResult(id, cached);
		} else {
			generateImage(id, dim).then((url) => onResult(id, url));
		}
	}
}
