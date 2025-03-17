import { LIDARTerrainProcessor } from '../../../utils/terrain/LIDARTerrainProcessor';
import * as THREE from 'three';
import { Resolution } from '../../../utils/terrain/types';

// Mock GeoTIFF module
jest.mock('geotiff', () => ({
  fromArrayBuffer: jest.fn().mockImplementation(() => ({
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
}));

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
          count: 100
        }
      };
      
      constructor(width: number, height: number, widthSegments: number, heightSegments: number) {
        this.parameters.width = width;
        this.parameters.height = height;
        
        // Initialize with some values for testing
        for (let i = 0; i < 300; i += 3) {
          this.attributes.position.array[i] = (i % 30) - 15;     // x
          this.attributes.position.array[i+1] = Math.floor(i / 30) - 5; // y
          this.attributes.position.array[i+2] = 0;               // z (height)
        }
      }
      
      computeVertexNormals = jest.fn();
      dispose = jest.fn();
    },
    DataTexture: class MockDataTexture {
      needsUpdate = false;
      
      constructor(data: any, width: number, height: number, format: number) {
        // Nothing to do in mock
      }
      
      dispose = jest.fn();
    },
    Vector3: actualThree.Vector3,
    RGBAFormat: 1023
  };
});

// Mock Worker
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  
  constructor(stringUrl: string | URL) {
    // Nothing to do
  }
  
  postMessage(data: any, transfer?: Transferable[]) {
    // Simulate the worker processing and responding
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'result',
            data: {
              heightmapData: new Float32Array(100 * 100).buffer
            }
          }
        });
      }
    }, 10);
  }
  
  terminate() {
    // Nothing to do
  }
}

// Mock window.Worker
global.Worker = MockWorker as any;

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
});