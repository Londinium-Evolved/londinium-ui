import * as THREE from 'three';
import { BaseMaterialConfig, CustomMaterialConfig } from './types';

/**
 * Configuration for property hashing behavior
 */
interface PropertyHashConfig {
  /** Property name to check in the material config */
  key: string;
  
  /** Function to convert the property value to a string representation */
  hashFn: (value: any) => string;
  
  /** Whether to include this property in the hash when undefined */
  includeWhenUndefined?: boolean;
}

/**
 * Standard property configurations for consistent hashing
 */
const propertyHashConfigs: PropertyHashConfig[] = [
  {
    key: 'color',
    hashFn: (value) => {
      if (value instanceof THREE.Color) {
        return value.getHexString();
      } else if (typeof value === 'number') {
        return new THREE.Color(value).getHexString();
      } else if (typeof value === 'string') {
        return value;
      } else if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
        return new THREE.Color(value.r, value.g, value.b).getHexString();
      }
      return String(value);
    }
  },
  {
    key: 'roughness',
    hashFn: (value) => value?.toFixed(4) || '0.0000',
  },
  {
    key: 'metalness',
    hashFn: (value) => value?.toFixed(4) || '0.0000',
  },
  {
    key: 'emissive',
    hashFn: (value) => {
      if (!value) return '';
      if (value instanceof THREE.Color) {
        return value.getHexString();
      } else if (typeof value === 'number') {
        return new THREE.Color(value).getHexString();
      } else if (typeof value === 'string') {
        return value;
      } else if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
        return new THREE.Color(value.r, value.g, value.b).getHexString();
      }
      return String(value);
    }
  },
  {
    key: 'emissiveIntensity',
    hashFn: (value) => value?.toFixed(4) || '0.0000',
  },
  {
    key: 'flatShading',
    hashFn: (value) => value ? 'true' : 'false',
  },
  {
    key: 'wireframe',
    hashFn: (value) => value ? 'true' : 'false',
  },
  {
    key: 'transparent',
    hashFn: (value) => value ? 'true' : 'false',
  },
  {
    key: 'opacity',
    hashFn: (value) => value?.toFixed(4) || '1.0000',
  },
  {
    key: 'side',
    hashFn: (value) => String(value),
  },
  {
    key: 'map',
    hashFn: (value) => value?.uuid || 'no-map',
  },
  {
    key: 'normalMap',
    hashFn: (value) => value?.uuid || 'no-normalMap',
  },
  {
    key: 'aoMap',
    hashFn: (value) => value?.uuid || 'no-aoMap',
  },
  {
    key: 'roughnessMap',
    hashFn: (value) => value?.uuid || 'no-roughnessMap',
  },
  {
    key: 'metalnessMap',
    hashFn: (value) => value?.uuid || 'no-metalnessMap',
  },
  {
    key: 'emissiveMap',
    hashFn: (value) => value?.uuid || 'no-emissiveMap',
  },
];

/**
 * Automatically generates a cache key from material properties
 * This is more reliable than manual key creation and ensures all
 * relevant properties are included in the key
 * 
 * @param prefix A prefix to identify the material type (e.g., 'roman', 'cyberpunk')
 * @param config Material configuration object
 * @returns A unique cache key string
 */
export function generateAutomaticCacheKey(
  prefix: string,
  config: BaseMaterialConfig | CustomMaterialConfig
): string {
  // If manual cache key is provided, respect it
  if (config.cacheKey) {
    return config.cacheKey;
  }
  
  // Generate automatic key from config properties
  const propertyHashes: string[] = [];
  
  // Process standard properties first (in a consistent order)
  for (const propConfig of propertyHashConfigs) {
    const value = (config as any)[propConfig.key];
    
    // Skip undefined values unless explicitly included
    if (value === undefined && !propConfig.includeWhenUndefined) {
      continue;
    }
    
    const hash = `${propConfig.key}:${propConfig.hashFn(value)}`;
    propertyHashes.push(hash);
  }
  
  // Handle any custom properties not in the standard config
  const processedKeys = new Set(propertyHashConfigs.map(config => config.key));
  processedKeys.add('cacheKey'); // Skip cache key itself
  
  for (const [key, value] of Object.entries(config)) {
    if (processedKeys.has(key) || value === undefined) {
      continue;
    }
    
    // Handle various types of values
    let valueString = '';
    if (value instanceof THREE.Texture) {
      valueString = value.uuid;
    } else if (value instanceof THREE.Color) {
      valueString = value.getHexString();
    } else if (value instanceof THREE.Vector2) {
      valueString = `${value.x},${value.y}`;
    } else if (value instanceof THREE.Vector3) {
      valueString = `${value.x},${value.y},${value.z}`;
    } else {
      valueString = String(value);
    }
    
    propertyHashes.push(`${key}:${valueString}`);
  }
  
  // Sort for consistency and join with separator
  propertyHashes.sort();
  return `${prefix}_${propertyHashes.join('_')}`;
}

/**
 * Generates a fingerprint hash from an object
 * Useful for comparing if two material configs would result in the same material
 * 
 * @param obj Object to generate a fingerprint from
 * @returns A hash string representing the object
 */
export function generateConfigFingerprint(obj: Record<string, any>): string {
  // Filter out 'cacheKey' as it's not a material property
  const normalizedObj = { ...obj };
  delete normalizedObj.cacheKey;
  
  // Sort keys for consistent output
  const keys = Object.keys(normalizedObj).sort();
  
  // Build fingerprint
  const fingerprint = keys.map(key => {
    const value = normalizedObj[key];
    
    if (value === null || value === undefined) {
      return `${key}:null`;
    }
    
    // Handle different value types
    if (value instanceof THREE.Texture) {
      return `${key}:texture-${value.uuid}`;
    } else if (value instanceof THREE.Color) {
      return `${key}:color-${value.getHexString()}`;
    } else if (value instanceof THREE.Vector2) {
      return `${key}:vec2-${value.x},${value.y}`;
    } else if (value instanceof THREE.Vector3) {
      return `${key}:vec3-${value.x},${value.y},${value.z}`;
    } else if (typeof value === 'object') {
      return `${key}:obj-${JSON.stringify(value)}`;
    }
    
    return `${key}:${value}`;
  });
  
  return fingerprint.join('|');
}