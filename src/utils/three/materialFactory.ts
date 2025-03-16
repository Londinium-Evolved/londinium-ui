import * as THREE from 'three';

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
   * Validates a color value to ensure it's in an acceptable format
   * @param color The color to validate
   * @param paramName The name of the parameter being validated (for error messages)
   * @throws Error if the color format is invalid
   */
  private validateColor(color: unknown, paramName: string): void {
    // If undefined, allow it (defaults will be used)
    if (color === undefined) {
      return;
    }

    // String colors (must be valid CSS color names or hex format)
    if (typeof color === 'string') {
      // Simple validation for hex colors (#RGB or #RRGGBB)
      if (color.startsWith('#')) {
        const validHexPattern = /^#([0-9A-F]{3}){1,2}$/i;
        if (!validHexPattern.test(color)) {
          throw new Error(`Invalid hex color format for ${paramName}: ${color}`);
        }
      }
      // Allow other string formats (CSS colors will be validated by THREE.Color)
      return;
    }

    // Number colors (must be positive)
    if (typeof color === 'number') {
      if (color < 0) {
        throw new Error(`Invalid negative color value for ${paramName}: ${color}`);
      }
      return;
    }

    // THREE.Color objects or objects with r,g,b properties
    if (color && typeof color === 'object') {
      if (color instanceof THREE.Color) {
        return;
      }

      if (
        'r' in color &&
        typeof color.r === 'number' &&
        'g' in color &&
        typeof color.g === 'number' &&
        'b' in color &&
        typeof color.b === 'number'
      ) {
        // Validate r, g, b values (should be between 0 and 1)
        const { r, g, b } = color as { r: number; g: number; b: number };
        if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
          throw new Error(
            `Invalid RGB values for ${paramName}: r=${r}, g=${g}, b=${b} (must be between 0 and 1)`
          );
        }
        return;
      }
    }

    // If we get here, the color format is not recognized
    throw new Error(`Unsupported color format for ${paramName}: ${String(color)}`);
  }

  /**
   * Validates a numeric value to ensure it's within an acceptable range
   * @param value The value to validate
   * @param paramName The name of the parameter being validated (for error messages)
   * @param min Minimum allowed value (defaults to 0)
   * @param max Maximum allowed value (defaults to 1)
   * @throws Error if the value is outside the acceptable range
   */
  private validateNumericRange(
    value: unknown,
    paramName: string,
    min: number = 0,
    max: number = 1
  ): void {
    // If undefined, allow it (defaults will be used)
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'number') {
      throw new Error(`Invalid type for ${paramName}: expected number, got ${typeof value}`);
    }

    if (value < min || value > max) {
      throw new Error(
        `Invalid value for ${paramName}: ${value} (must be between ${min} and ${max})`
      );
    }
  }

  /**
   * Validates a texture to ensure it's a valid THREE.Texture
   * @param texture The texture to validate
   * @param paramName The name of the parameter being validated (for error messages)
   * @throws Error if the texture is invalid
   */
  private validateTexture(texture: unknown, paramName: string): void {
    // If undefined, allow it (no texture will be used)
    if (texture === undefined) {
      return;
    }

    if (!(texture instanceof THREE.Texture)) {
      throw new Error(
        `Invalid type for ${paramName}: expected THREE.Texture, got ${typeof texture}`
      );
    }

    // Check if texture has an image defined (might not be loaded yet)
    if (!texture.image && texture.uuid === '') {
      throw new Error(`Invalid texture for ${paramName}: texture has no image or UUID`);
    }
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
    flatShading?: boolean;
    cacheKey?: string;
  }): THREE.MeshStandardMaterial {
    // Validate inputs
    this.validateColor(config.color, 'color');
    this.validateColor(config.emissive, 'emissive');
    this.validateNumericRange(config.roughness, 'roughness');
    this.validateNumericRange(config.metalness, 'metalness');
    this.validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10); // Allow higher values for emissive intensity
    this.validateTexture(config.map, 'map');
    this.validateTexture(config.normalMap, 'normalMap');

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
  public createCyberpunkMaterial(config: {
    color?: THREE.ColorRepresentation;
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    flatShading?: boolean;
    cacheKey?: string;
  }): THREE.MeshStandardMaterial {
    // Validate inputs
    this.validateColor(config.color, 'color');
    this.validateColor(config.emissive, 'emissive');
    this.validateNumericRange(config.roughness, 'roughness');
    this.validateNumericRange(config.metalness, 'metalness');
    this.validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10); // Allow higher values for emissive intensity
    this.validateTexture(config.map, 'map');
    this.validateTexture(config.normalMap, 'normalMap');

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
    flatShading?: boolean;
  }): THREE.MeshStandardMaterial {
    // Validate required fields
    if (!config.buildingType) {
      throw new Error('buildingType is required for building materials');
    }

    if (!config.era || (config.era !== 'roman' && config.era !== 'cyberpunk')) {
      throw new Error('era must be either "roman" or "cyberpunk"');
    }

    // Validate other inputs
    this.validateColor(config.color, 'color');
    this.validateColor(config.emissive, 'emissive');
    this.validateNumericRange(config.roughness, 'roughness');
    this.validateNumericRange(config.metalness, 'metalness');
    this.validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10);
    this.validateTexture(config.map, 'map');
    this.validateTexture(config.normalMap, 'normalMap');

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
    // Validate standard inputs
    this.validateColor(config.color, 'color');
    this.validateColor(config.emissive, 'emissive');
    this.validateNumericRange(config.roughness, 'roughness');
    this.validateNumericRange(config.metalness, 'metalness');
    this.validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10);
    this.validateTexture(config.map, 'map');
    this.validateTexture(config.normalMap, 'normalMap');

    // Additional validation for known texture types
    if (config.aoMap) this.validateTexture(config.aoMap, 'aoMap');
    if (config.bumpMap) this.validateTexture(config.bumpMap, 'bumpMap');
    if (config.displacementMap) this.validateTexture(config.displacementMap, 'displacementMap');
    if (config.emissiveMap) this.validateTexture(config.emissiveMap, 'emissiveMap');
    if (config.envMap) this.validateTexture(config.envMap, 'envMap');
    if (config.metalnessMap) this.validateTexture(config.metalnessMap, 'metalnessMap');
    if (config.roughnessMap) this.validateTexture(config.roughnessMap, 'roughnessMap');
    if (config.alphaMap) this.validateTexture(config.alphaMap, 'alphaMap');

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
    // Define known property configurations for proper handling
    interface PropertyConfig {
      key: string; // The property name in the config
      shortKey?: string; // Optional shortened key name for the cache key object
      type: 'color' | 'number' | 'texture' | 'boolean' | 'vector' | 'other';
      defaultProcess?: (value: unknown) => unknown; // Optional custom processor function
    }

    // Define property configurations for standard material properties
    const propertyConfigs: PropertyConfig[] = [
      // Colors
      { key: 'color', shortKey: 'c', type: 'color' },
      { key: 'emissive', shortKey: 'e', type: 'color' },

      // Numbers
      { key: 'roughness', shortKey: 'r', type: 'number' },
      { key: 'metalness', shortKey: 'm', type: 'number' },
      { key: 'emissiveIntensity', shortKey: 'ei', type: 'number' },
      { key: 'opacity', type: 'number' },
      { key: 'side', type: 'number' },

      // Textures
      { key: 'map', type: 'texture' },
      { key: 'normalMap', shortKey: 'nm', type: 'texture' },
      { key: 'aoMap', shortKey: 'ao', type: 'texture' },
      { key: 'bumpMap', shortKey: 'bm', type: 'texture' },
      { key: 'displacementMap', shortKey: 'dm', type: 'texture' },
      { key: 'emissiveMap', shortKey: 'em', type: 'texture' },
      { key: 'envMap', shortKey: 'env', type: 'texture' },
      { key: 'roughnessMap', shortKey: 'rm', type: 'texture' },
      { key: 'metalnessMap', shortKey: 'mm', type: 'texture' },
      { key: 'alphaMap', type: 'texture' },

      // Booleans
      { key: 'wireframe', type: 'boolean' },
      { key: 'flatShading', type: 'boolean' },
      { key: 'transparent', type: 'boolean' },
    ];

    // Create cache key object
    const keyObj: Record<string, unknown> = {};

    // Process each configured property
    propertyConfigs.forEach((propConfig) => {
      const value = config[propConfig.key];

      // Skip undefined values
      if (value === undefined) return;

      // Determine the key to use in the output object
      const outputKey = propConfig.shortKey || propConfig.key;

      // Process based on property type
      switch (propConfig.type) {
        case 'color':
          keyObj[outputKey] = convertColorToHex(value);
          break;

        case 'number':
          if (typeof value === 'number') {
            keyObj[outputKey] = value;
          }
          break;

        case 'texture':
          if (value instanceof THREE.Texture) {
            keyObj[outputKey] = value.uuid;
          }
          break;

        case 'boolean':
          if (typeof value === 'boolean') {
            keyObj[outputKey] = value;
          }
          break;

        case 'vector':
          // Handle vector types if needed
          if (propConfig.defaultProcess) {
            keyObj[outputKey] = propConfig.defaultProcess(value);
          }
          break;

        case 'other':
          // Use custom processor if defined
          if (propConfig.defaultProcess) {
            keyObj[outputKey] = propConfig.defaultProcess(value);
          } else {
            keyObj[outputKey] = value;
          }
          break;
      }
    });

    // Handle custom properties that don't fit the standard pattern
    const customProps: Record<string, unknown> = {};
    const processedKeys = new Set(propertyConfigs.map((c) => c.key).concat(['cacheKey']));

    for (const [key, value] of Object.entries(config)) {
      // Skip properties we've already handled
      if (processedKeys.has(key)) continue;

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
