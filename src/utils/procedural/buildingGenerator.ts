import * as THREE from 'three';
import { BuildingType } from '../../state/BuildingState';
import { type Era } from '../../state/gameState';
import {
  createHollowBox,
  createRomanAtrium,
  createRomanPeristyle,
  createRomanRoof,
} from './buildingCSG';
import { ConfigurationLoader, initializeConfigurationLoader } from './configurationLoader';
import { materialFactory } from '../three/materialFactory';

// Simple random number generator class since THREE.MathUtils.Random doesn't exist
class RandomGenerator {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Generate a random float between min and max
  generateFloatBetween(min: number, max: number): number {
    // Simple implementation of a seeded random
    const x = Math.sin(this.seed++) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  }

  // Generate a random integer between min (inclusive) and max (inclusive)
  generateIntegerBetween(min: number, max: number): number {
    return Math.floor(this.generateFloatBetween(min, max + 1));
  }

  // Generate a boolean with a specific probability
  generateBooleanWithProbability(probability: number): boolean {
    return this.generateFloatBetween(0, 1) < probability;
  }
}

// Types for building generation parameters
export interface BuildingParams {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
  type: BuildingType;
  era: Era;
  seed: number;
}

// Interface for generated building mesh data
export interface BuildingMeshData {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  type: BuildingType;
}

// Building configuration interface for configuration-driven generation
export interface BuildingConfig {
  widthRange: [number, number];
  depthRange: [number, number];
  heightRange: [number, number];
  material: THREE.MeshStandardMaterial;
  // Enhanced configuration properties
  features?: {
    windows?: {
      enabled: boolean;
      density: number; // Windows per wall unit
      size: [number, number]; // Width, height
      style: 'roman' | 'cyberpunk' | 'modern';
    };
    doors?: {
      width: number;
      height: number;
      position: 'center' | 'offset';
      style: 'roman' | 'cyberpunk' | 'modern';
    };
    roof?: {
      style: 'flat' | 'peaked' | 'domed';
      height: number; // As a ratio of building height
      overhang: number;
    };
    decoration?: {
      level: number; // 0-1 scale of decoration amount
      style: 'roman' | 'cyberpunk' | 'modern';
    };
  };
  // Structural variations
  variations?: {
    wallThickness?: number;
    floorThickness?: number;
    columnDensity?: number; // For buildings with columns
    roomDivisions?: number; // Number of interior rooms
  };
  // Performance settings
  performance?: {
    detailLevel?: number; // 0-1 scale affecting geometry complexity
    maxVertices?: number; // Optional vertex budget
    textureResolution?: 'low' | 'medium' | 'high';
  };
}

