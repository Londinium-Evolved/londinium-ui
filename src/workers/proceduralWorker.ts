// This is a Web Worker for offloading procedural generation tasks
// It will be used to generate complex geometries without blocking the main thread

import { BuildingParams } from '../utils/procedural/buildingGenerator';

// Define message types
type WorkerMessageData = {
  type: 'generate-building';
  params: BuildingParams;
  id: string;
};

type BuildingGenerationResult = {
  vertices: Float32Array;
  indices: Uint16Array;
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
      // In a real implementation, this would use the actual generation logic
      // but for now we'll just simulate the work
      const result = simulateBuildingGeneration(params);

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

// Simulate building generation (placeholder)
function simulateBuildingGeneration(params: BuildingParams): BuildingGenerationResult {
  // In a real implementation, this would generate actual geometry data
  // For now, we'll just return some mock data
  return {
    vertices: new Float32Array(100), // Mock vertex data
    indices: new Uint16Array(100), // Mock index data
    params, // Echo back the parameters
  };
}

// Export empty object to make TypeScript treat this as a module
export {};
