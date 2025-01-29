import unsigsData from '../assets/unsigs.json';
import type { UnsigsData, UnsigMetadata } from './types';

export const unsigs: UnsigsData = unsigsData;

// Utility functions can also be exported here
export function getUnsig(id: string) {
    return unsigs[id];
}

export async function loadUnsigs() {
    const unsigsData = await import('../assets/unsigs.json');
    return unsigsData.default;
}

export function getUnsigMetadata(): UnsigMetadata[] {
  const data = unsigsData as UnsigsData;
  
  return Object.entries(data).map(([id, unsig]) => ({
    id: parseInt(id),
    properties: {
      colors: unsig.properties.colors,
      distributions: unsig.properties.distributions,
      rotations: unsig.properties.rotations.map(r => r.toString()),
      multipliers: unsig.properties.multipliers.map(m => m.toString())
    }
  }));
} 