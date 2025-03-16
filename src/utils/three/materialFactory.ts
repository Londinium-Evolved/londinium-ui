import * as THREE from 'three';
import {
  BaseMaterialConfig,
  BuildingMaterialConfig,
  CustomMaterialConfig,
  MaterialUpdateConfig,
} from './materials/types';
import {
  RomanMaterialCreator,
  CyberpunkMaterialCreator,
  BuildingMaterialCreator,
  CustomMaterialCreator,
} from './materials/creators';
import { MaterialUpdateSystem } from './materials/MaterialUpdateSystem';

/**
 * Converts a color value to a hex string representation for consistent cache key generation
 *
 * @param color Any color representation (string, number, THREE.Color, or object with r,g,b properties)
 * @returns A consistent hex string representation of the color
 */
export function convertColorToHex(
  color: THREE.ColorRepresentation | Record<string, number> | unknown
): string {
  // If already a string, return as is (assuming it's already in a consistent format)
  if (typeof color === 'string') {
    return color;
  }

  // If it's a THREE.Color object or has r,g,b properties
  if (
    color &&
    typeof color === 'object' &&
    'r' in color &&
    typeof color.r === 'number' &&
    'g' in color &&
    typeof color.g === 'number' &&
    'b' in color &&
    typeof color.b === 'number'
  ) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return '#' + [r, g, b].map((val) => val.toString(16).padStart(2, '0')).join('');
  }

  // If it's a number (like 0xFF0000)
  if (typeof color === 'number') {
    return '#' + color.toString(16).padStart(6, '0');
  }

  // Fallback for any other type
  return String(color);
}

/**
 * MaterialFactory - Enhanced Singleton Factory for THREE.js Materials
 *
 * This implementation follows the Singleton Factory pattern for creating and managing THREE.MeshStandardMaterial instances.
 * It provides centralized material creation to ensure consistency, optimize memory usage, and simplify material management.
 *
 * Key Features:
 * - Singleton pattern ensures a single source of truth for material creation
 * - Material caching with smart key generation prevents duplicate materials
 * - Era-specific material creation methods (Roman, Cyberpunk) with appropriate defaults
 * - Support for building-specific materials with type and era parameters
 * - Memory management through material disposal methods
 * - Material updates without creating new instances (updateCachedMaterial)
 * - Enhanced cache key generation that handles complex material properties
 *
 * Cache Key Generation:
 * - Automatically generates optimized keys based on material properties
 * - Handles basic properties (color, roughness, metalness)
 * - Supports texture references via UUID
 * - Includes vector properties where applicable
 * - Handles custom/non-standard properties
 *
 * Performance Benefits:
 * - Reduces memory usage by eliminating duplicate materials
 * - Allows efficient updates to materials without creating new instances
 * - Centralized creation ensures consistent material properties
 *
 * Usage Examples:
 * - Create a Roman era material: materialFactory.createRomanMaterial({color: 0x8b7355})
 * - Create a Cyberpunk material: materialFactory.createCyberpunkMaterial({emissive: 0x00ffff})
 * - Create a building material: materialFactory.createBuildingMaterial({buildingType: 'domus', era: 'roman'})
 * - Update a cached material: materialFactory.updateCachedMaterial('cacheKey', {roughness: 0.5})
 */
export class MaterialFactory {
  private static instance: MaterialFactory;

  // Cached materials to promote reuse and better memory management
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of MaterialFactory
   */
  public static getInstance(): MaterialFactory {
    if (!MaterialFactory.instance) {
      MaterialFactory.instance = new MaterialFactory();
    }
    return MaterialFactory.instance;
  }

  /**
   * Creates a standard material for the Roman era
   */
  public createRomanMaterial(config: BaseMaterialConfig): THREE.MeshStandardMaterial {
    return RomanMaterialCreator.createMaterial(config, this.materialCache);
  }

  /**
   * Creates a standard material for the Cyberpunk era
   */
  public createCyberpunkMaterial(config: BaseMaterialConfig): THREE.MeshStandardMaterial {
    return CyberpunkMaterialCreator.createMaterial(config, this.materialCache);
  }

  /**
   * Creates a building material based on building type and era
   */
  public createBuildingMaterial(config: BuildingMaterialConfig): THREE.MeshStandardMaterial {
    return BuildingMaterialCreator.createMaterial(config, this.materialCache);
  }

