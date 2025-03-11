import * as THREE from 'three';
import { BuildingType } from '../../state/BuildingState';
import { type Era } from '../../state/gameState';

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
 * Generates building geometry based on building type and era
 * This uses the configuration-driven approach for more flexibility
 */
export const generateBuildingGeometry = (params: BuildingParams): BuildingMeshData => {
  const { type, era, seed } = params;
  const random = new RandomGenerator(seed);

  // Get the configuration for this building type and era
  // In a real application, we would pass eraProgress from gameState here
  const config = getBuildingConfig(type, era);

  // Check if the configuration has valid dimensions (non-zero)
  if (config.widthRange[1] <= 0 || config.depthRange[1] <= 0 || config.heightRange[1] <= 0) {
    return generateDefaultBuilding();
  }

  // Generate the building using the configuration
  return generateGenericBuilding(random, config, type);
};

/**
 * Creates a default building when no valid configuration is found
 */
const generateDefaultBuilding = (): BuildingMeshData => {
  const geometry = new THREE.BoxGeometry(5, 5, 5);
  const materials = [new THREE.MeshStandardMaterial({ color: '#888888' })];
  return { geometry, materials, type: 'domus' };
};
