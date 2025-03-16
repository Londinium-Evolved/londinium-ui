import * as THREE from 'three';
import { BuildingMeshData } from './buildingGenerator';
import { materialFactory } from '../three/materialFactory';

/**
 * BuildingLOD provides utilities for creating Level of Detail (LOD) models
 * for procedurally generated buildings. This helps maintain performance
 * by using simpler models for buildings far from the camera.
 */

/**
 * Creates a LOD material based on the original material and detail factor
 *
 * @param material The original material to base the LOD material on
 * @param detailFactor Detail factor (0-1) where 1 is lowest detail
 * @param type Building type for cache key generation
 * @param lodLevel The current LOD level
 * @param totalLevels Total number of LOD levels
 * @returns A material suitable for the specified LOD level
 */
function createLODMaterial(
  material: THREE.Material,
  detailFactor: number,
  type: string,
  lodLevel: number,
  totalLevels: number
): THREE.Material {
  if (material instanceof THREE.MeshStandardMaterial) {
    // Create a cache key for this material
    const cacheKey = `lod_${type}_${lodLevel}_${totalLevels}`;

    // Check if material already exists in cache
    const cachedMaterial = materialFactory.getCachedMaterial(cacheKey);
    if (cachedMaterial) {
      // If the material exists in cache, just update the normal scale if needed
      if (material.normalMap && detailFactor < 0.5) {
        const normalScale = material.normalScale.clone().multiplyScalar(1 - detailFactor);
        materialFactory.updateCachedMaterial(cacheKey, {
          normalScale: normalScale,
        });
      }
      return cachedMaterial;
    }

    // Create material properties object
    const materialProps: Record<
      string,
      THREE.ColorRepresentation | number | THREE.Texture | string | undefined
    > = {
      color: material.color,
      roughness: Math.min(1, material.roughness + detailFactor * 0.3),
      metalness: Math.max(0, material.metalness - detailFactor * 0.3),
      emissive: material.emissive,
      emissiveIntensity: material.emissiveIntensity,
      cacheKey: cacheKey,
    };

    // Only add normalMap if needed (for closer LOD levels)
    if (material.normalMap && detailFactor < 0.5) {
      materialProps.normalMap = material.normalMap;

      // Create the material with normal map
      const lodMaterial = materialFactory.createCustomMaterial(materialProps);

      // Handle normal scale separately (Vector2 can't be directly passed to factory)
      const normalScale = material.normalScale.clone().multiplyScalar(1 - detailFactor);
      lodMaterial.normalScale.copy(normalScale);

      return lodMaterial;
    } else {
      // Create the material without normal map
      return materialFactory.createCustomMaterial(materialProps);
    }
  }

  // Fallback for non-standard material types
  return material.clone();
}

/**
 * Creates a LOD (Level of Detail) object for a procedurally generated building
 *
 * @param buildingData The building mesh data from the generator
 * @param maxDistance The maximum distance at which the building is visible
 * @returns A THREE.js LOD object with multiple detail levels
 */
export function createBuildingLOD(
  buildingData: BuildingMeshData,
  maxDistance: number = 500
): THREE.LOD {
  const { geometry, materials, type } = buildingData;

  // Create a new LOD object
  const lod = new THREE.LOD();

  // Get the LOD geometries from the building data
  // If they don't exist, we'll create simplified versions
  const lodGeometries: THREE.BufferGeometry[] =
    geometry.userData?.lodGeometries || createSimplifiedGeometries(geometry, 3);

  // Create a material that works for all LOD levels
  // For multi-material buildings, we use the first material for simplified LODs
  const material = Array.isArray(materials) ? materials[0] : materials;

  // Add the highest detail level (original geometry)
  const highDetailMesh = new THREE.Mesh(geometry, materials);
  lod.addLevel(highDetailMesh, 0);

  // Add the lower detail levels
  // Skip the first one as it's already added above
  for (let i = 1; i < lodGeometries.length; i++) {
    const lodGeometry = lodGeometries[i];
    const detailFactor = i / (lodGeometries.length - 1); // 0 to 1

    // Create LOD material using the helper function
    const lodMaterial = createLODMaterial(material, detailFactor, type, i, lodGeometries.length);

    // Create the mesh for this LOD level
    const lodMesh = new THREE.Mesh(lodGeometry, lodMaterial);

    // Calculate at what distance this LOD level should be used
    // Higher indices (more simplified models) are used at greater distances
    const distance = detailFactor * maxDistance;

    // Add this level to the LOD object
    lod.addLevel(lodMesh, distance);
  }

  // Add metadata to the LOD object for debugging and tracking
  lod.userData = {
    buildingType: type,
    lodLevels: lodGeometries.length,
    maxDistance,
    generatedAt: new Date().toISOString(),
  };

  return lod;
}

