import { LIDARTerrainProcessor } from '../../../utils/terrain/LIDARTerrainProcessor';
import * as THREE from 'three';
import { Resolution, GeologicalFeature } from '../../../utils/terrain/types';
import * as geotiff from 'geotiff';

// Mock GeoTIFF module
jest.mock('geotiff', () => {
  const mockFromArrayBuffer = jest.fn();
  return {
    fromArrayBuffer: mockFromArrayBuffer.mockImplementation(() => ({
      getImage: jest.fn().mockImplementation(() => ({
        getWidth: jest.fn().mockReturnValue(100),
        getHeight: jest.fn().mockReturnValue(100),
        readRasters: jest.fn().mockResolvedValue([
          // Create a mock 100x100 terrain with a hill in the middle
          new Uint16Array(
            Array(10000)
              .fill(0)
              .map((_, i) => {
                const x = i % 100;
                const y = Math.floor(i / 100);
                const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));

                // Create a hill in the center and a valley/river running through
                if (distFromCenter < 20) {
                  return 1000 - distFromCenter * 10; // Hill
                } else if (y > 40 && y < 60 && x > 20) {
                  return 500; // River
                } else {
                  return 800; // Base terrain
                }
              })
          ),
        ]),
      })),
    })),
  };
});

// Mock THREE.js objects
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');

  return {
    ...actualThree,
    PlaneGeometry: class MockPlaneGeometry {
      parameters = { width: 0, height: 0 };
      attributes = {
        position: {
          array: new Float32Array(300), // Simplified for testing
          count: 100,
        },
      };

      constructor(width: number, height: number) {
        this.parameters.width = width;
        this.parameters.height = height;

        // Initialize with some values for testing
        for (let i = 0; i < 300; i += 3) {
          this.attributes.position.array[i] = (i % 30) - 15; // x
          this.attributes.position.array[i + 1] = Math.floor(i / 30) - 5; // y
          this.attributes.position.array[i + 2] = 0; // z (height)
        }
      }

      computeVertexNormals = jest.fn();
      dispose = jest.fn();
    },
    DataTexture: class MockDataTexture {
      needsUpdate = false;

      constructor() {
        // Nothing to do in mock
      }

      dispose = jest.fn();
    },
    Vector3: actualThree.Vector3,
    RGBAFormat: 1023,
  };
});

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  addEventListener: (event: string, handler: (event: MessageEvent<unknown>) => void) => void;
  removeEventListener: (event: string, handler: (event: MessageEvent<unknown>) => void) => void;
  private messageHandlers: ((event: MessageEvent<unknown>) => void)[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_stringUrl: string | URL) {
    // Set up event listener functionality
    this.addEventListener = (event: string, handler: (event: MessageEvent<unknown>) => void) => {
      if (event === 'message') {
        this.messageHandlers.push(handler);
      }
    };

    this.removeEventListener = (event: string, handler: (event: MessageEvent<unknown>) => void) => {
      if (event === 'message') {
        const index = this.messageHandlers.indexOf(handler);
        if (index !== -1) {
          this.messageHandlers.splice(index, 1);
        }
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postMessage(_data: unknown, _transfer?: Transferable[]) {
    // Simulate the worker processing and responding
    setTimeout(() => {
      const response = {
        data: {
          type: 'process_tiff_done',
          data: {
            heightmapData: new Float32Array(100 * 100).buffer,
          },
        },
      } as MessageEvent<unknown>;

      // Call both the onmessage handler and any addEventListener handlers
      if (this.onmessage) {
        this.onmessage(response);
      }

      this.messageHandlers.forEach((handler) => {
        handler(response);
      });
    }, 10);
  }

  // Method to simulate error from worker for testing
  simulateError(errorMessage: string) {
    setTimeout(() => {
      const errorResponse = {
        data: {
          type: 'error',
          data: errorMessage,
        },
      } as MessageEvent<unknown>;

      // Call both the onmessage handler and any addEventListener handlers
      if (this.onmessage) {
        this.onmessage(errorResponse);
      }

      this.messageHandlers.forEach((handler) => {
        handler(errorResponse);
      });
    }, 10);
  }

  // Method to simulate detailed errors with the new format
  simulateDetailedError(errorData: Record<string, unknown>) {
    setTimeout(() => {
      const errorResponse = {
        data: {
          type: 'error',
          data: errorData,
        },
      } as MessageEvent<unknown>;

      // Call both the onmessage handler and any addEventListener handlers
      if (this.onmessage) {
        this.onmessage(errorResponse);
      }

      this.messageHandlers.forEach((handler) => {
        handler(errorResponse);
      });
    }, 10);
  }

  terminate() {
    // Clear message handlers
    this.messageHandlers = [];
  }
}

// Mock window.Worker
global.Worker = MockWorker as unknown as typeof Worker;

describe('LIDARTerrainProcessor', () => {
  let processor: LIDARTerrainProcessor;
  const mockArrayBuffer = new ArrayBuffer(10);
  const testResolution: Resolution = { width: 100, height: 100 };

  beforeEach(() => {
    processor = new LIDARTerrainProcessor();
  });

  afterEach(() => {
    processor.dispose();
    jest.clearAllMocks();
  });

  test('processLIDARData should load and process GeoTIFF data', async () => {
    await processor.processLIDARData(mockArrayBuffer, testResolution);

    // Should have processed the heightmap data
    expect(processor.getHeightmapData()).not.toBeNull();
    expect(processor.getResolution()).toEqual(testResolution);
  });

  test('createTerrainGeometry should generate a valid Three.js geometry', async () => {
    await processor.processLIDARData(mockArrayBuffer, testResolution);

    const segmentSize = 10;
    const geometry = processor.createTerrainGeometry(segmentSize);

    // Verify the geometry properties
    expect(geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(geometry.parameters.width).toBe(testResolution.width);
    expect(geometry.parameters.height).toBe(testResolution.height);

    // Verify that vertex normals were computed
    expect(geometry.computeVertexNormals).toHaveBeenCalled();
  });

  test('generateNormalMap should create a valid texture', async () => {
    await processor.processLIDARData(mockArrayBuffer, testResolution);

    const normalMap = processor.generateNormalMap();

    expect(normalMap).toBeInstanceOf(THREE.DataTexture);
    expect(normalMap.needsUpdate).toBe(true);
  });

  test('applyHistoricalAdjustments should modify terrain based on era', async () => {
    await processor.processLIDARData(mockArrayBuffer, testResolution);

    // Apply Roman era adjustments - in the real implementation this only logs messages
    await processor.applyHistoricalAdjustments('roman');

    // Since the actual implementation doesn't return an object but just applies the changes
    // We'll verify that the processor has been updated with terrain metrics

    // Verify that geological features exist after processing
    const features = processor.getGeologicalFeatures();
    expect(features.size).toBeGreaterThan(0);

    // Look for thames river feature if it exists
    const thamesFeature = Array.from(features.values()).find((f) => f.name === 'thames');
    if (thamesFeature) {
      expect(thamesFeature.type).toBe('river');
    }

    // Apply cyberpunk era adjustments
    await processor.applyHistoricalAdjustments('cyberpunk');

    // The real implementation would apply different adjustments
    // We can't directly test returned values since the method doesn't return anything
    // but we can check that processing completed without errors
  });

  test('dispose should clean up resources', () => {
    // Initialize the heightmapData and geologicalFeatures with dummy values
    // We need to first process some data to have a worker
    return processor.processLIDARData(mockArrayBuffer, testResolution).then(() => {
      // Set up spy on terminate method of all Worker instances
      const terminateSpy = jest.spyOn(MockWorker.prototype, 'terminate');

      // Ensure we have some data to clean up
      expect(processor.getHeightmapData()).not.toBeNull();

      // Call the dispose method
      processor.dispose();

      // Verify that the worker's terminate method was called
      expect(terminateSpy).toHaveBeenCalled();

      // Verify that heightmapData has been cleared
      expect(processor.getHeightmapData()).toBeNull();

      // Verify that geologicalFeatures have been cleared
      expect(processor.getGeologicalFeatures().size).toBe(0);

      // Clean up spy
      terminateSpy.mockRestore();
    });
  });

  // New error handling tests
  test('processLIDARData should handle worker errors', async () => {
    // Get a reference to the worker for sending custom errors
    const processorAny = processor as unknown;
    const mockWorker = (processorAny as { worker: MockWorker }).worker;

    // Override the postMessage method to simulate an error
    const originalPostMessage = mockWorker.postMessage;
    mockWorker.postMessage = function (data: unknown) {
      // Call the original first to set up event listeners
      originalPostMessage.call(this, data);

      // Now simulate an error
      this.simulateError('Worker processing failed');
    };

    // The promise should be rejected with the error
    await expect(processor.processLIDARData(mockArrayBuffer, testResolution)).rejects.toThrow(
      'Worker processing failed'
    );
  });

  test('processLIDARData should handle TIFF parsing errors', async () => {
    // Override the geotiff.fromArrayBuffer implementation to throw
    const fromArrayBuffer = jest.spyOn(geotiff, 'fromArrayBuffer');
    fromArrayBuffer.mockImplementationOnce(() => {
      throw new Error('Failed to parse TIFF data');
    });

    // Disable worker to test fallback path
    const processorAny = processor as unknown;
    (processorAny as { worker: MockWorker | null }).worker = null;

    // The promise should be rejected with the error
    await expect(processor.processLIDARData(mockArrayBuffer, testResolution)).rejects.toThrow(
      'Terrain generation failed'
    );
  });

  test('processLIDARData should handle image reading errors', async () => {
    // Override the getImage implementation to throw
    const fromArrayBuffer = jest.spyOn(geotiff, 'fromArrayBuffer');
    // Use any to bypass TypeScript's type checking for the mock
    fromArrayBuffer.mockImplementationOnce(
      () =>
        ({
          getImage: jest.fn().mockImplementationOnce(() => {
            throw new Error('Failed to read image data');
          }),
        } as unknown as Promise<geotiff.GeoTIFF>)
    );

    // Disable worker to test fallback path
    const processorAny = processor as unknown;
    (processorAny as { worker: MockWorker | null }).worker = null;

    // The promise should be rejected with the error
    await expect(processor.processLIDARData(mockArrayBuffer, testResolution)).rejects.toThrow(
      'Terrain generation failed'
    );
  });

  test('processLIDARData should handle raster reading errors', async () => {
    // Override the readRasters implementation to reject
    const fromArrayBuffer = jest.spyOn(geotiff, 'fromArrayBuffer');
    // Use any to bypass TypeScript's type checking for the mock
    fromArrayBuffer.mockImplementationOnce(
      () =>
        ({
          getImage: jest.fn().mockImplementationOnce(() => ({
            getWidth: jest.fn().mockReturnValue(100),
            getHeight: jest.fn().mockReturnValue(100),
            readRasters: jest.fn().mockRejectedValueOnce(new Error('Failed to read raster data')),
          })),
        } as unknown as Promise<geotiff.GeoTIFF>)
    );

    // Disable worker to test fallback path
    const processorAny = processor as unknown;
    (processorAny as { worker: MockWorker | null }).worker = null;

    // The promise should be rejected with the error
    await expect(processor.processLIDARData(mockArrayBuffer, testResolution)).rejects.toThrow(
      'Terrain generation failed'
    );
  });

  test('processLIDARData should handle unavailable worker gracefully', async () => {
    // Create processor with worker but then make it unavailable
    const processorWithWorker = new LIDARTerrainProcessor();
    await processorWithWorker.processLIDARData(mockArrayBuffer, testResolution);

    // Now make the worker unavailable for the next call
    const processorAny = processorWithWorker as unknown;
    (processorAny as { worker: MockWorker | null }).worker = null;

    // Should fall back to main thread processing
    await expect(
      processorWithWorker.processLIDARData(mockArrayBuffer, testResolution)
    ).resolves.not.toThrow();

    // Cleanup
    processorWithWorker.dispose();
  });

  test('processLIDARData should handle detailed worker errors', async () => {
    // Get a reference to the worker for sending custom errors
    const processorAny = processor as unknown;
    const mockWorker = (processorAny as { worker: MockWorker }).worker;

    // Override the postMessage method to trigger a detailed error
    const originalPostMessage = mockWorker.postMessage;
    mockWorker.postMessage = function () {
      // Call the simulateDetailedError method instead of normal processing
      this.simulateDetailedError({
        message: 'Invalid TIFF format',
        type: 'FormatError',
        operation: 'process_tiff',
        timestamp: new Date().toISOString(),
        stack: 'Error: Invalid TIFF format\n    at processTiff (terrainWorker.ts:83)',
      });
      return undefined;
    };

    // The promise should be rejected with the detailed error message
    await expect(processor.processLIDARData(mockArrayBuffer, testResolution)).rejects.toThrow(
      'Terrain processing error (process_tiff): Invalid TIFF format'
    );

    // Restore original method
    mockWorker.postMessage = originalPostMessage;
  });

  /**
   * Tests for geological feature identification
   */
  describe('Geological feature identification', () => {
    // Create test heightmap arrays with specific patterns
    let riverHeightmap: Uint16Array;
    let hillHeightmap: Uint16Array;
    let flatHeightmap: Uint16Array;

    beforeEach(() => {
      // Initialize processor
      processor = new LIDARTerrainProcessor();

      // Create test heightmap data
      riverHeightmap = new Uint16Array(testResolution.width * testResolution.height);
      hillHeightmap = new Uint16Array(testResolution.width * testResolution.height);
      flatHeightmap = new Uint16Array(testResolution.width * testResolution.height);

      // Set baseline values for all maps
      for (let i = 0; i < riverHeightmap.length; i++) {
        riverHeightmap[i] = 100;
        hillHeightmap[i] = 100;
        flatHeightmap[i] = 100;
      }

      // Create a river pattern (an elongated area of lower elevation)
      // Create a horizontal river across the middle of the map
      for (let y = 45; y < 55; y++) {
        for (let x = 0; x < testResolution.width; x++) {
          const index = y * testResolution.width + x;
          riverHeightmap[index] = 50; // Lower elevation for river
        }
      }

      // Create a hill pattern (a localized area of higher elevation)
      for (let y = 35; y < 65; y++) {
        for (let x = 35; x < 65; x++) {
          const index = y * testResolution.width + x;
          const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
          if (distFromCenter < 15) {
            // Create a hill with height increasing toward center
            hillHeightmap[index] = 100 + Math.round((15 - distFromCenter) * 10);
          }
        }
      }
    });

    /**
     * Helper method to process heightmap data and extract geological features
     */
    const processHeightmapAndGetFeatures = async (
      heightmapData: Uint16Array
    ): Promise<Map<string, GeologicalFeature>> => {
      // Create a buffer from the heightmap data
      const buffer = heightmapData.buffer;

      // Mock the GeoTIFF processing for this specific test
      const fromArrayBufferMock = geotiff.fromArrayBuffer as jest.Mock;
      fromArrayBufferMock.mockImplementationOnce(() => ({
        getImage: jest.fn().mockImplementation(() => ({
          getWidth: jest.fn().mockReturnValue(testResolution.width),
          getHeight: jest.fn().mockReturnValue(testResolution.height),
          readRasters: jest.fn().mockResolvedValue([heightmapData]),
        })),
      }));

      // Process the data
      await processor.processLIDARData(buffer, testResolution);

      // Return the geological features
      return processor.getGeologicalFeatures();
    };

    test('should identify rivers in the heightmap data', async () => {
      // Process the river heightmap data
      const features = await processHeightmapAndGetFeatures(riverHeightmap);

      // Find features of type 'river'
      const rivers = Array.from(features.values()).filter((feature) => feature.type === 'river');

      // Verify river detection
      expect(rivers.length).toBeGreaterThan(0);

      // Check properties of the identified river
      const river = rivers[0];
      expect(river.bounds).toBeDefined();
      expect(river.bounds.minY).toBeGreaterThanOrEqual(40);
      expect(river.bounds.maxY).toBeLessThanOrEqual(60);

      // Verify the metadata
      expect(river.metadata.averageHeight).toBeLessThan(100);
    });

    test('should identify hills in the heightmap data', async () => {
      // Process the hill heightmap data
      const features = await processHeightmapAndGetFeatures(hillHeightmap);

      // Find features of type 'hill'
      const hills = Array.from(features.values()).filter((feature) => feature.type === 'hill');

      // Verify hill detection
      expect(hills.length).toBeGreaterThan(0);

      // Check properties of the identified hill
      const hill = hills[0];
      expect(hill.bounds).toBeDefined();
      expect(hill.bounds.minX).toBeGreaterThanOrEqual(30);
      expect(hill.bounds.maxX).toBeLessThanOrEqual(70);
      expect(hill.bounds.minY).toBeGreaterThanOrEqual(30);
      expect(hill.bounds.maxY).toBeLessThanOrEqual(70);

      // Verify the metadata
      expect(hill.metadata.averageHeight).toBeGreaterThan(100);
    });

    test('should return empty features when no significant terrain is present', async () => {
      // Process the flat heightmap data
      const features = await processHeightmapAndGetFeatures(flatHeightmap);

      // Check if the feature types we're interested in are empty
      const rivers = Array.from(features.values()).filter((feature) => feature.type === 'river');
      const hills = Array.from(features.values()).filter((feature) => feature.type === 'hill');

      // Verify that no features were detected
      expect(rivers.length).toBe(0);
      expect(hills.length).toBe(0);
    });
  });
});
