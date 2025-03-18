import { Era } from '../../state/types';

// Constants for terrain processing
export const HEIGHT_SCALE = 1.0; // Scale factor for visualizing terrain
export const NODATA_VALUE = -9999; // Indicates missing data in elevation models

export interface Resolution {
  width: number;
  height: number;
}

export interface GeologicalFeature {
  name: string;
  type: string;
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
  area: number;
  averageHeight: number;
  range: {
    min: number;
    max: number;
  };
  slope: number;
}

// Historical adjustment constants
export const ROMAN_ERA_ADJUSTMENTS = {
  // London before extensive modifications
  heightScale: 1.0,
  // Regions that were marshland in Roman times
  wetlandMasks: [
    {
      center: { x: 500, y: 300 }, // Example coordinates
      radius: 100,
      depth: 5.0, // Depression depth in meters
    },
  ],
  // Roman walls and fortifications - raised areas
  artificialStructures: [
    {
      path: [
        { x: 450, y: 450 },
        { x: 550, y: 450 },
        { x: 550, y: 550 },
        { x: 450, y: 550 },
      ],
      height: 3.0, // Height in meters
      width: 10.0, // Width in meters
    },
  ],
};

export const CYBERPUNK_ERA_ADJUSTMENTS = {
  // Future London with extreme modifications
  heightScale: 1.2, // Slightly exaggerated terrain
  // Regions converted to water (flooded low-lying areas)
  floodedRegions: [
    {
      bounds: { minX: 400, minY: 200, maxX: 600, maxY: 300 },
      depth: 10.0, // Water depth in meters
    },
  ],
  // Raised platforms and mega-structures
  megaStructures: [
    {
      center: { x: 500, y: 500 },
      radius: 150,
      height: 100.0, // Height in meters
    },
  ],
};

// Mask data for various features (simplified for example)
export const MODERN_INFRASTRUCTURE_MASK = {
  // Areas where modern infrastructure should be masked/smoothed
  buildings: [
    {
      bounds: { minX: 300, minY: 300, maxX: 350, maxY: 350 },
      height: 20.0, // Building height in meters
    },
  ],
  roads: [
    {
      path: [
        { x: 200, y: 200 },
        { x: 800, y: 800 },
      ],
      width: 15.0, // Road width in meters
    },
  ],
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
  NORMAL_MAP_DONE = 'normal_map_done',
  APPLY_ADJUSTMENTS = 'apply_adjustments',
  ADJUSTMENTS_DONE = 'adjustments_done',
  RESULT = 'result',
  ERROR = 'error',
  PROGRESS = 'progress',
  WORKER_BUSY = 'worker_busy',
}

export interface TerrainWorkerMessage {
  type: TerrainWorkerMessageType;
  data: unknown;
}

/**
 * Parameters for terrain generation
 */
export interface TerrainGenerationParams {
  resolution: Resolution;
  adjustments?: {
    terraceStrength?: number;
    smoothing?: number;
    erosion?: number;
  };
}

/**
 * Import fromArrayBuffer from geotiff package
 * This is a workaround to avoid importing the entire geotiff package in the worker
 */
export { fromArrayBuffer } from 'geotiff';
