import * as THREE from 'three';

/**
 * Factory class for creating and managing THREE.MeshStandardMaterial instances.
 * Provides a centralized location for material creation to ensure consistency
 * and easier maintenance across the application.
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
    }

    // Create a simplified object for key generation
    const keyObj: KeyObject = {};

    // Handle color
    const {color} = config;
    if (color !== undefined) {
      if (color instanceof THREE.Color) {
        keyObj.c = color.getHexString();
      } else {
        keyObj.c = String(color);
      }
    }

    // Handle numeric properties
    const {roughness} = config;
    if (typeof roughness === 'number') {
      keyObj.r = roughness;
    }

    const {metalness} = config;
    if (typeof metalness === 'number') {
      keyObj.m = metalness;
    }

    // Handle emissive color
    const {emissive} = config;
    if (emissive !== undefined) {
      if (emissive instanceof THREE.Color) {
        keyObj.e = emissive.getHexString();
      } else {
        keyObj.e = String(emissive);
      }
    }

    // Handle emissive intensity
    const {emissiveIntensity} = config;
    if (typeof emissiveIntensity === 'number') {
      keyObj.ei = emissiveIntensity;
    }

    // Handle textures
    const {map} = config;
    if (map instanceof THREE.Texture) {
      keyObj.map = map.uuid;
    }

    const normalMap = config.normalMap;
    if (normalMap instanceof THREE.Texture) {
      keyObj.nm = normalMap.uuid;
    }

    const keyString = JSON.stringify(keyObj);
    return `${prefix}_${keyString}`;
  }
}

// Export a singleton instance for easy use
export const materialFactory = MaterialFactory.getInstance();
