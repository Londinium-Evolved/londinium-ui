import * as THREE from 'three';
import { BaseMaterialConfig } from '../types';
import { validateMaterialConfig } from '../validators';
import { generateAutomaticCacheKey } from '../automaticCacheKeyGenerator';

/**
 * Specialized creator for Roman era materials
 * Extracted from MaterialFactory to improve modularity
 */
export class RomanMaterialCreator {
  /**
   * Creates a standard material for the Roman era with appropriate defaults
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
    const cacheKey = config.cacheKey || generateAutomaticCacheKey('roman', config);
    
    // Return cached material if exists
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!;
    }

    // Create new material with Roman-era appropriate defaults
    const material = new THREE.MeshStandardMaterial({
      // Default terracotta/stone color if not specified
      color: config.color || 0x8b7355,
      
      // Roman materials are rough and not very metallic
      roughness: config.roughness !== undefined ? config.roughness : 0.8,
      metalness: config.metalness !== undefined ? config.metalness : 0.1,
      
      // Copy other properties from config
      map: config.map,
      normalMap: config.normalMap,
      flatShading: config.flatShading,
    });

    // Set emissive properties if provided
    if (config.emissive) {
      material.emissive = new THREE.Color(config.emissive);
      material.emissiveIntensity = config.emissiveIntensity || 0;
    }

    // Cache the material
    if (cacheKey) {
      materialCache.set(cacheKey, material);
    }

    return material;
  }
}