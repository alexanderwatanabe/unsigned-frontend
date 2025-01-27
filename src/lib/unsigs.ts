import unsigsData from '../assets/unsigs.json';
import type { UnsigsData } from './types';

export const unsigs: UnsigsData = unsigsData;

// Utility functions can also be exported here
export function getUnsig(id: string) {
    return unsigs[id];
}

export async function loadUnsigs() {
    const unsigsData = await import('../assets/unsigs.json');
    return unsigsData.default;
} 