import * as THREE from 'three';
import { BaseMaterialConfig } from './types';

/**
 * Validates a color value
 * 
 * @param color The color to validate
 * @param propName The property name for error messages
 */
export function validateColor(
  color: THREE.ColorRepresentation | undefined,
  propName: string
): void {
  if (color === undefined) return;
  
  // Check if it's a valid THREE.Color
  if (color instanceof THREE.Color) return;
  
  // Check if it's a valid hex string
  if (typeof color === 'string') {
    // Validate hex format
    if (color.startsWith('#') && (color.length === 4 || color.length === 7)) {
      return;
    }
    // Allow named colors (THREE.js will handle these)
    if (!color.startsWith('#')) {
      return;
    }
  }
  
  // Check if it's a number (like 0xFF0000)
  if (typeof color === 'number') {
    return;
  }
  
  // Check if it's an RGB object
  if (typeof color === 'object' && 
      'r' in color && typeof color.r === 'number' && 
      'g' in color && typeof color.g === 'number' && 
      'b' in color && typeof color.b === 'number') {
    
    // Validate RGB ranges (0-1)
    if (color.r < 0 || color.r > 1 || 
        color.g < 0 || color.g > 1 || 
        color.b < 0 || color.b > 1) {
      throw new Error(`${propName} RGB values must be between 0 and 1`);
    }
    return;
  }
  
  throw new Error(`Invalid ${propName} format`);
}

/**
 * Validates a numeric value within a range
 * 
 * @param value The value to validate
 * @param propName The property name for error messages
 * @param min Minimum valid value (default: 0)
 * @param max Maximum valid value (default: 1)
 */
export function validateNumericRange(
  value: number | undefined,
  propName: string,
  min: number = 0,
  max: number = 1
): void {
  if (value === undefined) return;
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${propName} must be a number`);
  }
  
  if (value < min || value > max) {
    throw new Error(`${propName} must be between ${min} and ${max}`);
  }
}

/**
 * Validates a texture
 * 
 * @param texture The texture to validate
 * @param propName The property name for error messages
 */
export function validateTexture(
  texture: THREE.Texture | undefined,
  propName: string
): void {
  if (texture === undefined) return;
  
  if (!(texture instanceof THREE.Texture)) {
    throw new Error(`${propName} must be a valid THREE.Texture`);
  }
}

/**
 * Validates the common material configuration properties
 * This centralizes the validation logic for all material types
 * 
 * @param config The material configuration to validate
 */
export function validateMaterialConfig(config: BaseMaterialConfig): void {
  validateColor(config.color, 'color');
  validateColor(config.emissive, 'emissive');
  validateNumericRange(config.roughness, 'roughness');
  validateNumericRange(config.metalness, 'metalness');
  validateNumericRange(config.emissiveIntensity, 'emissiveIntensity', 0, 10);
  validateTexture(config.map, 'map');
  validateTexture(config.normalMap, 'normalMap');
}