import * as THREE from 'three';
import {
  BaseMaterialConfig,
  BuildingMaterialConfig,
  CustomMaterialConfig,
  MaterialUpdateConfig,
} from './materials/types';
import { validateColor, validateNumericRange, validateTexture } from './materials/validators';
import { generateCacheKey } from './materials/cacheKeyGenerator';
import { updateMaterial } from './materials/materialUpdater';

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
    // Validate inputs
    this.validateMaterialConfig(config);

    const cacheKey =
      config.cacheKey ||
      generateCacheKey('roman', {
        ...config,
        [Symbol.iterator](): Iterator<[string, unknown]> {
          return Object.entries(this)[Symbol.iterator]();
        },
      });

    // Return cached material if it exists
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: config.color || 0x8b7355, // Default terracotta/stone color
      roughness: config.roughness !== undefined ? config.roughness : 0.8,
      metalness: config.metalness !== undefined ? config.metalness : 0.1,
      map: config.map,
      normalMap: config.normalMap,
      flatShading: config.flatShading,
    });

    if (config.emissive) {
      material.emissive = new THREE.Color(config.emissive);
      material.emissiveIntensity = config.emissiveIntensity || 0;
    }

    // Cache the material
    if (cacheKey) {
      this.materialCache.set(cacheKey, material);
    }

    return material;
  }

  /**
   * Creates a standard material for the Cyberpunk era
   */
  public createCyberpunkMaterial(config: BaseMaterialConfig): THREE.MeshStandardMaterial {
    // Validate inputs
    this.validateMaterialConfig(config);

    const cacheKey =
      config.cacheKey ||
      generateCacheKey('cyberpunk', {
        ...config,
        [Symbol.iterator](): Iterator<[string, unknown]> {
          return Object.entries(this)[Symbol.iterator]();
        },
      });

    // Return cached material if it exists
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: config.color || 0x2c3e50, // Default dark blue-gray
      roughness: config.roughness !== undefined ? config.roughness : 0.2,
      metalness: config.metalness !== undefined ? config.metalness : 0.8,
      map: config.map,
      normalMap: config.normalMap,
      flatShading: config.flatShading,
    });

    if (config.emissive) {
      material.emissive = new THREE.Color(config.emissive || 0x00ffff); // Default cyan glow
      material.emissiveIntensity =
        config.emissiveIntensity !== undefined ? config.emissiveIntensity : 0.5;
    }

    // Cache the material
    if (cacheKey) {
      this.materialCache.set(cacheKey, material);
    }

    return material;
  }

  /**
   * Creates a building material based on building type and era
   */
  public createBuildingMaterial(config: BuildingMaterialConfig): THREE.MeshStandardMaterial {
    // Validate required fields
    if (!config.buildingType) {
      throw new Error('buildingType is required for building materials');
    }

    if (!config.era || (config.era !== 'roman' && config.era !== 'cyberpunk')) {
      throw new Error('era must be either "roman" or "cyberpunk"');
    }

    // Validate other inputs
    this.validateMaterialConfig(config);

    const cacheKey = `building_${config.buildingType}_${config.era}`;

    // Return cached material if it exists
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!.clone();
    }

    // Create era-specific material
    return config.era === 'roman'
      ? this.createRomanMaterial({ ...config, cacheKey })
      : this.createCyberpunkMaterial({ ...config, cacheKey });
  }

  /**
   * Creates a custom standard material with specified properties
   */
  public createCustomMaterial(config: CustomMaterialConfig): THREE.MeshStandardMaterial {
    // Validate standard inputs
    this.validateMaterialConfig(config);

    const cacheKey =
      config.cacheKey ||
      generateCacheKey('custom', {
        ...config,
        [Symbol.iterator](): Iterator<[string, unknown]> {
          return Object.entries(this)[Symbol.iterator]();
        },
      });

    // Return cached material if it exists
    if (cacheKey && this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    // Extract THREE.MeshStandardMaterial properties
    const materialProps: Record<
      string,
      THREE.ColorRepresentation | number | THREE.Texture | undefined
    > = {};
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'cacheKey') {
        materialProps[key] = value;
      }
    }

    const material = new THREE.MeshStandardMaterial(
      materialProps as THREE.MeshStandardMaterialParameters
    );

    // Cache the material if a key is provided
    if (cacheKey) {
      this.materialCache.set(cacheKey, material);
    }

    return material;
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

    // Update the material using our new updateMaterial function
    return updateMaterial(material, properties);
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

  /**
   * Validates the common material configuration properties
   */
  private validateMaterialConfig(config: BaseMaterialConfig): void {
    validateColor(config.color, 'color');
    validateColor(config.emissive, 'emissive');
    validateNumericRange(config.roughness, 'roughness');
    validateNumericRange(config.metalness, 'metalness');
    validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10);
    validateTexture(config.map, 'map');
    validateTexture(config.normalMap, 'normalMap');
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
