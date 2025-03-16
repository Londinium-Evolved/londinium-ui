import * as THREE from 'three';

/**
 * Base configuration interface for all material types
 */
export interface BaseMaterialConfig {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  flatShading?: boolean;
  cacheKey?: string;
}

/**
 * Configuration for building materials
 */
export interface BuildingMaterialConfig extends BaseMaterialConfig {
  buildingType: string;
  era: 'roman' | 'cyberpunk';
}

/**
 * Configuration for custom materials with additional properties
 */
export interface CustomMaterialConfig extends BaseMaterialConfig {
  [key: string]: THREE.ColorRepresentation | number | THREE.Texture | string | boolean | undefined;
}

/**
 * Property configuration for cache key generation
 */
export interface PropertyConfig {
  key: string;
  shortKey?: string;
  type: 'color' | 'number' | 'texture' | 'boolean' | 'vector' | 'other';
  defaultProcess?: (value: unknown) => unknown;
}

/**
 * Material update configuration
 */
export interface MaterialUpdateConfig {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  normalScale?: THREE.Vector2;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  bumpMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
  envMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  alphaMap?: THREE.Texture;
  wireframe?: boolean;
  flatShading?: boolean;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}
