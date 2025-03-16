import * as THREE from 'three';

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
  public createRomanMaterial(config: {
    color?: THREE.ColorRepresentation;
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    cacheKey?: string;
  }): THREE.MeshStandardMaterial {
    const cacheKey = config.cacheKey || this.generateCacheKey('roman', config);

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
  public createCyberpunkMaterial(config: {
    color?: THREE.ColorRepresentation;
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    cacheKey?: string;
  }): THREE.MeshStandardMaterial {
    const cacheKey = config.cacheKey || this.generateCacheKey('cyberpunk', config);

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
  public createBuildingMaterial(config: {
    buildingType: string;
    era: 'roman' | 'cyberpunk';
    color?: THREE.ColorRepresentation;
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
  }): THREE.MeshStandardMaterial {
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
  public createCustomMaterial(config: {
    color?: THREE.ColorRepresentation;
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    cacheKey?: string;
    [key: string]: THREE.ColorRepresentation | number | THREE.Texture | string | undefined;
  }): THREE.MeshStandardMaterial {
    const cacheKey = config.cacheKey || this.generateCacheKey('custom', config);

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
   * Generates a cache key based on material properties
   */
  private generateCacheKey(prefix: string, config: Record<string, unknown>): string {
    interface KeyObject {
      c?: string;
      r?: number;
      m?: number;
      e?: string;
      ei?: number;
      map?: string;
      nm?: string;
      // Additional properties for more complex materials
      ao?: string; // Ambient occlusion map
      bm?: string; // Bump map
      dm?: string; // Displacement map
      em?: string; // Emissive map
      env?: string; // Environment map
      rm?: string; // Roughness map
      mm?: string; // Metalness map
      alphaMap?: string; // Alpha map
      wireframe?: boolean; // Wireframe rendering
      flatShading?: boolean; // Flat shading
      transparent?: boolean; // Transparency
      opacity?: number; // Opacity level
      side?: number; // Material side (FrontSide, BackSide, DoubleSide)
      // Custom properties (will be stringified)
      custom?: string;
    }

    // Create a simplified object for key generation
    const keyObj: KeyObject = {};

    // Handle color
    const { color } = config;
    if (color !== undefined) {
      if (color instanceof THREE.Color) {
        keyObj.c = color.getHexString();
      } else {
        keyObj.c = String(color);
      }
    }

    // Handle numeric properties
    const { roughness } = config;
    if (typeof roughness === 'number') {
      keyObj.r = roughness;
    }

    const { metalness } = config;
    if (typeof metalness === 'number') {
      keyObj.m = metalness;
    }

    // Handle emissive color
    const { emissive } = config;
    if (emissive !== undefined) {
      if (emissive instanceof THREE.Color) {
        keyObj.e = emissive.getHexString();
      } else {
        keyObj.e = String(emissive);
      }
    }

    // Handle emissive intensity
    const { emissiveIntensity } = config;
    if (typeof emissiveIntensity === 'number') {
      keyObj.ei = emissiveIntensity;
    }

    // Handle textures
    const { map } = config;
    if (map instanceof THREE.Texture) {
      keyObj.map = map.uuid;
    }

    const { normalMap } = config;
    if (normalMap instanceof THREE.Texture) {
      keyObj.nm = normalMap.uuid;
    }

    // Additional texture maps
    const { aoMap } = config;
    if (aoMap instanceof THREE.Texture) {
      keyObj.ao = aoMap.uuid;
    }

    const { bumpMap } = config;
    if (bumpMap instanceof THREE.Texture) {
      keyObj.bm = bumpMap.uuid;
    }

    const { displacementMap } = config;
    if (displacementMap instanceof THREE.Texture) {
      keyObj.dm = displacementMap.uuid;
    }

    const { emissiveMap } = config;
    if (emissiveMap instanceof THREE.Texture) {
      keyObj.em = emissiveMap.uuid;
    }

    const { envMap } = config;
    if (envMap instanceof THREE.Texture) {
      keyObj.env = envMap.uuid;
    }

    const { roughnessMap } = config;
    if (roughnessMap instanceof THREE.Texture) {
      keyObj.rm = roughnessMap.uuid;
    }

    const { metalnessMap } = config;
    if (metalnessMap instanceof THREE.Texture) {
      keyObj.mm = metalnessMap.uuid;
    }

    const { alphaMap } = config;
    if (alphaMap instanceof THREE.Texture) {
      keyObj.alphaMap = alphaMap.uuid;
    }

    // Handle boolean properties
    const { wireframe } = config;
    if (typeof wireframe === 'boolean') {
      keyObj.wireframe = wireframe;
    }

    const { flatShading } = config;
    if (typeof flatShading === 'boolean') {
      keyObj.flatShading = flatShading;
    }

    const { transparent } = config;
    if (typeof transparent === 'boolean') {
      keyObj.transparent = transparent;
    }

    // Handle additional numeric properties
    const { opacity } = config;
    if (typeof opacity === 'number') {
      keyObj.opacity = opacity;
    }

    const { side } = config;
    if (typeof side === 'number') {
      keyObj.side = side;
    }

    // Handle custom properties that don't fit the standard pattern
    const customProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      // Skip properties we've already handled
      if (
        [
          'color',
          'roughness',
          'metalness',
          'emissive',
          'emissiveIntensity',
          'map',
          'normalMap',
          'aoMap',
          'bumpMap',
          'displacementMap',
          'emissiveMap',
          'envMap',
          'roughnessMap',
          'metalnessMap',
          'alphaMap',
          'wireframe',
          'flatShading',
          'transparent',
          'opacity',
          'side',
          'cacheKey',
        ].includes(key)
      ) {
        continue;
      }

      // Add non-standard properties to the custom object
      customProps[key] = value;
    }

    // If we have custom properties, stringify them and add to key object
    if (Object.keys(customProps).length > 0) {
      try {
        keyObj.custom = JSON.stringify(customProps);
      } catch (e) {
        console.warn('Could not stringify custom properties for cache key', e);
        // Generate a random value to ensure uniqueness
        keyObj.custom = `unstringifiable_${Math.random().toString(36).substring(2)}`;
      }
    }

    const keyString = JSON.stringify(keyObj);
    return `${prefix}_${keyString}`;
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
    properties: Record<
      string,
      THREE.ColorRepresentation | number | THREE.Texture | boolean | THREE.Vector2 | undefined
    >
  ): THREE.MeshStandardMaterial | null {
    // Check if material exists in cache
    if (!this.materialCache.has(cacheKey)) {
      console.warn(`Material with key ${cacheKey} not found in cache, cannot update.`);
      return null;
    }

    // Get the cached material
    const material = this.materialCache.get(cacheKey)!;

    // Update each property
    for (const [key, value] of Object.entries(properties)) {
      // Handle special cases for color and vector properties
      if (key === 'color' && value !== undefined) {
        if (material.color) {
          if (value instanceof THREE.Color) {
            material.color.copy(value);
          } else {
            // Cast to ColorRepresentation to satisfy TypeScript
            material.color.set(value as THREE.ColorRepresentation);
          }
        }
      } else if (key === 'emissive' && value !== undefined) {
        if (material.emissive) {
          if (value instanceof THREE.Color) {
            material.emissive.copy(value);
          } else {
            // Cast to ColorRepresentation to satisfy TypeScript
            material.emissive.set(value as THREE.ColorRepresentation);
          }
        }
      } else if (key === 'normalScale' && value instanceof THREE.Vector2) {
        material.normalScale.copy(value);
      } else if (key in material) {
        // For standard properties, just assign the value
        // Cast to unknown first to safely convert between types
        (material as unknown as Record<string, unknown>)[key] = value;
      }
    }

    // Mark material for update
    material.needsUpdate = true;

    return material;
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
