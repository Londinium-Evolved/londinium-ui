import * as THREE from 'three';
import { MaterialFactory, materialFactory } from '../materialFactory';

// Mock THREE.js classes to avoid issues with WebGL in test environment
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');

  // Mock classes
  class MockColor {
    r = 1;
    g = 1;
    b = 1;
    constructor(color?: THREE.ColorRepresentation) {
      if (color) {
        this.r = typeof color === 'number' ? color : 1;
      }
    }
    getHexString() {
      return 'ffffff';
    }
  }

  class MockTexture {
    uuid = 'mock-texture-uuid';
    constructor() {
      this.uuid = 'mock-texture-uuid-' + Math.random().toString(36).substring(2);
    }
  }

  interface MockMaterialParams {
    color?: MockColor;
    roughness?: number;
    metalness?: number;
    emissive?: MockColor;
    emissiveIntensity?: number;
    map?: MockTexture | null;
    normalMap?: MockTexture | null;
    name?: string;
    wireframe?: boolean;
    [key: string]: unknown;
  }

  class MockMaterial {
    uuid = 'mock-material-uuid';
    color = new MockColor();
    roughness = 0.5;
    metalness = 0.5;
    emissive = new MockColor();
    emissiveIntensity = 0;
    map = null;
    normalMap = null;
    name = '';
    wireframe = false;

    constructor(params: MockMaterialParams = {}) {
      Object.assign(this, params);
      this.uuid = 'mock-material-uuid-' + Math.random().toString(36).substring(2);
    }

    clone() {
      const clone = new MockMaterial();
      Object.assign(clone, this);
      clone.uuid = 'mock-material-clone-uuid-' + Math.random().toString(36).substring(2);
      return clone;
    }

    dispose() {
      // Mock implementation
    }
  }

  return {
    ...originalModule,
    Color: MockColor,
    Texture: MockTexture,
    MeshStandardMaterial: MockMaterial,
  };
});

