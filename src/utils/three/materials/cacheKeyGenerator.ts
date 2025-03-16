import * as THREE from 'three';
import { PropertyConfig } from './types';
import { convertColorToHex } from './colorUtils';

/**
 * Standard property configurations for material cache key generation
 */
export const standardPropertyConfigs: PropertyConfig[] = [
  // Colors
  { key: 'color', shortKey: 'c', type: 'color' },
  { key: 'emissive', shortKey: 'e', type: 'color' },

  // Numbers
  { key: 'roughness', shortKey: 'r', type: 'number' },
  { key: 'metalness', shortKey: 'm', type: 'number' },
  { key: 'emissiveIntensity', shortKey: 'ei', type: 'number' },
  { key: 'opacity', type: 'number' },
  { key: 'side', type: 'number' },

  // Textures
  { key: 'map', type: 'texture' },
  { key: 'normalMap', shortKey: 'nm', type: 'texture' },
  { key: 'aoMap', shortKey: 'ao', type: 'texture' },
  { key: 'bumpMap', shortKey: 'bm', type: 'texture' },
  { key: 'displacementMap', shortKey: 'dm', type: 'texture' },
  { key: 'emissiveMap', shortKey: 'em', type: 'texture' },
  { key: 'envMap', shortKey: 'env', type: 'texture' },
  { key: 'roughnessMap', shortKey: 'rm', type: 'texture' },
  { key: 'metalnessMap', shortKey: 'mm', type: 'texture' },
  { key: 'alphaMap', type: 'texture' },

  // Booleans
  { key: 'wireframe', type: 'boolean' },
  { key: 'flatShading', type: 'boolean' },
  { key: 'transparent', type: 'boolean' },
];

/**
 * Generates a cache key based on material properties
 * @param prefix The prefix for the cache key (e.g., 'roman', 'cyberpunk', 'custom')
 * @param config The material configuration object
 * @returns A string that can be used as a cache key
 */
export function generateCacheKey(prefix: string, config: Record<string, unknown>): string {
  // Create cache key object
  const keyObj: Record<string, unknown> = {};

  // Process each configured property
  standardPropertyConfigs.forEach((propConfig) => {
    const value = config[propConfig.key];

    // Skip undefined values
    if (value === undefined) return;

    // Determine the key to use in the output object
    const outputKey = propConfig.shortKey || propConfig.key;

    // Process based on property type
    switch (propConfig.type) {
      case 'color':
        keyObj[outputKey] = convertColorToHex(value);
        break;

      case 'number':
        if (typeof value === 'number') {
          keyObj[outputKey] = value;
        }
        break;

      case 'texture':
        if (value instanceof THREE.Texture) {
          keyObj[outputKey] = value.uuid;
        }
        break;

      case 'boolean':
        if (typeof value === 'boolean') {
          keyObj[outputKey] = value;
        }
        break;

      case 'vector':
        // Handle vector types if needed
        if (propConfig.defaultProcess) {
          keyObj[outputKey] = propConfig.defaultProcess(value);
        }
        break;

      case 'other':
        // Use custom processor if defined
        if (propConfig.defaultProcess) {
          keyObj[outputKey] = propConfig.defaultProcess(value);
        } else {
          keyObj[outputKey] = value;
        }
        break;
    }
  });

  // Handle custom properties that don't fit the standard pattern
  const customProps: Record<string, unknown> = {};
  const processedKeys = new Set(standardPropertyConfigs.map((c) => c.key).concat(['cacheKey']));

  for (const [key, value] of Object.entries(config)) {
    // Skip properties we've already handled
    if (processedKeys.has(key)) continue;

    // Add non-standard properties to the custom object
    customProps[key] = value;
  }

  // If we have custom properties, stringify them and add to key object
  if (Object.keys(customProps).length > 0) {
    try {
      keyObj.custom = JSON.stringify(customProps);
    } catch (e) {
      console.warn('Could not stringify custom properties for cache key', e);
      // Generate a random value to ensure uniqueness
      keyObj.custom = `unstringifiable_${Math.random().toString(36).substring(2)}`;
    }
  }

  const keyString = JSON.stringify(keyObj);
  return `${prefix}_${keyString}`;
}
