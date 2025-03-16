import * as THREE from 'three';
import { generateAutomaticCacheKey, generateConfigFingerprint } from '../automaticCacheKeyGenerator';

describe('automaticCacheKeyGenerator', () => {
  describe('generateAutomaticCacheKey', () => {
    it('should respect manual cache keys when provided', () => {
      const config = {
        color: '#ff0000',
        roughness: 0.5,
        cacheKey: 'manual-key'
      };
      
      expect(generateAutomaticCacheKey('test', config)).toBe('manual-key');
    });
    
    it('should generate consistent keys for the same properties', () => {
      const config1 = {
        color: '#ff0000',
        roughness: 0.5,
        metalness: 0.2
      };
      
      const config2 = {
        color: '#ff0000',
        roughness: 0.5,
        metalness: 0.2
      };
      
      const key1 = generateAutomaticCacheKey('test', config1);
      const key2 = generateAutomaticCacheKey('test', config2);
      
      expect(key1).toBe(key2);
    });
    
    it('should include the prefix in the key', () => {
      const config = { color: '#ff0000' };
      const key = generateAutomaticCacheKey('prefix', config);
      
      expect(key.startsWith('prefix_')).toBe(true);
    });
    
    it('should handle THREE.js objects correctly', () => {
      const texture = new THREE.Texture();
      const color = new THREE.Color(0xff0000);
      
      const config = {
        color: color,
        map: texture
      };
      
      const key = generateAutomaticCacheKey('test', config);
      
      expect(key).toContain('color:ff0000');
      expect(key).toContain(`map:${texture.uuid}`);
    });
    
    it('should generate different keys for different properties', () => {
      const config1 = { color: '#ff0000', roughness: 0.5 };
      const config2 = { color: '#00ff00', roughness: 0.5 };
      
      const key1 = generateAutomaticCacheKey('test', config1);
      const key2 = generateAutomaticCacheKey('test', config2);
      
      expect(key1).not.toBe(key2);
    });
    
    it('should handle property order consistently', () => {
      const config1 = { color: '#ff0000', roughness: 0.5 };
      const config2 = { roughness: 0.5, color: '#ff0000' };
      
      const key1 = generateAutomaticCacheKey('test', config1);
      const key2 = generateAutomaticCacheKey('test', config2);
      
      expect(key1).toBe(key2);
    });
  });
  
  describe('generateConfigFingerprint', () => {
    it('should ignore cacheKey property', () => {
      const config1 = { color: '#ff0000', cacheKey: 'key1' };
      const config2 = { color: '#ff0000', cacheKey: 'key2' };
      
      expect(generateConfigFingerprint(config1)).toBe(generateConfigFingerprint(config2));
    });
    
    it('should be different for different configs', () => {
      const config1 = { color: '#ff0000' };
      const config2 = { color: '#00ff00' };
      
      expect(generateConfigFingerprint(config1)).not.toBe(generateConfigFingerprint(config2));
    });
  });
});