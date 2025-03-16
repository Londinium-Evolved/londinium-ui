import * as THREE from 'three';

/**
 * Validates a color value to ensure it's in an acceptable format
 * @param color The color to validate
 * @param paramName The name of the parameter being validated (for error messages)
 * @throws Error if the color format is invalid
 */
export function validateColor(color: unknown, paramName: string): void {
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
export function validateNumericRange(
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
    throw new Error(`Invalid value for ${paramName}: ${value} (must be between ${min} and ${max})`);
  }
}

/**
 * Validates a texture to ensure it's a valid THREE.Texture
 * @param texture The texture to validate
 * @param paramName The name of the parameter being validated (for error messages)
 * @throws Error if the texture is invalid
 */
export function validateTexture(texture: unknown, paramName: string): void {
  // If undefined, allow it (no texture will be used)
  if (texture === undefined) {
    return;
  }

  if (!(texture instanceof THREE.Texture)) {
    throw new Error(`Invalid type for ${paramName}: expected THREE.Texture, got ${typeof texture}`);
  }

  // Check if texture has an image defined (might not be loaded yet)
  if (!texture.image && texture.uuid === '') {
    throw new Error(`Invalid texture for ${paramName}: texture has no image or UUID`);
  }
}