// Unified configuration object with nested era configurations
const buildingConfigs: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }> =
  {
    domus: {
      roman: {
        widthRange: [5, 7],
        depthRange: [7, 10],
        heightRange: [3, 4],
        material: new THREE.MeshStandardMaterial({ color: '#c9b18f' }),
        // Add enhanced configuration for Roman domus
        features: {
          windows: {
            enabled: true,
            density: 0.3,
            size: [0.5, 0.8],
            style: 'roman',
          },
          doors: {
            width: 1.2,
            height: 2.2,
            position: 'center',
            style: 'roman',
          },
          roof: {
            style: 'peaked',
            height: 0.3,
            overhang: 0.4,
          },
          decoration: {
            level: 0.7,
            style: 'roman',
          },
        },
        variations: {
          wallThickness: 0.2,
          floorThickness: 0.2,
          columnDensity: 0.8,
          roomDivisions: 5,
        },
        performance: {
          detailLevel: 0.8,
          textureResolution: 'medium',
        },
      },
      cyberpunk: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    insula: {
      roman: {
        widthRange: [8, 12],
        depthRange: [8, 12],
        heightRange: [8, 11],
        material: new THREE.MeshStandardMaterial({ color: '#d1bc9e' }),
      },
      cyberpunk: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    forum: {
      roman: {
        widthRange: [20, 30],
        depthRange: [30, 40],
        heightRange: [6, 8],
        material: new THREE.MeshStandardMaterial({ color: '#e6e2d7' }),
      },
      cyberpunk: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    temple: {
      roman: {
        widthRange: [12, 16],
        depthRange: [20, 24],
        heightRange: [10, 12],
        material: new THREE.MeshStandardMaterial({ color: '#f0f0f0' }),
      },
      cyberpunk: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    bath: {
      roman: {
        widthRange: [15, 20],
        depthRange: [15, 20],
        heightRange: [8, 10],
        material: new THREE.MeshStandardMaterial({ color: '#e0d7c9' }),
      },
      cyberpunk: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'megacorp-tower': {
      roman: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
      cyberpunk: {
        widthRange: [15, 20],
        depthRange: [15, 20],
        heightRange: [50, 80],
        material: new THREE.MeshStandardMaterial({
          color: '#203354',
          emissive: '#4080ff',
          emissiveIntensity: 0.2,
        }),
      },
    },
    'residential-stack': {
      roman: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
      cyberpunk: {
        widthRange: [12, 15],
        depthRange: [12, 15],
        heightRange: [25, 40],
        material: new THREE.MeshStandardMaterial({
          color: '#2c2c34',
          emissive: '#ff6060',
          emissiveIntensity: 0.1,
        }),
      },
    },
    'market-hub': {
      roman: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
      cyberpunk: {
        widthRange: [25, 30],
        depthRange: [25, 30],
        heightRange: [10, 12],
        material: new THREE.MeshStandardMaterial({
          color: '#323232',
          emissive: '#ff9040',
          emissiveIntensity: 0.2,
        }),
      },
    },
    'data-center': {
      roman: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
      cyberpunk: {
        widthRange: [20, 25],
        depthRange: [20, 25],
        heightRange: [15, 20],
        material: new THREE.MeshStandardMaterial({
          color: '#1a1a2e',
          emissive: '#40ffff',
          emissiveIntensity: 0.3,
        }),
      },
    },
    'entertainment-complex': {
      roman: {
        widthRange: [0, 0],
        depthRange: [0, 0],
        heightRange: [0, 0],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
      cyberpunk: {
        widthRange: [30, 40],
        depthRange: [30, 40],
        heightRange: [20, 25],
        material: new THREE.MeshStandardMaterial({
          color: '#2d1b30',
          emissive: '#ff40ff',
          emissiveIntensity: 0.3,
        }),
      },
    },
  };

// Initialize the configuration loader with default configurations
let configurationLoaderInitialized = false;

/**
 * Initialize the configuration system with the default building configurations
 */
export function initializeConfigurationSystem(): void {
  if (!configurationLoaderInitialized) {
    initializeConfigurationLoader(buildingConfigs);
    configurationLoaderInitialized = true;
  }
}

/**
 * Load building configurations from a JSON file
 * @param configPath Path to the configuration JSON file
 */
export async function loadBuildingConfigurationsFromJSON(
  configPath: string = '/assets/configs/buildings.json'
): Promise<void> {
  try {
    // Initialize if not already initialized
    if (!configurationLoaderInitialized) {
      initializeConfigurationSystem();
    }

    const loader = ConfigurationLoader.getInstance();
    await loader.loadConfigurationsFromJSON(configPath);
    console.log('Building configurations loaded successfully');
  } catch (error) {
    console.error('Failed to load building configurations:', error);
  }
}

/**
 * Generic building generator function that uses configuration to generate building geometry
 */
function generateGenericBuilding(
  random: RandomGenerator,
  config: BuildingConfig,
  buildingType: BuildingType
): BuildingMeshData {
  const [minW, maxW] = config.widthRange;
  const [minD, maxD] = config.depthRange;
  const [minH, maxH] = config.heightRange;

  const width = minW + random.generateFloatBetween(0, maxW - minW);
  const depth = minD + random.generateFloatBetween(0, maxD - minD);
  const height = minH + random.generateFloatBetween(0, maxH - minH);

  const geometry = new THREE.BoxGeometry(width, height, depth);
  return { geometry, materials: [config.material], type: buildingType };
}

/**
 * Interpolates between two building configurations based on the era progress
 * This enables smooth transitions between Roman and Cyberpunk eras
 */
export function interpolateConfig(
  romanConfig: BuildingConfig,
  cyberpunkConfig: BuildingConfig,
  progress: number // 0 = fully Roman, 1 = fully Cyberpunk
): BuildingConfig {
  // Clamp progress to 0-1 range
  const t = Math.max(0, Math.min(1, progress));

  // Linearly interpolate between Roman and Cyberpunk parameters
  const interpolatedConfig: BuildingConfig = {
    widthRange: [
      romanConfig.widthRange[0] * (1 - t) + cyberpunkConfig.widthRange[0] * t,
      romanConfig.widthRange[1] * (1 - t) + cyberpunkConfig.widthRange[1] * t,
    ],
    depthRange: [
      romanConfig.depthRange[0] * (1 - t) + cyberpunkConfig.depthRange[0] * t,
      romanConfig.depthRange[1] * (1 - t) + cyberpunkConfig.depthRange[1] * t,
    ],
    heightRange: [
      romanConfig.heightRange[0] * (1 - t) + cyberpunkConfig.heightRange[0] * t,
      romanConfig.heightRange[1] * (1 - t) + cyberpunkConfig.heightRange[1] * t,
    ],
    material: t < 0.5 ? romanConfig.material : cyberpunkConfig.material, // For material, we simply choose one or the other based on progress
  };

  return interpolatedConfig;
}

/**
 * Function to get building configuration for a specific era and type
 */
export function getBuildingConfig(
  type: BuildingType,
  era: Era,
  eraProgress: number = 0
): BuildingConfig {
  // Initialize configuration system if not already done
  if (!configurationLoaderInitialized) {
    initializeConfigurationSystem();
  }

  const loader = ConfigurationLoader.getInstance();

  // Get configurations from the loader
  const romanConfig = loader.getConfiguration(type, 'roman');
  const cyberpunkConfig = loader.getConfiguration(type, 'cyberpunk');

  // If we're in a transitional state (eraProgress > 0), interpolate between configurations
  if (eraProgress > 0) {
    return interpolateConfig(romanConfig, cyberpunkConfig, eraProgress);
  }

  // Otherwise, just return the config for the current era
  return era === 'roman' ? romanConfig : cyberpunkConfig;
}

/**
 * Creates materials used in Roman buildings with appropriate colors and textures
 */
function createRomanMaterials(config: BuildingConfig) {
  return {
    wallMaterial: config.material.clone(),
    floorMaterial: materialFactory.createRomanMaterial({
      color: 0xd9c9a8,
      roughness: 0.8,
      cacheKey: 'roman_floor',
    }),
    roofMaterial: materialFactory.createRomanMaterial({
      color: 0xa86f32,
      roughness: 0.7,
      cacheKey: 'roman_roof',
    }),
    columnMaterial: materialFactory.createRomanMaterial({
      color: 0xe8e0d0,
      roughness: 0.4,
      cacheKey: 'roman_column',
    }),
  };
}

/**
 * Calculate dimensions and position for a Roman atrium
 */
function setupAtrium(width: number, depth: number, height: number, random: RandomGenerator) {
  const atriumWidthRatio = random.generateFloatBetween(0.4, 0.6);
  const atriumDepthRatio = random.generateFloatBetween(0.3, 0.4);

  const atriumWidth = width * atriumWidthRatio;
  const atriumDepth = depth * atriumDepthRatio;
  const atriumHeight = height * 0.9; // Slightly lower than the main building

  // Position the atrium in the front portion of the domus
  const position = new THREE.Vector3(
    0,
    0,
    -depth / 4 // Front half of the building
  );

  return { atriumWidth, atriumDepth, atriumHeight, position };
}

/**
 * Calculate dimensions and position for a Roman peristyle garden
 */
function setupPeristyle(width: number, depth: number, height: number, random: RandomGenerator) {
  const peristyleWidthRatio = random.generateFloatBetween(0.5, 0.7);
  const peristyleDepthRatio = random.generateFloatBetween(0.4, 0.5);

  const peristyleWidth = width * peristyleWidthRatio;
  const peristyleDepth = depth * peristyleDepthRatio;
  const peristyleHeight = height * 0.85; // Lower than main building

  // Position the peristyle in the rear portion of the domus
  const position = new THREE.Vector3(
    0,
    0,
    depth / 4 // Rear half of the building
  );

  return { peristyleWidth, peristyleDepth, peristyleHeight, position };
}

/**
 * Generates a historically accurate Roman domus (house) with
 * atrium, peristyle, and appropriate rooms based on archaeological evidence.
 */
function generateRomanDomus(random: RandomGenerator, config: BuildingConfig): BuildingMeshData {
  const [minW, maxW] = config.widthRange;
  const [minD, maxD] = config.depthRange;
  const [minH, maxH] = config.heightRange;

  // Generate base dimensions
  const width = minW + random.generateFloatBetween(0, maxW - minW);
  const depth = minD + random.generateFloatBetween(0, maxD - minD);
  const height = minH + random.generateFloatBetween(0, maxH - minH);

  // Create materials for different building elements
  const { wallMaterial, floorMaterial, roofMaterial, columnMaterial } =
    createRomanMaterials(config);

  // Get wall and floor thickness from configuration if available
  const wallThickness = config.variations?.wallThickness ?? 0.2;
  const floorThickness = config.variations?.floorThickness ?? 0.2;

  // Create the base building structure
  const baseGeometry = createHollowBox(
    width,
    height,
    depth,
    wallThickness,
    floorThickness,
    false // no roof yet
  );

  // Set up atrium layout
  const {
    atriumWidth,
    atriumDepth,
    atriumHeight,
    position: atriumPosition,
  } = setupAtrium(width, depth, height, random);

  // Get column parameters from configuration if available
  const columnRadius = 0.15; // Default value
  const columnHeight = height * 0.8; // Default value

  // Get compluvium ratio from configuration if available
  const compluviumRatio = random.generateFloatBetween(0.15, 0.25);

  // Create the atrium
  const { geometry: atriumGeometry } = createRomanAtrium(
    atriumWidth,
    atriumHeight,
    atriumDepth,
    columnRadius,
    columnHeight,
    compluviumRatio
  );

  // Move the atrium to the correct position
  atriumGeometry.translate(atriumPosition.x, atriumPosition.y, atriumPosition.z);

  // Set up peristyle layout
  const {
    peristyleWidth,
    peristyleDepth,
    peristyleHeight,
    position: peristylePosition,
  } = setupPeristyle(width, depth, height, random);

  // Create the peristyle garden
  const { geometry: peristyleGeometry } = createRomanPeristyle(
    peristyleWidth,
    peristyleHeight,
    peristyleDepth,
    columnRadius,
    columnHeight * 0.94 // Slightly shorter columns in peristyle
  );

  // Move the peristyle to the correct position
  peristyleGeometry.translate(peristylePosition.x, peristylePosition.y, peristylePosition.z);

  // Get roof parameters from configuration if available
  const roofHeight =
    config.features?.roof?.height !== undefined
      ? height * config.features.roof.height
      : height * 0.3; // Default peak height

  const roofOverhang = config.features?.roof?.overhang ?? 0.4;

  // Create a roof for the domus
  const roofGeometry = createRomanRoof(width, depth, roofHeight, roofOverhang);

  // Position the roof at the top of the walls
  roofGeometry.translate(0, height / 2, 0);

  // Combine all geometries
  const geometries = [baseGeometry, atriumGeometry, peristyleGeometry, roofGeometry];

  // Create the final geometry by merging all parts
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Get detail level from configuration if available
  const detailLevel = config.performance?.detailLevel ?? 1.0;
  const lodLevels = Math.max(1, Math.round(3 * detailLevel));

  // Generate LOD versions of the building
  const lodGeometries = generateLODGeometries(mergedGeometry, random, lodLevels);

  // Store the LOD geometries in the userData for later retrieval
  mergedGeometry.userData = {
    ...mergedGeometry.userData,
    lodGeometries,
  };

  // Return the combined geometry and materials
  return {
    geometry: mergedGeometry,
    materials: [wallMaterial, floorMaterial, roofMaterial, columnMaterial],
    type: 'domus',
  };
}

/**
 * Helper function to merge multiple buffer geometries into one.
 *
 * NOTE: We're using a custom implementation instead of THREE.BufferGeometryUtils.mergeGeometries
 * for the following reasons:
 * 1. The THREE.BufferGeometryUtils import (three/examples/jsm/utils/BufferGeometryUtils.js) causes errors
 *    with Jest tests due to ESM module compatibility issues.
 * 2. This custom implementation ensures consistent behavior in both development and testing environments.
 * 3. It reduces external dependencies on the Three.js examples folder, which could change with different versions.
 *
 * See test file: src/tests/buffer-geometry-utils.test.ts for the error demonstration.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  // Create a new merged geometry
  const mergedGeometry = new THREE.BufferGeometry();

  // Track vertex counts to offset indices properly
  let vertexCount = 0;
  let indexCount = 0;

  // Determine which attributes to include in the merged geometry
  const attributes: Record<string, THREE.BufferAttribute[]> = {};

  // First pass: count attributes and allocate space
  geometries.forEach((geometry) => {
    for (const name in geometry.attributes) {
      if (!attributes[name]) {
        attributes[name] = [];
      }

      attributes[name].push(geometry.attributes[name] as THREE.BufferAttribute);
    }

    // Track indices if they exist
    if (geometry.index) {
      indexCount += geometry.index.count;
    } else {
      indexCount += geometry.attributes.position.count;
    }

    vertexCount += geometry.attributes.position.count;
  });

  // Create a single buffer for each attribute
  for (const name in attributes) {
    const mergedAttribute = mergeBufferAttributes(attributes[name], vertexCount);
    mergedGeometry.setAttribute(name, mergedAttribute);
  }

  // Merge indices
  let indexOffset = 0;
  const mergedIndices = new Uint32Array(indexCount);

  geometries.forEach((geometry) => {
    const positionCount = geometry.attributes.position.count;

    if (geometry.index) {
      // Copy and offset the indices
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i++) {
        mergedIndices[i + indexOffset] = indices[i] + vertexCount;
      }
      indexOffset += indices.length;
    } else {
      // Generate default indices
      for (let i = 0; i < positionCount; i++) {
        mergedIndices[i + indexOffset] = i + vertexCount;
      }
      indexOffset += positionCount;
    }

    vertexCount += positionCount;
  });

  mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

  return mergedGeometry;
}

/**
 * Helper function to merge array of buffer attributes
 */
function mergeBufferAttributes(
  attributes: THREE.BufferAttribute[],
  arrayLength: number
): THREE.BufferAttribute {
  const array = new Float32Array(arrayLength * attributes[0].itemSize);
  let offset = 0;

  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    array.set(attribute.array, offset);
    offset += attribute.array.length;
  }

  return new THREE.BufferAttribute(array, attributes[0].itemSize);
}

/**
 * Generate LOD (Level of Detail) versions of the building geometry
 * @param baseGeometry The high-detail building geometry
 * @param random Random generator instance
 * @param detailLevels Number of detail levels to generate (including the base)
 * @returns Array of geometries with decreasing detail levels
 */
function generateLODGeometries(
  baseGeometry: THREE.BufferGeometry,
  random: RandomGenerator,
  detailLevels: number = 3
): THREE.BufferGeometry[] {
  const lodGeometries: THREE.BufferGeometry[] = [baseGeometry];

  // For now, we'll use simplified boxes for lower detail levels
  // In a real implementation, this would use mesh simplification algorithms

  // Get the bounding box of the original geometry
  const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(baseGeometry));
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Generate lower detail levels
  for (let level = 1; level < detailLevels; level++) {
    // Each level gets progressively simpler
    // For this example, we'll just use boxes with decreasing vertex counts
    const detailFactor = 1 - level / detailLevels;

    // Create a simplified version
    const simplifiedGeometry = new THREE.BoxGeometry(
      size.x,
      size.y,
      size.z,
      Math.max(1, Math.floor(4 * detailFactor)),
      Math.max(1, Math.floor(4 * detailFactor)),
      Math.max(1, Math.floor(4 * detailFactor))
    );

    // Translate to match the original geometry's position
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    simplifiedGeometry.translate(center.x, center.y, center.z);

    // Add metadata to track this as an LOD geometry
    simplifiedGeometry.userData = {
      isLOD: true,
      lodLevel: level,
      lodDetailFactor: detailFactor,
    };

    lodGeometries.push(simplifiedGeometry);
  }

  return lodGeometries;
}

/**
 * Generates building geometry based on building type and era
 * This uses the configuration-driven approach for more flexibility
 */
export const generateBuildingGeometry = (params: BuildingParams): BuildingMeshData => {
  const { seed, type, era } = params;

  // Start the timer to measure generation performance
  const startTime = performance.now();

  const random = new RandomGenerator(seed);

  // Get the building configuration based on type and era
  const config = getBuildingConfig(type, era);

  // Generate based on building type
  let buildingData: BuildingMeshData;

  switch (type) {
    case 'domus':
      // Use specialized generation for Roman domus
      if (era === 'roman') {
        buildingData = generateRomanDomus(random, config);
      } else {
        // Fall back to generic building for non-Roman eras
        buildingData = generateGenericBuilding(random, config, type);
      }
      break;

    // Other building types use the generic generation for now
    default:
      buildingData = generateGenericBuilding(random, config, type);
      break;
  }

  // Measure generation time for performance tracking
  const generationTime = performance.now() - startTime;

  // Log performance if it's above the target
  if (generationTime > 5) {
    // 5ms performance target from issue requirements
    console.warn(
      `Building generation took ${generationTime.toFixed(2)}ms, exceeding the 5ms target.`
    );
  }

  // Add metadata about generation time to the geometry
  buildingData.geometry.userData = {
    ...buildingData.geometry.userData,
    generationTime,
    generationDate: new Date().toISOString(),
    seed,
    type,
    era,
  };

  return buildingData;
};
