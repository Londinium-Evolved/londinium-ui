import * as THREE from 'three';
import { validateColor, validateNumericRange, validateTexture } from '../validators';

describe('validators', () => {
  describe('validateColor', () => {
    it('should accept valid hex colors', () => {
      expect(() => validateColor('#ff0000', 'test')).not.toThrow();
      expect(() => validateColor('#f00', 'test')).not.toThrow();
    });

    it('should accept THREE.Color objects', () => {
      const color = new THREE.Color(1, 0, 0);
      expect(() => validateColor(color, 'test')).not.toThrow();
    });

    it('should accept RGB objects', () => {
      const color = { r: 0.5, g: 0.5, b: 0.5 };
      expect(() => validateColor(color, 'test')).not.toThrow();
    });

    it('should reject invalid hex colors', () => {
      expect(() => validateColor('#xyz', 'test')).toThrow();
      expect(() => validateColor('#ff00', 'test')).toThrow();
    });

    it('should reject invalid RGB values', () => {
      expect(() => validateColor({ r: 2, g: 0, b: 0 }, 'test')).toThrow();
      expect(() => validateColor({ r: -1, g: 0, b: 0 }, 'test')).toThrow();
    });
  });

  describe('validateNumericRange', () => {
    it('should accept numbers within range', () => {
      expect(() => validateNumericRange(0.5, 'test')).not.toThrow();
      expect(() => validateNumericRange(0, 'test')).not.toThrow();
      expect(() => validateNumericRange(1, 'test')).not.toThrow();
    });

    it('should reject numbers outside range', () => {
      expect(() => validateNumericRange(-0.1, 'test')).toThrow();
      expect(() => validateNumericRange(1.1, 'test')).toThrow();
    });

    it('should accept custom ranges', () => {
      expect(() => validateNumericRange(5, 'test', 0, 10)).not.toThrow();
      expect(() => validateNumericRange(-5, 'test', -10, 0)).not.toThrow();
    });

    it('should reject non-numeric values', () => {
      expect(() => validateNumericRange('0.5' as any, 'test')).toThrow();
      expect(() => validateNumericRange(null as any, 'test')).toThrow();
    });
  });

  describe('validateTexture', () => {
    it('should accept valid textures', () => {
      const texture = new THREE.Texture();
      expect(() => validateTexture(texture, 'test')).not.toThrow();
    });

    it('should reject invalid textures', () => {
      expect(() => validateTexture({} as any, 'test')).toThrow();
      expect(() => validateTexture(null as any, 'test')).toThrow();
    });

    it('should accept undefined textures', () => {
      expect(() => validateTexture(undefined, 'test')).not.toThrow();
    });
  });
});