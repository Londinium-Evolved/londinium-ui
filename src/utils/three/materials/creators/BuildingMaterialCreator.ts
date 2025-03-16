import * as THREE from 'three';
import { BuildingMaterialConfig } from '../types';
import { validateMaterialConfig } from '../validators';
import { RomanMaterialCreator } from './RomanMaterialCreator';
import { CyberpunkMaterialCreator } from './CyberpunkMaterialCreator';

/**
 * Specialized creator for building-specific materials
 * Extracted from MaterialFactory to improve modularity
 */
export class BuildingMaterialCreator {
  /**
   * Creates a material appropriate for a specific building type and era
   * 
   * @param config Building material configuration
   * @param materialCache Reference to the material cache for reuse
   * @returns The created or cached material
   */
  public static createMaterial(
    config: BuildingMaterialConfig,
    materialCache: Map<string, THREE.MeshStandardMaterial>
  ): THREE.MeshStandardMaterial {
    // Validate required fields
    if (!config.buildingType) {
      throw new Error('buildingType is required for building materials');
    }

    if (!config.era || (config.era !== 'roman' && config.era !== 'cyberpunk')) {
      throw new Error('era must be either "roman" or "cyberpunk"');
    }

    // Validate other inputs
    validateMaterialConfig(config);

    // Create a deterministic cache key
    const cacheKey = `building_${config.buildingType}_${config.era}`;

    // Return cached material if it exists
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!.clone();
    }

    // Create era-specific material with building properties
    return config.era === 'roman'
      ? RomanMaterialCreator.createMaterial({ ...config, cacheKey }, materialCache)
      : CyberpunkMaterialCreator.createMaterial({ ...config, cacheKey }, materialCache);
  }
}