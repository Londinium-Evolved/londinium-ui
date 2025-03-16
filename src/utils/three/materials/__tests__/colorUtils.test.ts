import * as THREE from 'three';
import { convertColorToHex } from '../colorUtils';

describe('colorUtils', () => {
  describe('convertColorToHex', () => {
    it('should handle string colors', () => {
      expect(convertColorToHex('#ff0000')).toBe('#ff0000');
      expect(convertColorToHex('red')).toBe('red');
    });

    it('should handle THREE.Color objects', () => {
      const color = new THREE.Color(1, 0, 0);
      expect(convertColorToHex(color)).toBe('#ff0000');
    });

    it('should handle numeric colors', () => {
      expect(convertColorToHex(0xff0000)).toBe('#ff0000');
    });

    it('should handle RGB object colors', () => {
      const color = { r: 1, g: 0, b: 0 };
      expect(convertColorToHex(color)).toBe('#ff0000');
    });

    it('should handle edge cases', () => {
      expect(convertColorToHex(undefined)).toBe('undefined');
      expect(convertColorToHex(null)).toBe('null');
    });
  });
});