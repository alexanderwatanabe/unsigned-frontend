export interface UnsigProperties {
  multipliers: number[];
  colors: string[];
  distributions: string[];
  rotations: number[];
}

export interface UnsigData {
  index: number;
  num_props: number;
  properties: UnsigProperties;
}

export type UnsigsData = {
  [key: string]: UnsigData;
}

export interface UnsigMetadata {
  id: number;
  properties: {
    colors: string[];
    distributions: string[];
    rotations: number[];
    multipliers: number[];
  };
}

export interface RawUnsigMetadata {
  id: number;
  properties: {
    colors: string[];
    distributions: string[];
    rotations: string[];
    multipliers: string[];
  };
}

export function parseRotation(rotation: string): number {
  return parseInt(rotation, 10);
}

export function parseMultiplier(multiplier: string): number {
  return parseFloat(multiplier);
}

export function convertRawMetadata(raw: RawUnsigMetadata): UnsigMetadata {
  return {
    id: raw.id,
    properties: {
      colors: raw.properties.colors,
      distributions: raw.properties.distributions,
      rotations: raw.properties.rotations.map(parseRotation),
      multipliers: raw.properties.multipliers.map(parseMultiplier)
    }
  };
} 