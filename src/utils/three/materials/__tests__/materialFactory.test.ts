import * as THREE from 'three';
import { MaterialFactory } from '../materialFactory';

describe('MaterialFactory', () => {
  let factory: MaterialFactory;

  beforeEach(() => {
    factory = MaterialFactory.getInstance();
  });

  afterEach(() => {
    factory.disposeCachedMaterials();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MaterialFactory.getInstance();
      const instance2 = MaterialFactory.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createRomanMaterial', () => {
    it('should create material with default Roman properties', () => {
      const material = factory.createRomanMaterial({});
      
      expect(material.color.getHexString()).toBe('8b7355');
      expect(material.roughness).toBe(0.8);
      expect(material.metalness).toBe(0.1);
    });

    it('should use custom properties when provided', () => {
      const material = factory.createRomanMaterial({
        color: '#ff0000',
        roughness: 0.5,
        metalness: 0.5
      });

      expect(material.color.getHexString()).toBe('ff0000');
      expect(material.roughness).toBe(0.5);
      expect(material.metalness).toBe(0.5);
    });

    it('should reuse cached materials', () => {
      const config = { color: '#ff0000' };
      const material1 = factory.createRomanMaterial(config);
      const material2 = factory.createRomanMaterial(config);
      
      expect(material1).toBe(material2);
    });
  });

  describe('createCyberpunkMaterial', () => {
    it('should create material with default Cyberpunk properties', () => {
      const material = factory.createCyberpunkMaterial({});
      
      expect(material.color.getHexString()).toBe('2c3e50');
      expect(material.roughness).toBe(0.2);
      expect(material.metalness).toBe(0.8);
    });

    it('should handle emissive properties', () => {
      const material = factory.createCyberpunkMaterial({
        emissive: '#00ffff',
        emissiveIntensity: 0.7
      });

      expect(material.emissive.getHexString()).toBe('00ffff');
      expect(material.emissiveIntensity).toBe(0.7);
    });
  });

  describe('createBuildingMaterial', () => {
    it('should throw error for missing building type', () => {
      expect(() => 
        factory.createBuildingMaterial({ era: 'roman' } as any)
      ).toThrow();
    });

    it('should throw error for invalid era', () => {
      expect(() => 
        factory.createBuildingMaterial({ 
          buildingType: 'house', 
          era: 'medieval' as any 
        })
      ).toThrow();
    });

    it('should create appropriate era-specific material', () => {
      const romanMaterial = factory.createBuildingMaterial({
        buildingType: 'domus',
        era: 'roman'
      });

      const cyberpunkMaterial = factory.createBuildingMaterial({
        buildingType: 'apartment',
        era: 'cyberpunk'
      });

      expect(romanMaterial.roughness).toBe(0.8);
      expect(cyberpunkMaterial.roughness).toBe(0.2);
    });
  });

  describe('material management', () => {
    it('should clone materials correctly', () => {
      const original = factory.createRomanMaterial({});
      const clone = factory.cloneMaterial(original, 'clone-key');
      
      expect(clone).not.toBe(original);
      expect(clone.color.equals(original.color)).toBe(true);
    });

    it('should update cached materials', () => {
      const material = factory.createRomanMaterial({
        cacheKey: 'test-material'
      });

      const updated = factory.updateCachedMaterial('test-material', {
        roughness: 0.7
      });

      expect(updated).toBe(material);
      expect(updated?.roughness).toBe(0.7);
    });

    it('should dispose materials correctly', () => {
      const material = factory.createRomanMaterial({
        cacheKey: 'disposable'
      });

      factory.disposeMaterial('disposable');
      expect(factory.getCachedMaterial('disposable')).toBeNull();
    });
  });
});