describe('MaterialFactory', () => {
  beforeEach(() => {
    // Reset material cache before each test
    materialFactory.disposeCachedMaterials();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = MaterialFactory.getInstance();
      const instance2 = MaterialFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(materialFactory).toBe(MaterialFactory.getInstance());
    });
  });

  describe('Roman material creation', () => {
    it('should create a material with default Roman values', () => {
      const material = materialFactory.createRomanMaterial({});

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBeCloseTo(0.8);
      expect(material.metalness).toBeCloseTo(0.1);
    });

    it('should create a material with custom Roman values', () => {
      const customColor = new THREE.Color('red');
      const material = materialFactory.createRomanMaterial({
        color: customColor,
        roughness: 0.7,
        metalness: 0.2,
      });

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color).toBe(customColor);
      expect(material.roughness).toBeCloseTo(0.7);
      expect(material.metalness).toBeCloseTo(0.2);
    });
  });

  describe('Cyberpunk material creation', () => {
    it('should create a material with default Cyberpunk values', () => {
      const material = materialFactory.createCyberpunkMaterial({});

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBeCloseTo(0.2);
      expect(material.metalness).toBeCloseTo(0.8);
    });

    it('should create a material with custom Cyberpunk values', () => {
      const customColor = new THREE.Color(0x00ff00);
      const material = materialFactory.createCyberpunkMaterial({
        color: customColor,
        roughness: 0.3,
        metalness: 0.9,
      });

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color).toBe(customColor);
      expect(material.roughness).toBeCloseTo(0.3);
      expect(material.metalness).toBeCloseTo(0.9);
    });
  });

  describe('Building material creation', () => {
    it('should create a Roman building material', () => {
      const material = materialFactory.createBuildingMaterial({
        buildingType: 'domus',
        era: 'roman',
      });

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBeCloseTo(0.8);
      expect(material.metalness).toBeCloseTo(0.1);
    });

    it('should create a Cyberpunk building material', () => {
      const material = materialFactory.createBuildingMaterial({
        buildingType: 'megacorp-tower',
        era: 'cyberpunk',
      });

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBeCloseTo(0.2);
      expect(material.metalness).toBeCloseTo(0.8);
    });
  });

  describe('Material caching', () => {
    it('should return the same material instance for identical parameters', () => {
      const material1 = materialFactory.createRomanMaterial({
        color: 0xff0000,
        roughness: 0.5,
      });

      const material2 = materialFactory.createRomanMaterial({
        color: 0xff0000,
        roughness: 0.5,
      });

      expect(material1).toBe(material2);
    });

    it('should return different material instances for different parameters', () => {
      const material1 = materialFactory.createRomanMaterial({
        color: 0xff0000,
      });

      const material2 = materialFactory.createRomanMaterial({
        color: 0x00ff00,
      });

      expect(material1).not.toBe(material2);
    });

    it('should clear cache when disposeCachedMaterials is called', () => {
      const material1 = materialFactory.createRomanMaterial({
        color: 0xff0000,
      });

      materialFactory.disposeCachedMaterials();

      const material2 = materialFactory.createRomanMaterial({
        color: 0xff0000,
      });

      expect(material1).not.toBe(material2);
    });
  });

  describe('Custom material creation', () => {
    it('should create a custom material with specified properties', () => {
      // Type assertion to bypass TypeScript type checking in test
      const materialParams = {
        color: 0x0000ff,
        roughness: 0.3,
        metalness: 0.7,
        wireframe: true,
      };

      const material = materialFactory.createCustomMaterial(
        materialParams as unknown as Record<
          string,
          THREE.ColorRepresentation | number | THREE.Texture | string | undefined
        >
      );

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color).toBeDefined();
      expect(material.roughness).toBeCloseTo(0.3);
      expect(material.metalness).toBeCloseTo(0.7);
      expect(material.wireframe).toBe(true);
    });
  });

  describe('Material cloning', () => {
    it('should clone a material and add it to the cache', () => {
      const originalMaterial = materialFactory.createRomanMaterial({
        color: 0xff0000,
      });

      const clonedMaterial = materialFactory.cloneMaterial(originalMaterial, 'clone-test');

      expect(clonedMaterial).not.toBe(originalMaterial);

      // Should return the cached clone on subsequent requests with the same key
      const retrievedMaterial = materialFactory.cloneMaterial(originalMaterial, 'clone-test');
      expect(retrievedMaterial).toBe(clonedMaterial);
    });
  });

  describe('Material updates', () => {
    it('should update an existing material in the cache', () => {
      // Create a material and place it in the cache
      const originalMaterial = materialFactory.createRomanMaterial({
        color: 0xff0000,
        roughness: 0.7,
        cacheKey: 'update-test',
      });

      // Verify initial properties
      expect(originalMaterial.roughness).toBeCloseTo(0.7);

      // Update the material
      const updatedMaterial = materialFactory.updateCachedMaterial('update-test', {
        roughness: 0.3,
        metalness: 0.8,
      });

      // Verify the material was updated
      expect(updatedMaterial).not.toBeNull();
      expect(updatedMaterial!.roughness).toBeCloseTo(0.3);
      expect(updatedMaterial!.metalness).toBeCloseTo(0.8);

      // Verify it's the same instance (not a new material)
      expect(updatedMaterial).toBe(originalMaterial);
    });

    it('should handle color properties correctly during update', () => {
      // Create a material with a red color
      const originalMaterial = materialFactory.createRomanMaterial({
        color: 0xff0000,
        cacheKey: 'color-update-test',
      });

      // Update with a new color
      materialFactory.updateCachedMaterial('color-update-test', {
        color: 0x00ff00, // green
      });

      // The color object should be the same instance but with new values
      expect(originalMaterial.color.getHexString()).toBe('00ff00');
    });

    it('should return null when trying to update a non-existent material', () => {
      const result = materialFactory.updateCachedMaterial('non-existent-key', {
        roughness: 0.5,
      });

      expect(result).toBeNull();
    });

    it('should retrieve a cached material by key', () => {
      // Create a material with a specific cache key
      const material = materialFactory.createRomanMaterial({
        cacheKey: 'retrievable-material',
      });

      // Get it from the cache
      const retrievedMaterial = materialFactory.getCachedMaterial('retrievable-material');

      // Should be the same instance
      expect(retrievedMaterial).toBe(material);

      // Non-existent materials should return null
      expect(materialFactory.getCachedMaterial('non-existent')).toBeNull();
    });
  });

  describe('Complex cache key generation', () => {
    it('should generate different keys for materials with different textures', () => {
      const texture1 = new THREE.Texture();
      const texture2 = new THREE.Texture();

      const material1 = materialFactory.createCustomMaterial({
        color: 0xffffff,
        roughnessMap: texture1,
      });

      const material2 = materialFactory.createCustomMaterial({
        color: 0xffffff,
        roughnessMap: texture2,
      });

      // Should be different instances due to different texture UUIDs
      expect(material1).not.toBe(material2);
    });

    it('should handle boolean properties in cache keys', () => {
      // Cast the entire object to the correct expected type
      const material1 = materialFactory.createCustomMaterial({
        wireframe: true,
        transparent: false,
      } as unknown as Record<string, THREE.ColorRepresentation | number | THREE.Texture | string | undefined>);

      const material2 = materialFactory.createCustomMaterial({
        wireframe: true,
        transparent: true,
      } as unknown as Record<string, THREE.ColorRepresentation | number | THREE.Texture | string | undefined>);

      // Should be different instances due to different boolean values
      expect(material1).not.toBe(material2);
    });

    it('should handle custom non-standard properties', () => {
      const material1 = materialFactory.createCustomMaterial({
        color: 0xffffff,
        customProperty1: 'value1',
        customProperty2: 42,
      });

      const material2 = materialFactory.createCustomMaterial({
        color: 0xffffff,
        customProperty1: 'value1',
        customProperty2: 43,
      });

      // Should be different instances due to different custom property values
      expect(material1).not.toBe(material2);
    });
  });

  describe('Material properties', () => {
    it('should respect flatShading setting when provided', () => {
      // Create a material with flatShading = true
      const materialWithFlatShading = materialFactory.createRomanMaterial({
        flatShading: true,
        cacheKey: 'test-flat-shading-true',
      });
      expect(materialWithFlatShading.flatShading).toBe(true);

      // Create a material with flatShading = false
      const materialWithoutFlatShading = materialFactory.createRomanMaterial({
        flatShading: false,
        cacheKey: 'test-flat-shading-false',
      });
      expect(materialWithoutFlatShading.flatShading).toBe(false);

      // Verify different cache keys are generated
      const material1 = materialFactory.createCustomMaterial({
        color: 0xff0000,
        flatShading: true,
      } as unknown as Record<string, THREE.ColorRepresentation | number | THREE.Texture | string | undefined>);

      const material2 = materialFactory.createCustomMaterial({
        color: 0xff0000,
        flatShading: false,
      } as unknown as Record<string, THREE.ColorRepresentation | number | THREE.Texture | string | undefined>);

      // Should be different instances due to different flatShading values
      expect(material1).not.toBe(material2);
    });
  });
});
