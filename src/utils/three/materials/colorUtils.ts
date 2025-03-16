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
