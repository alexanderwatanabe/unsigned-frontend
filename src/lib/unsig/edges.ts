// Edge fingerprinting for unsig pair and chain matching.
//
// Each unsig's edge pixel values decompose into:
// 1. A "varying" profile: layers with perpendicular rotations contribute a
//    1D distribution function that varies along the edge
// 2. A "constant" offset: layers with parallel rotations contribute a fixed
//    value per channel (only CDF distributions are non-zero at endpoints)
//
// Two edges match when their varying profiles AND constants are identical.
// This allows O(1) lookup of matching unsigs via hash index.

import type { UnsigData, UnsigsData } from '$lib/types';
import { unsigs } from '$lib/unsigs';

const U_RANGE = 4294967293;
const CHANNELS: Record<string, number> = { Red: 0, Green: 1, Blue: 2 };

function uint32(n: number): number {
	return n >>> 0;
}

export type Direction = 'east' | 'west' | 'north' | 'south';

export interface EdgeFingerprint {
	// Varying profiles: sorted encoding of layers that produce non-constant
	// values along the edge. For E/W edges these are rot 90/270 layers;
	// for N/S edges these are rot 0/180 layers.
	hVary: string;
	vVary: string;
	// Constant per-channel offsets [R, G, B] as uint32 values.
	// Only CDF layers with parallel rotations contribute non-zero constants.
	eastConst: [number, number, number];
	westConst: [number, number, number];
	northConst: [number, number, number];
	southConst: [number, number, number];
}

export interface EdgeIndex {
	west: Map<string, number[]>;
	east: Map<string, number[]>;
	north: Map<string, number[]>;
	south: Map<string, number[]>;
	fingerprints: Map<number, EdgeFingerprint>;
}

export interface Pair {
	a: number;
	b: number;
	direction: 'horizontal' | 'vertical';
}

export interface Chain {
	ids: number[];
	direction: 'horizontal' | 'vertical';
}

const OPPOSITE: Record<Direction, Direction> = {
	east: 'west',
	west: 'east',
	north: 'south',
	south: 'north',
};

export function computeEdgeFingerprint(unsig: UnsigData): EdgeFingerprint {
	const { num_props, properties } = unsig;
	const hVaryParts: string[] = [];
	const vVaryParts: string[] = [];
	const eastConst: [number, number, number] = [0, 0, 0];
	const westConst: [number, number, number] = [0, 0, 0];
	const northConst: [number, number, number] = [0, 0, 0];
	const southConst: [number, number, number] = [0, 0, 0];

	for (let i = 0; i < num_props; i++) {
		const mult = properties.multipliers[i];
		const color = properties.colors[i];
		const dist = properties.distributions[i];
		const k = properties.rotations[i] / 90;
		const c = CHANNELS[color];

		if (k === 1 || k === 3) {
			// Varies along E/W edges (perpendicular to horizontal),
			// constant on N/S edges
			hVaryParts.push(`${c}:${dist}:${k}:${mult}`);

			// CDF constant contribution to N/S edges:
			// k=1: North uses dist[dim-1]=U_RANGE, South uses dist[0]=0
			// k=3: North uses dist[0]=0, South uses dist[dim-1]=U_RANGE
			if (dist === 'CDF') {
				const val = uint32(mult * U_RANGE);
				if (k === 1) northConst[c] = uint32(northConst[c] + val);
				else southConst[c] = uint32(southConst[c] + val);
			}
		} else {
			// k=0 or k=2: varies along N/S edges, constant on E/W edges
			vVaryParts.push(`${c}:${dist}:${k}:${mult}`);

			// CDF constant contribution to E/W edges:
			// k=0: East uses dist[dim-1]=U_RANGE, West uses dist[0]=0
			// k=2: East uses dist[0]=0, West uses dist[dim-1]=U_RANGE
			if (dist === 'CDF') {
				const val = uint32(mult * U_RANGE);
				if (k === 0) eastConst[c] = uint32(eastConst[c] + val);
				else westConst[c] = uint32(westConst[c] + val);
			}
		}
	}

	return {
		hVary: hVaryParts.sort().join('|'),
		vVary: vVaryParts.sort().join('|'),
		eastConst,
		westConst,
		northConst,
		southConst,
	};
}

function edgeKey(vary: string, consts: [number, number, number]): string {
	return `${vary}#${consts[0]},${consts[1]},${consts[2]}`;
}

