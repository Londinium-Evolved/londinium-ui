import * as THREE from 'three';
import { MaterialUpdateConfig } from './types';

// Define a type for texture properties of MeshStandardMaterial
type TexturePropertyKey =
  | 'map'
  | 'normalMap'
  | 'aoMap'
  | 'bumpMap'
  | 'displacementMap'
  | 'emissiveMap'
  | 'envMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'alphaMap';

/**
 * Updates an existing material with new properties
 * This is useful for dynamically changing material properties without creating new instances
 *
 * @param material The material to update
 * @param properties New properties to apply to the material
 * @returns The updated material
 */
export function updateMaterial(
  material: THREE.MeshStandardMaterial,
  properties: MaterialUpdateConfig
): THREE.MeshStandardMaterial {
  // Update each property
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;

    // Handle special cases for color and vector properties
    switch (key) {
      case 'color':
        if (material.color) {
          if (value instanceof THREE.Color) {
            material.color.copy(value);
          } else {
            material.color.set(value as THREE.ColorRepresentation);
          }
        }
        break;

      case 'emissive':
        if (material.emissive) {
          if (value instanceof THREE.Color) {
            material.emissive.copy(value);
          } else {
            material.emissive.set(value as THREE.ColorRepresentation);
          }
        }
        break;

      case 'normalScale':
        if (value instanceof THREE.Vector2) {
          material.normalScale.copy(value);
        }
        break;

      // Handle texture assignments
      case 'map':
      case 'normalMap':
      case 'aoMap':
      case 'bumpMap':
      case 'displacementMap':
      case 'emissiveMap':
      case 'envMap':
      case 'roughnessMap':
      case 'metalnessMap':
      case 'alphaMap':
        if (value instanceof THREE.Texture) {
          const textureKey = key as TexturePropertyKey;
          const oldTexture = material[textureKey];
          if (oldTexture && !isTextureUsedElsewhere(oldTexture, material)) {
            oldTexture.dispose();
          }
          material[textureKey] = value;
        }
        break;

      // Handle numeric and boolean properties
      default:
        if (
          key in material &&
          typeof value === typeof material[key as keyof THREE.MeshStandardMaterial]
        ) {
          (material as unknown as Record<string, unknown>)[key] = value;
        }
        break;
    }
  }

  // Mark material for update
  material.needsUpdate = true;

  return material;
}

/**
 * Checks if a texture is used by other properties of the material
 * @param texture The texture to check
 * @param material The material to check against
 * @returns true if the texture is used by other properties, false otherwise
 */
function isTextureUsedElsewhere(
  texture: THREE.Texture,
  material: THREE.MeshStandardMaterial
): boolean {
  const textureProperties: TexturePropertyKey[] = [
    'map',
    'normalMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'envMap',
    'roughnessMap',
    'metalnessMap',
    'alphaMap',
  ];

  return textureProperties.some((prop) => {
    const propTexture = material[prop];
    return propTexture && propTexture !== texture && propTexture.uuid === texture.uuid;
  });
}
