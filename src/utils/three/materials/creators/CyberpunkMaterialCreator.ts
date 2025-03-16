import * as THREE from 'three';
import { BaseMaterialConfig } from '../types';
import { validateMaterialConfig } from '../validators';
import { generateAutomaticCacheKey } from '../automaticCacheKeyGenerator';

/**
 * Specialized creator for Cyberpunk era materials
 * Extracted from MaterialFactory to improve modularity
 */
export class CyberpunkMaterialCreator {
  /**
   * Creates a standard material for the Cyberpunk era with appropriate defaults
   * 
   * @param config Material configuration options
   * @param materialCache Reference to the material cache for reuse
   * @returns The created or cached material
   */
  public static createMaterial(
    config: BaseMaterialConfig,
    materialCache: Map<string, THREE.MeshStandardMaterial>
  ): THREE.MeshStandardMaterial {
    // Validate material properties
    validateMaterialConfig(config);

    // Generate a cache key
    const cacheKey = config.cacheKey || generateAutomaticCacheKey('cyberpunk', config);
    
    // Return cached material if exists
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!;
    }

    // Create new material with Cyberpunk-era appropriate defaults
    const material = new THREE.MeshStandardMaterial({
      // Default dark blue-gray color if not specified
      color: config.color || 0x2c3e50,
      
      // Cyberpunk materials are smooth and metallic
      roughness: config.roughness ?? 0.2, 
      metalness: config.metalness ?? 0.8,
      
      // Copy emissive properties with defaults
      emissive: typeof config.emissive !== 'undefined' ? config.emissive : 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 1.0,
      
      // Copy other properties from config
      map: config.map,
      normalMap: config.normalMap,
      flatShading: config.flatShading,
    });

    // Set emissive properties if provided with cyberpunk defaults
    if (config.emissive) {
      material.emissive = new THREE.Color(config.emissive || 0x00ffff); // Default cyan glow
      material.emissiveIntensity = 
        config.emissiveIntensity !== undefined ? config.emissiveIntensity : 0.5;
    }

    // Cache the material
    if (cacheKey) {
      materialCache.set(cacheKey, material);
    }

    return material;
  }
}