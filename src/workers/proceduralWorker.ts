// This is a Web Worker for offloading procedural generation tasks
// It will be used to generate complex geometries without blocking the main thread

import { BuildingParams, generateBuildingGeometry } from '../utils/procedural/buildingGenerator';
import * as THREE from 'three';

// Define message types
type WorkerMessageData = {
  type: 'generate-building';
  params: BuildingParams;
  id: string;
};

type BuildingGenerationResult = {
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  params: BuildingParams;
};

type WorkerResponseData = {
  type: 'building-generated';
  result: BuildingGenerationResult;
  id: string;
};

// Handle incoming messages
self.onmessage = (event: MessageEvent<WorkerMessageData>) => {
  const { type, params, id } = event.data;

  switch (type) {
    case 'generate-building': {
      // Use our actual generation logic
      const result = generateBuildingData(params);

      // Send the result back to the main thread
      const response: WorkerResponseData = {
        type: 'building-generated',
        result,
        id,
      };

      self.postMessage(response);
      break;
    }

    default:
      console.error('Unknown message type:', type);
  }
};

// Generate building data using our configuration-driven approach
function generateBuildingData(params: BuildingParams): BuildingGenerationResult {
  // Use the configuration-driven building generator
  const meshData = generateBuildingGeometry(params);

  // Extract geometry data
  const geometry = meshData.geometry;

  // Extract vertices, indices, and normals to pass back to the main thread
  const vertices = new Float32Array(geometry.attributes.position.array);

  // Some geometries use Uint16Array and some use Uint32Array for indices
  // We'll convert to Uint16Array for consistency
  let indices: Uint16Array;
  if (geometry.index) {
    const originalIndices = geometry.index.array;
    indices = new Uint16Array(originalIndices.length);
    for (let i = 0; i < originalIndices.length; i++) {
      indices[i] = originalIndices[i];
    }
  } else {
    // If no indices, create a simple index array (0, 1, 2, 3, ...)
    indices = new Uint16Array(vertices.length / 3);
    for (let i = 0; i < indices.length; i++) {
      indices[i] = i;
    }
  }

  // Get normals, or generate them if not present
  let normals: Float32Array;
  if (geometry.attributes.normal) {
    normals = new Float32Array(geometry.attributes.normal.array);
  } else {
    // Compute normals if not present
    const tempGeometry = new THREE.BufferGeometry();
    tempGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    tempGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    tempGeometry.computeVertexNormals();
    normals = new Float32Array(tempGeometry.attributes.normal.array);
    tempGeometry.dispose();
  }

  return {
    vertices,
    indices,
    normals,
    params, // Echo back the parameters
  };
}

// Export empty object to make TypeScript treat this as a module
export {};
