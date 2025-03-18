import { Era } from '../../state/types';

// Constants for terrain processing
export const HEIGHT_SCALE = 100; // Named constant for configurable height scaling
export const NODATA_VALUE = 32768; // Indicates missing data in elevation models

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

/**
 * Interface for terrain feature metrics
 * Used to track and validate terrain adjustments
 */
export interface TerrainFeatureMetrics {
  era: Era;
  thamesWidth: number;
  walbrookWidth: number;
  hillHeights: {
    ludgateHill: number;
    cornhill: number;
    towerHill: number;
  };
  adjustmentFactors: {
    thamesWidthChange: number;
    walbrookWidthChange: number;
    ludgateHillHeightChange: number;
    cornhillHeightChange: number;
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
  PROCESS_TIFF_DONE = 'process_tiff_done',
  RESAMPLE = 'resample',
  GENERATE_NORMAL_MAP = 'generate_normal_map',
  APPLY_ADJUSTMENTS = 'apply_adjustments',
  RESULT = 'result',
  ERROR = 'error',
  PROGRESS = 'progress',
}

export interface TerrainWorkerMessage {
  type: TerrainWorkerMessageType;
  data: unknown;
}