  /**
   * Creates a custom standard material with specified properties
   */
  public createCustomMaterial(config: CustomMaterialConfig): THREE.MeshStandardMaterial {
    return CustomMaterialCreator.createMaterial(config, this.materialCache);
  }

  /**
   * Clones a material and adds it to the cache with a new key
   */
  public cloneMaterial(
    sourceMaterial: THREE.MeshStandardMaterial,
    newCacheKey: string
  ): THREE.MeshStandardMaterial {
    if (this.materialCache.has(newCacheKey)) {
      return this.materialCache.get(newCacheKey)!;
    }

    const clonedMaterial = sourceMaterial.clone();
    this.materialCache.set(newCacheKey, clonedMaterial);
    return clonedMaterial;
  }

  /**
   * Disposes of all cached materials to free memory
   */
  public disposeCachedMaterials(): void {
    this.materialCache.forEach((material) => {
      material.dispose();
    });
    this.materialCache.clear();
  }

  /**
   * Disposes a specific cached material by key
   */
  public disposeMaterial(cacheKey: string): void {
    if (this.materialCache.has(cacheKey)) {
      const material = this.materialCache.get(cacheKey)!;
      material.dispose();
      this.materialCache.delete(cacheKey);
    }
  }

  /**
   * Updates an existing material in the cache with new properties
   * This is useful for dynamically changing material properties without creating new instances
   *
   * @param cacheKey The cache key of the material to update
   * @param properties New properties to apply to the material
   * @returns The updated material, or null if not found in cache
   */
  public updateCachedMaterial(
    cacheKey: string,
    properties: MaterialUpdateConfig
  ): THREE.MeshStandardMaterial | null {
    // Check if material exists in cache
    if (!this.materialCache.has(cacheKey)) {
      console.warn(`Material with key ${cacheKey} not found in cache, cannot update.`);
      return null;
    }

    // Get the cached material
    const material = this.materialCache.get(cacheKey)!;

    // Update the material using MaterialUpdateSystem
    return MaterialUpdateSystem.updateMaterialProperties(material, properties);
  }

  /**
   * Batch updates multiple cached materials with the same properties
   * Useful for efficiently updating groups of related materials
   *
   * @param cacheKeys Array of cache keys for materials to update
   * @param properties New properties to apply to all materials
   * @returns Array of updated materials (null entries for materials not found)
   */
  public batchUpdateMaterials(
    cacheKeys: string[],
    properties: MaterialUpdateConfig
  ): (THREE.MeshStandardMaterial | null)[] {
    return cacheKeys.map((key) => this.updateCachedMaterial(key, properties));
  }

  /**
   * Updates all materials on a mesh or mesh hierarchy
   *
   * @param root The root object to traverse for materials
   * @param properties New properties to apply
   * @param filter Optional filter function to select which materials to update
   */
  public updateMeshMaterials(
    root: THREE.Object3D,
    properties: MaterialUpdateConfig,
    filter?: (material: THREE.Material) => boolean
  ): void {
    MaterialUpdateSystem.updateMeshMaterials(root, properties, filter);
  }

  /**
   * Interpolates a material between two states
   * Useful for transitions between visual states
   *
   * @param material The material to update
   * @param startProps Starting material properties
   * @param endProps Target material properties
   * @param progress Interpolation factor (0-1)
   * @returns The updated material
   */
  public interpolateMaterial(
    material: THREE.MeshStandardMaterial,
    startProps: MaterialUpdateConfig,
    endProps: MaterialUpdateConfig,
    progress: number
  ): THREE.MeshStandardMaterial {
    return MaterialUpdateSystem.interpolateMaterial(material, startProps, endProps, progress);
  }

  /**
   * Gets a material from the cache by key, if it exists
   *
   * @param cacheKey The cache key to look up
   * @returns The cached material or null if not found
   */
  public getCachedMaterial(cacheKey: string): THREE.MeshStandardMaterial | null {
    return this.materialCache.has(cacheKey) ? this.materialCache.get(cacheKey)! : null;
  }
}

// Export a singleton instance for easy use
export const materialFactory = MaterialFactory.getInstance();

// Re-export types for convenience
export type {
  BaseMaterialConfig,
  BuildingMaterialConfig,
  CustomMaterialConfig,
  MaterialUpdateConfig,
} from './materials/types';

// Export the utility functions and systems for direct use
export { MaterialUpdateSystem } from './materials/MaterialUpdateSystem';
