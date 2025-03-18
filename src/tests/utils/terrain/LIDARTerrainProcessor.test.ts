import { LIDARTerrainProcessor } from '../../../utils/terrain/LIDARTerrainProcessor';
import * as THREE from 'three';
import { Resolution } from '../../../utils/terrain/types';
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

    // Apply Roman era adjustments
    const adjustedTerrain = processor.applyHistoricalAdjustments('roman');

    // Assert that the Thames river is narrower in the Roman era (factor 0.7 in ROMAN_ERA_ADJUSTMENTS)
    expect(adjustedTerrain.adjustmentFactors.thamesWidthChange).toBeCloseTo(0.7, 1);

    // Assert that hills have increased in height as expected
    expect(adjustedTerrain.adjustmentFactors.ludgateHillHeightChange).toBeCloseTo(1.2, 1);
    expect(adjustedTerrain.adjustmentFactors.cornhillHeightChange).toBeCloseTo(1.15, 1);

    // Verify that specific features exist and have reasonable values
    expect(adjustedTerrain.thamesWidth).toBeGreaterThan(0);
    expect(adjustedTerrain.hillHeights.ludgateHill).toBeGreaterThan(0);
    expect(adjustedTerrain.hillHeights.cornhill).toBeGreaterThan(0);

    // Test cyberpunk era adjustments
    const cyberpunkTerrain = processor.applyHistoricalAdjustments('cyberpunk');

    // Verify the era was correctly set
    expect(cyberpunkTerrain.era).toBe('cyberpunk');

    // Check that the correct adjustments were applied
    // In cyberpunk era, megastructure foundations should change terrain
    expect(cyberpunkTerrain.hillHeights).not.toEqual(adjustedTerrain.hillHeights);
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
});
