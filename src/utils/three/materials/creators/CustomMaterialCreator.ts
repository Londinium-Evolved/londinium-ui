import * as THREE from 'three';
import { CustomMaterialConfig } from '../types';
import { validateMaterialConfig } from '../validators';
import { generateAutomaticCacheKey } from '../automaticCacheKeyGenerator';

/**
 * Specialized creator for custom materials with arbitrary properties
 * Extracted from MaterialFactory to improve modularity
 */
export class CustomMaterialCreator {
  /**
   * Creates a custom material with user-specified properties
   * 
   * @param config Custom material configuration
   * @param materialCache Reference to the material cache for reuse
   * @returns The created or cached material
   */
  public static createMaterial(
    config: CustomMaterialConfig,
    materialCache: Map<string, THREE.MeshStandardMaterial>
  ): THREE.MeshStandardMaterial {
    // Validate standard properties
    validateMaterialConfig(config);

    // Generate cache key
    const cacheKey = config.cacheKey || generateAutomaticCacheKey('custom', config);
    
    // Return cached material if exists
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!;
    }

    // Extract THREE.MeshStandardMaterial properties
    const materialProps: Record<
      string,
      THREE.ColorRepresentation | number | THREE.Texture | boolean | undefined
    > = {};
    
    // Copy all properties except cacheKey
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'cacheKey') {
        materialProps[key] = value;
      }
    }

    // Create the material
    const material = new THREE.MeshStandardMaterial(
      materialProps as THREE.MeshStandardMaterialParameters
    );

    // Cache the material
    if (cacheKey) {
      materialCache.set(cacheKey, material);
    }

    return material;
  }
}