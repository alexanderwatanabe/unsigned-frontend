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