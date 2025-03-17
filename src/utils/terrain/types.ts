import { Era } from '../../state/types';

export interface Resolution {
  width: number;
  height: number;
}

export interface GeologicalFeature {
  name: string;
  type: 'river' | 'hill' | 'valley' | 'plain';
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  metadata: Record<string, unknown>;
}

export interface TerrainSettings {
  resolution: Resolution;
  segmentSize: number;
  heightScale: number;
  era: Era;
}

export interface TerrainAdjustment {
  type: 'river' | 'elevation' | 'feature';
  name: string;
  factor: number; // Multiplier for the adjustment
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// Historical adjustment constants
export const ROMAN_ERA_ADJUSTMENTS: TerrainAdjustment[] = [
  { type: 'river', name: 'thames', factor: 0.7 }, // Thames was narrower
  { type: 'river', name: 'walbrook', factor: 1.5 }, // Walbrook was more prominent
  { type: 'river', name: 'fleet', factor: 1.3 }, // Fleet was wider and navigable
  { type: 'elevation', name: 'modern_infrastructure', factor: 0.8 },
  { type: 'elevation', name: 'ludgate_hill', factor: 1.2 }, // More prominent
  { type: 'elevation', name: 'cornhill', factor: 1.15 }, // More prominent
];

export const CYBERPUNK_ERA_ADJUSTMENTS: TerrainAdjustment[] = [
  { type: 'elevation', name: 'megastructure_foundations', factor: 1.2 },
];

// Mask data for various features (simplified for example)
export const MODERN_INFRASTRUCTURE_MASK = {
  // Coordinates would be defined here
};

export const MEGASTRUCTURE_FOUNDATION_MASK = {
  // Coordinates would be defined here
};

// Worker message types
export enum TerrainWorkerMessageType {
  PROCESS_TIFF = 'process_tiff',
  RESAMPLE = 'resample',
  APPLY_ADJUSTMENTS = 'apply_adjustments',
  GENERATE_NORMAL_MAP = 'generate_normal_map',
  RESULT = 'result',
  PROCESS_TIFF_DONE = 'process_tiff_done',
  ERROR = 'error',
}

export interface TerrainWorkerMessage {
  type: TerrainWorkerMessageType;
  data: unknown;
}
