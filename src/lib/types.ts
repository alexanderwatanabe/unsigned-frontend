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
    rotations: string[];
    multipliers: string[];
  };
} 