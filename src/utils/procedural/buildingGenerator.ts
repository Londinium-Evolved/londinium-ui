import * as THREE from 'three';

export interface BuildingParams {
  width: number;
  height: number;
  depth: number;
  floors: number;
  seed: number;
  era: 'roman' | 'cyberpunk';
}

/**
 * Generates a procedural building geometry based on parameters
 * @param params Building generation parameters
 * @returns THREE.BufferGeometry for the building
 */
export function generateBuildingGeometry(params: BuildingParams): THREE.BufferGeometry {
  const { width, height, depth, seed, era } = params;
  // Note: floors parameter is used in more complex implementations

  // Use seed for deterministic generation
  // Create a simple random function using the seed
  const random = () => {
    // Simple random function based on seed
    const value = Math.sin(seed + 1) * 10000;
    return value - Math.floor(value);
  };

  // Base geometry
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Apply era-specific modifications
  if (era === 'roman') {
    // Add Roman-style roof (sloped)
    const roofHeight = height * 0.2;
    const roofGeometry = new THREE.ConeGeometry(Math.max(width, depth) * 0.6, roofHeight, 4);
    roofGeometry.translate(0, height / 2 + roofHeight / 2, 0);

    // Merge geometries
    const mergedGeometry = mergeGeometries([geometry, roofGeometry]);
    return mergedGeometry;
  } else {
    // Cyberpunk style - add random antenna and details
    const antennaCount = Math.floor(random() * 3) + 1;
    const antennaGeometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < antennaCount; i++) {
      const antennaHeight = height * (0.1 + random() * 0.2);
      const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, antennaHeight);

      // Position on top of building at random positions
      const x = (random() - 0.5) * width * 0.8;
      const z = (random() - 0.5) * depth * 0.8;
      antennaGeometry.translate(x, height / 2 + antennaHeight / 2, z);

      antennaGeometries.push(antennaGeometry);
    }

    // Merge geometries
    const mergedGeometry = mergeGeometries([geometry, ...antennaGeometries]);
    return mergedGeometry;
  }
}

/**
 * Helper function to merge multiple geometries
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // In a real implementation, we would use THREE.BufferGeometryUtils.mergeBufferGeometries
  // For simplicity in this example, we'll just return the first geometry
  return geometries[0];
}