function getEdgeKey(fp: EdgeFingerprint, dir: Direction): string {
	switch (dir) {
		case 'east':
			return edgeKey(fp.hVary, fp.eastConst);
		case 'west':
			return edgeKey(fp.hVary, fp.westConst);
		case 'north':
			return edgeKey(fp.vVary, fp.northConst);
		case 'south':
			return edgeKey(fp.vVary, fp.southConst);
	}
}

export function buildEdgeIndex(allUnsigs: UnsigsData): EdgeIndex {
	const index: EdgeIndex = {
		west: new Map(),
		east: new Map(),
		north: new Map(),
		south: new Map(),
		fingerprints: new Map(),
	};

	for (const [id, unsig] of Object.entries(allUnsigs)) {
		const fp = computeEdgeFingerprint(unsig);
		const numId = Number(id);
		index.fingerprints.set(numId, fp);

		for (const dir of ['east', 'west', 'north', 'south'] as Direction[]) {
			const key = getEdgeKey(fp, dir);
			let list = index[dir].get(key);
			if (!list) {
				list = [];
				index[dir].set(key, list);
			}
			list.push(numId);
		}
	}

	return index;
}

// Cached global index built from the static unsigs dataset
let _cachedIndex: EdgeIndex | null = null;

export function getEdgeIndex(): EdgeIndex {
	if (!_cachedIndex) {
		_cachedIndex = buildEdgeIndex(unsigs);
	}
	return _cachedIndex;
}

export function findEdgeMatches(
	unsigId: number,
	edge: Direction,
	edgeIndex: EdgeIndex,
): number[] {
	const fp = edgeIndex.fingerprints.get(unsigId);
	if (!fp) return [];
	const key = getEdgeKey(fp, edge);
	const opposite = OPPOSITE[edge];
	return (edgeIndex[opposite].get(key) ?? []).filter((id) => id !== unsigId);
}

export function findPairsAmongOwned(
	ownedIds: number[],
	edgeIndex: EdgeIndex,
): Pair[] {
	const ownedSet = new Set(ownedIds);
	const pairs: Pair[] = [];
	const seen = new Set<string>();

	for (const id of ownedIds) {
		// Horizontal: this unsig's East matches another's West → this | other
		for (const matchId of findEdgeMatches(id, 'east', edgeIndex)) {
			if (ownedSet.has(matchId)) {
				const key = `h:${id},${matchId}`;
				if (!seen.has(key)) {
					seen.add(key);
					pairs.push({ a: id, b: matchId, direction: 'horizontal' });
				}
			}
		}

		// Vertical: this unsig's South matches another's North → this above other
		for (const matchId of findEdgeMatches(id, 'south', edgeIndex)) {
			if (ownedSet.has(matchId)) {
				const key = `v:${id},${matchId}`;
				if (!seen.has(key)) {
					seen.add(key);
					pairs.push({ a: id, b: matchId, direction: 'vertical' });
				}
			}
		}
	}

	return pairs;
}

export function buildChain(
	pair: Pair,
	edgeIndex: EdgeIndex,
	ownedSet: Set<number>,
	maxLength = 10,
): Chain {
	const chain: number[] = [pair.a, pair.b];
	const used = new Set(chain);
	const isH = pair.direction === 'horizontal';

	// Extend forward (right / down)
	let current = pair.b;
	while (chain.length < maxLength) {
		const matches = findEdgeMatches(
			current,
			isH ? 'east' : 'south',
			edgeIndex,
		).filter((id) => !used.has(id));
		// Prefer owned unsigs for chain building
		const next = matches.find((id) => ownedSet.has(id)) ?? matches[0];
		if (next === undefined) break;
		chain.push(next);
		used.add(next);
		current = next;
	}

	// Extend backward (left / up)
	current = pair.a;
	while (chain.length < maxLength) {
		const matches = findEdgeMatches(
			current,
			isH ? 'west' : 'north',
			edgeIndex,
		).filter((id) => !used.has(id));
		const next = matches.find((id) => ownedSet.has(id)) ?? matches[0];
		if (next === undefined) break;
		chain.unshift(next);
		used.add(next);
		current = next;
	}

	return { ids: chain, direction: pair.direction };
}

// Deduplicate chains: remove chains whose IDs are a subset of a longer chain
export function deduplicateChains(chains: Chain[]): Chain[] {
	const sorted = [...chains].sort((a, b) => b.ids.length - a.ids.length);
	const result: Chain[] = [];

	for (const chain of sorted) {
		const isSubset = result.some(
			(existing) =>
				existing.direction === chain.direction &&
				chain.ids.every((id) => existing.ids.includes(id)),
		);
		if (!isSubset) {
			result.push(chain);
		}
	}

	return result;
}
