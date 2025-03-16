import * as THREE from 'three';
import { updateMaterial } from '../materialUpdater';

describe('materialUpdater', () => {
  describe('updateMaterial', () => {
    let material: THREE.MeshStandardMaterial;

    beforeEach(() => {
      material = new THREE.MeshStandardMaterial();
    });

    afterEach(() => {
      material.dispose();
    });

    it('should update basic properties', () => {
      const updates = {
        color: '#ff0000',
        roughness: 0.5,
        metalness: 0.8
      };

      updateMaterial(material, updates);

      expect(material.color.getHexString()).toBe('ff0000');
      expect(material.roughness).toBe(0.5);
      expect(material.metalness).toBe(0.8);
    });

    it('should update textures', () => {
      const oldTexture = material.map;
      const newTexture = new THREE.Texture();
      
      updateMaterial(material, { map: newTexture });
      
      expect(material.map).toBe(newTexture);
      expect(material.needsUpdate).toBe(true);
    });

    it('should handle color objects', () => {
      const color = new THREE.Color(1, 0, 0);
      updateMaterial(material, { color });
      
      expect(material.color.equals(color)).toBe(true);
    });

    it('should handle undefined properties', () => {
      const originalColor = material.color.clone();
      updateMaterial(material, { color: undefined });
      
      expect(material.color.equals(originalColor)).toBe(true);
    });

    it('should update vector properties', () => {
      const normalScale = new THREE.Vector2(0.5, 0.5);
      updateMaterial(material, { normalScale });
      
      expect(material.normalScale.equals(normalScale)).toBe(true);
    });
  });
});