/**
 * Creates simplified geometries for LOD
 * This is a fallback in case pre-generated LOD geometries are not available
 *
 * @param baseGeometry The high-detail geometry to simplify
 * @param levels Number of detail levels to generate (including the base)
 * @returns Array of geometries with decreasing detail levels
 */
function createSimplifiedGeometries(
  baseGeometry: THREE.BufferGeometry,
  levels: number = 3
): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [baseGeometry];

  // Get the bounding box of the original geometry
  const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(baseGeometry));
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Create simplified box geometries for lower detail levels
  for (let i = 1; i < levels; i++) {
    const detailFactor = 1 - i / levels;

    // Simplify by using a box with fewer segments for distant views
    const simplifiedGeometry = new THREE.BoxGeometry(
      size.x,
      size.y,
      size.z,
      Math.max(1, Math.floor(4 * detailFactor)),
      Math.max(1, Math.floor(4 * detailFactor)),
      Math.max(1, Math.floor(4 * detailFactor))
    );

    // Position the box to match the original geometry
    simplifiedGeometry.translate(center.x, center.y, center.z);

    // Add metadata
    simplifiedGeometry.userData = {
      isLOD: true,
      lodLevel: i,
      detailFactor,
      originalGeometryId: baseGeometry.id,
    };

    geometries.push(simplifiedGeometry);
  }

  return geometries;
}

/**
 * Get the appropriate LOD level for a given distance
 * Utility function to help determine which LOD to use
 *
 * @param distance Distance from camera to object
 * @param maxDistance Maximum distance for LOD switching
 * @param levels Number of LOD levels
 * @returns The index of the LOD level to use (0 = highest detail)
 */
export function getLODLevelForDistance(
  distance: number,
  maxDistance: number = 500,
  levels: number = 3
): number {
  if (distance <= 0) return 0; // Closest objects get highest detail
  if (distance >= maxDistance) return levels - 1; // Furthest objects get lowest detail

  // Linear interpolation between 0 and levels-1 based on distance
  return Math.floor((distance / maxDistance) * levels);
}

/**
 * Updates LOD visibility based on camera distance
 * This can be used in the render loop to update LOD levels
 *
 * @param lod The LOD object to update
 * @param camera The camera to measure distance from
 */
export function updateLODFromCamera(lod: THREE.LOD, camera: THREE.Camera): void {
  // Calculate world position if not already available
  if (!lod.matrixWorldNeedsUpdate) {
    lod.updateMatrixWorld(true);
  }

  // Get the world position of the LOD object
  const lodWorldPosition = new THREE.Vector3();
  lod.getWorldPosition(lodWorldPosition);

  // Get the camera position
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);

  // Calculate the distance between the camera and the LOD object
  const distance = lodWorldPosition.distanceTo(cameraPosition);

  // Update the LOD level based on the distance
  lod.update(camera);

  // Add current distance to userData for debugging
  lod.userData.currentDistance = distance;
  lod.userData.currentLODLevel = lod.getCurrentLevel();
}
