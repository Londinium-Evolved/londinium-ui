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
          new Uint16Array(Array(10000).fill(0).map((_, i) => {
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
          }))
        ])
      }))
    }))
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

    // Get initial heightmap data
    const initialData = processor.getHeightmapData();
    // Make a copy
    const initialDataCopy = initialData ? new Float32Array(initialData) : null;

    // Apply Roman era adjustments
    processor.applyHistoricalAdjustments('roman');

    // Get updated heightmap data
    const updatedData = processor.getHeightmapData();

    // Verify that some changes were made
    // This is a weak test since we can't easily predict the exact changes
    expect(updatedData).not.toBeNull();

    // There should be some differences between initial and updated data
    if (initialDataCopy && updatedData) {
      let differences = 0;
      for (let i = 0; i < initialDataCopy.length; i++) {
        if (initialDataCopy[i] !== updatedData[i]) {
          differences++;
        }
      }

      // Should have some differences (very implementation-dependent)
      // In a real test we would verify specific adjustments
      expect(differences).toBeGreaterThan(0);
    }
  });

  test('dispose should clean up resources', () => {
    // Nothing to check in our mock implementation, but we can ensure it doesn't throw
    expect(() => processor.dispose()).not.toThrow();
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
