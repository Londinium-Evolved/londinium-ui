import * as THREE from 'three';
import { generateCacheKey, standardPropertyConfigs } from '../cacheKeyGenerator';

describe('cacheKeyGenerator', () => {
  describe('standardPropertyConfigs', () => {
    it('should contain all standard material properties', () => {
      const properties = standardPropertyConfigs.map(config => config.key);
      expect(properties).toContain('color');
      expect(properties).toContain('roughness');
      expect(properties).toContain('metalness');
      expect(properties).toContain('map');
      expect(properties).toContain('normalMap');
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for identical configs', () => {
      const config1 = { color: '#ff0000', roughness: 0.5 };
      const config2 = { roughness: 0.5, color: '#ff0000' };
      
      const key1 = generateCacheKey('test', config1);
      const key2 = generateCacheKey('test', config2);
      
      expect(key1).toBe(key2);
    });

    it('should handle texture UUIDs', () => {
      const texture = new THREE.Texture();
      const config = { map: texture };
      
      const key = generateCacheKey('test', config);
      expect(key).toContain(texture.uuid);
    });

    it('should handle custom properties', () => {
      const config = {
        color: '#ff0000',
        customProp: 'value'
      };
      
      const key = generateCacheKey('test', config);
      expect(key).toContain('custom');
      expect(key).toContain('value');
    });

    it('should handle undefined values', () => {
      const config = {
        color: '#ff0000',
        roughness: undefined
      };
      
      const key = generateCacheKey('test', config);
      expect(key).not.toContain('roughness');
    });

    it('should include prefix in key', () => {
      const config = { color: '#ff0000' };
      const key = generateCacheKey('test', config);
      expect(key.startsWith('test_')).toBe(true);
    });
  });
});