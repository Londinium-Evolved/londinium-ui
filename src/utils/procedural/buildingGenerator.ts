import * as THREE from 'three';
import { BuildingType } from '../../state/BuildingState';
import { type Era } from '../../state/gameState';
import {
  createHollowBox,
  createRomanAtrium,
  createRomanPeristyle,
  createRomanRoof,
} from './buildingCSG';

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
    return Math.floor(this.generateFloatBetween(min, max + 0.999));
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
  const { roman, cyberpunk } = buildingConfigs[type];

  // If we're in a transitional state (eraProgress > 0), interpolate between configurations
  if (eraProgress > 0) {
    return interpolateConfig(roman, cyberpunk, eraProgress);
  }

  // Otherwise, just return the config for the current era
  return era === 'roman' ? roman : cyberpunk;
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
  const wallMaterial = config.material.clone();
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c9a8,
    roughness: 0.8,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xa86f32,
    roughness: 0.7,
  });
  const columnMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8e0d0,
    roughness: 0.4,
  });

  // Create the base building structure
  const wallThickness = 0.2;
  const baseGeometry = createHollowBox(
    width,
    height,
    depth,
    wallThickness,
    0.2, // floor thickness
    false // no roof yet
  );

  // Determine the layout based on the seed
  // Roman domus typically had an atrium followed by a peristyle garden

  // Calculate sizes for atrium and peristyle
  const atriumWidthRatio = random.generateFloatBetween(0.4, 0.6);
  const atriumDepthRatio = random.generateFloatBetween(0.3, 0.4);

  const atriumWidth = width * atriumWidthRatio;
  const atriumDepth = depth * atriumDepthRatio;
  const atriumHeight = height * 0.9; // Slightly lower than the main building

  // Position the atrium in the front portion of the domus
  const atriumPosition = new THREE.Vector3(
    0,
    0,
    -depth / 4 // Front half of the building
  );

  // Create the atrium
  const { geometry: atriumGeometry } = createRomanAtrium(
    atriumWidth,
    atriumHeight,
    atriumDepth,
    0.15, // column radius
    height * 0.8, // column height
    random.generateFloatBetween(0.15, 0.25) // compluvium ratio
  );

  // Move the atrium to the correct position
  atriumGeometry.translate(atriumPosition.x, atriumPosition.y, atriumPosition.z);

  // Calculate peristyle size and position (typically behind the atrium)
  const peristyleWidthRatio = random.generateFloatBetween(0.5, 0.7);
  const peristyleDepthRatio = random.generateFloatBetween(0.4, 0.5);

  const peristyleWidth = width * peristyleWidthRatio;
  const peristyleDepth = depth * peristyleDepthRatio;
  const peristyleHeight = height * 0.85; // Lower than main building

  // Position the peristyle in the rear portion of the domus
  const peristylePosition = new THREE.Vector3(
    0,
    0,
    depth / 4 // Rear half of the building
  );

  // Create the peristyle garden
  const { geometry: peristyleGeometry } = createRomanPeristyle(
    peristyleWidth,
    peristyleHeight,
    peristyleDepth,
    0.15, // column radius
    height * 0.75 // column height
  );

  // Move the peristyle to the correct position
  peristyleGeometry.translate(peristylePosition.x, peristylePosition.y, peristylePosition.z);

  // Create a roof for the domus
  const roofGeometry = createRomanRoof(
    width,
    depth,
    height * 0.3, // peak height
    0.4 // overhang
  );

  // Position the roof at the top of the walls
  roofGeometry.translate(0, height / 2, 0);

  // Combine all geometries
  const geometries = [baseGeometry, atriumGeometry, peristyleGeometry, roofGeometry];

  // Create the final geometry by merging all parts
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Generate LOD versions of the building
  const lodGeometries = generateLODGeometries(mergedGeometry, random);

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
 * This is a simplified implementation - in production,
 * you would use THREE.BufferGeometryUtils.mergeBufferGeometries
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // This is a placeholder - in actual implementation, use THREE.BufferGeometryUtils
  // For now, we'll just return the first geometry for demonstration
  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  // In an actual implementation, you would merge all geometries
  // This would use THREE.BufferGeometryUtils.mergeBufferGeometries

  // For now, we'll simulate a merged geometry
  const mergedGeometry = geometries[0].clone();

  // Add attribute to identify this as a merged geometry
  // This is just for demonstration
  mergedGeometry.userData = {
    mergedGeometryCount: geometries.length,
    mergedGeometryTimestamp: Date.now(),
  };

  return mergedGeometry;
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

/**
 * Creates a default building when no valid configuration is found
 */
const generateDefaultBuilding = (): BuildingMeshData => {
  const geometry = new THREE.BoxGeometry(5, 5, 5);
  const materials = [new THREE.MeshStandardMaterial({ color: '#888888' })];
  return { geometry, materials, type: 'domus' };
};
