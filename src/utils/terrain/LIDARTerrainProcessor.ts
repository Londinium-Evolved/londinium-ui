import * as THREE from 'three';
import { fromArrayBuffer } from 'geotiff';
import {
  GeologicalFeature,
  Resolution,
  TerrainFeatureMetrics,
  TerrainWorkerMessageType,
} from './types';
import { Era } from '../../state/types';
import { resampleHeightmap, generateNormalMap } from './terrainUtils';
import { WorkerPool } from './WorkerPool';

/**
 * Simple quadtree implementation for spatial partitioning of terrain data
 */
class TerrainQuadtree {
  private bounds: { minX: number; minY: number; maxX: number; maxY: number };
  private maxPoints: number;
  private maxDepth: number;
  private depth: number;
  private points: Array<{ x: number; y: number; height: number }> = [];
  private children: TerrainQuadtree[] = [];
  private divided: boolean = false;

  constructor(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    maxPoints: number = 100,
    maxDepth: number = 8,
    depth: number = 0
  ) {
    this.bounds = bounds;
    this.maxPoints = maxPoints;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  /**
   * Insert a point into the quadtree
   */
  insert(point: { x: number; y: number; height: number }): boolean {
    // Point is outside bounds
    if (
      point.x < this.bounds.minX ||
      point.x > this.bounds.maxX ||
      point.y < this.bounds.minY ||
      point.y > this.bounds.maxY
    ) {
      return false;
    }

    // If we haven't reached capacity, add the point
    if (this.points.length < this.maxPoints || this.depth >= this.maxDepth) {
      this.points.push(point);
      return true;
    }

    // Otherwise, subdivide if we haven't already
    if (!this.divided) {
      this.subdivide();
    }

    // Add the point to whichever child will accept it
    // Fix linter error by storing the result in a variable
    const inserted =
      this.children[0].insert(point) ||
      this.children[1].insert(point) ||
      this.children[2].insert(point) ||
      this.children[3].insert(point);

    // Optional debug info if point couldn't be inserted (shouldn't happen)
    if (!inserted) {
      console.warn('Point could not be inserted into any child quadtree', point);
    }

    return inserted;
  }

  /**
   * Divide this node into four children
   */
  subdivide(): void {
    const midX = (this.bounds.minX + this.bounds.maxX) / 2;
    const midY = (this.bounds.minY + this.bounds.maxY) / 2;

    // Create four children
    this.children[0] = new TerrainQuadtree(
      { minX: this.bounds.minX, minY: this.bounds.minY, maxX: midX, maxY: midY },
      this.maxPoints,
      this.maxDepth,
      this.depth + 1
    );
    this.children[1] = new TerrainQuadtree(
      { minX: midX, minY: this.bounds.minY, maxX: this.bounds.maxX, maxY: midY },
      this.maxPoints,
      this.maxDepth,
      this.depth + 1
    );
    this.children[2] = new TerrainQuadtree(
      { minX: this.bounds.minX, minY: midY, maxX: midX, maxY: this.bounds.maxY },
      this.maxPoints,
      this.maxDepth,
      this.depth + 1
    );
    this.children[3] = new TerrainQuadtree(
      { minX: midX, minY: midY, maxX: this.bounds.maxX, maxY: this.bounds.maxY },
      this.maxPoints,
      this.maxDepth,
      this.depth + 1
    );

    // Move existing points to children
    for (const point of this.points) {
      // Fix linter error by storing the result in a variable
      const inserted =
        this.children[0].insert(point) ||
        this.children[1].insert(point) ||
        this.children[2].insert(point) ||
        this.children[3].insert(point);

      // Optional debug info if point couldn't be inserted (shouldn't happen)
      if (!inserted) {
        console.warn('Point could not be inserted into any child quadtree', point);
      }
    }

    this.points = [];
    this.divided = true;
  }

  /**
   * Query for points within a range
   */
  queryRange(
    range: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      minHeight?: number;
      maxHeight?: number;
    },
    found: Array<{ x: number; y: number; height: number }> = []
  ): Array<{ x: number; y: number; height: number }> {
    // If range doesn't overlap this quad, return empty array
    if (
      this.bounds.maxX < range.minX ||
      this.bounds.minX > range.maxX ||
      this.bounds.maxY < range.minY ||
      this.bounds.minY > range.maxY
    ) {
      return found;
    }

    // Check points at this level
    for (const point of this.points) {
      if (
        point.x >= range.minX &&
        point.x <= range.maxX &&
        point.y >= range.minY &&
        point.y <= range.maxY &&
        (range.minHeight === undefined || point.height >= range.minHeight) &&
        (range.maxHeight === undefined || point.height <= range.maxHeight)
      ) {
        found.push(point);
      }
    }

    // If this node is divided, check children
    if (this.divided) {
      this.children[0].queryRange(range, found);
      this.children[1].queryRange(range, found);
      this.children[2].queryRange(range, found);
      this.children[3].queryRange(range, found);
    }

    return found;
  }

  /**
   * Find connected regions of similar height
   */
  findConnectedRegions(
    heightThreshold: number,
    similarityThreshold: number
  ): Array<{ points: Array<{ x: number; y: number; height: number }>; avgHeight: number }> {
    // Create a set to track visited points
    const visited = new Set<string>();
    const regions: Array<{
      points: Array<{ x: number; y: number; height: number }>;
      avgHeight: number;
    }> = [];

    // Get all points from the quadtree
    const allPoints: Array<{ x: number; y: number; height: number }> = [];
    this.getAllPoints(allPoints);

    // Process points to find regions
    for (const point of allPoints) {
      const key = `${point.x},${point.y}`;
      if (visited.has(key) || point.height < heightThreshold) continue;

      // Start a new region
      const region: Array<{ x: number; y: number; height: number }> = [];
      let sum = 0;

      // Growing region by flood-fill
      const queue: Array<{ x: number; y: number; height: number }> = [point];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentKey = `${current.x},${current.y}`;

        if (visited.has(currentKey)) continue;

        visited.add(currentKey);
        region.push(current);
        sum += current.height;

        // Find neighbors (approximate with quadtree query)
        const neighbors = this.queryRange({
          minX: current.x - 1,
          minY: current.y - 1,
          maxX: current.x + 1,
          maxY: current.y + 1,
        });

        // Add similar neighbors to queue
        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          if (
            !visited.has(neighborKey) &&
            Math.abs(neighbor.height - current.height) <= similarityThreshold
          ) {
            queue.push(neighbor);
          }
        }
      }

      // Add region if it has enough points
      if (region.length > 10) {
        regions.push({
          points: region,
          avgHeight: sum / region.length,
        });
      }
    }

    return regions;
  }

  /**
   * Get all points in the quadtree
   */
  getAllPoints(
    result: Array<{ x: number; y: number; height: number }> = []
  ): Array<{ x: number; y: number; height: number }> {
    result.push(...this.points);

    if (this.divided) {
      this.children.forEach((child) => child.getAllPoints(result));
    }

    return result;
  }
}

/**
 * Event interface for processing status updates
 */
export interface ProcessingStatusEvent extends CustomEvent {
  detail: {
    stage: string;
    progress: number;
    message: string;
    timestamp: string;
  };
}

/**
 * LIDARTerrainProcessor handles the processing of Digital Terrain Model (DTM)
 * LIDAR data to create an accurate terrain representation for the game.
 */
export class LIDARTerrainProcessor extends EventTarget {
  private heightmapData: Float32Array | null = null;
  private resolution: Resolution = { width: 0, height: 0 };
  private geologicalFeatures: Map<string, GeologicalFeature> = new Map();
  private worker: Worker | null = null;
  private workerPool: WorkerPool | null = null;
  private isProcessing: boolean = false;
  private terrainQuadtree: TerrainQuadtree | null = null;
  private geometryCache: Map<string, THREE.PlaneGeometry> = new Map();
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    super();

    // Initialize worker pool instead of a single worker
    this.workerPool = new WorkerPool('./terrainWorker.js');

    console.log('LIDAR Terrain Processor initialized with worker pool');
  }

  /**
   * Build spatial index for faster terrain queries
   */
  private buildTerrainIndex(): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    this.dispatchEvent(
      new CustomEvent('processingStatusUpdate', {
        detail: {
          stage: 'indexing',
          progress: 55,
          message: 'Building spatial index...',
          timestamp: new Date().toISOString(),
        },
      })
    );

    // Create quadtree with terrain bounds
    this.terrainQuadtree = new TerrainQuadtree({
      minX: 0,
      minY: 0,
      maxX: this.resolution.width - 1,
      maxY: this.resolution.height - 1,
    });

    // Sample points to add to the quadtree (add every n-th point to avoid overloading)
    const sampleRate = Math.max(1, Math.floor(Math.sqrt(this.heightmapData.length) / 100));

    for (let y = 0; y < this.resolution.height; y += sampleRate) {
      for (let x = 0; x < this.resolution.width; x += sampleRate) {
        const index = y * this.resolution.width + x;
        this.terrainQuadtree.insert({
          x,
          y,
          height: this.heightmapData[index],
        });
      }
    }

    // Optimization: Use quadtree for feature detection
    this.detectFeaturesWithQuadtree();
  }

  /**
   * Use quadtree to detect terrain features more efficiently
   */
  private detectFeaturesWithQuadtree(): void {
    if (!this.terrainQuadtree || !this.heightmapData) return;

    // Calculate height thresholds
    const heights = new Float32Array(this.heightmapData);
    heights.sort();

    const lowThreshold = heights[Math.floor(heights.length * 0.15)]; // Bottom 15%
    const highThreshold = heights[Math.floor(heights.length * 0.85)]; // Top 15%
    const similarityThreshold = (highThreshold - lowThreshold) * 0.05; // 5% of range

    // Find high regions (hills)
    const highRegions = this.terrainQuadtree.findConnectedRegions(
      highThreshold,
      similarityThreshold
    );

    // Process high regions
    highRegions.forEach((region, index) => {
      // Create a bounding box for the region
      const xs = region.points.map((p) => p.x);
      const ys = region.points.map((p) => p.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Add to geological features
      const hillName = `hill_${index}`;

      this.geologicalFeatures.set(hillName, {
        name: hillName,
        type: 'hill',
        bounds: { minX, minY, maxX, maxY },
        metadata: {
          pointCount: region.points.length,
          averageHeight: region.avgHeight,
        },
      });
    });

    // Find low regions (potential rivers)
    // For rivers, we need to consider elongated shapes
    const lowRegions = this.terrainQuadtree
      .findConnectedRegions(-Infinity, similarityThreshold)
      .filter((region) => {
        // Calculate average height
        const { avgHeight } = region;
        // Only consider regions with height below the low threshold
        return avgHeight < lowThreshold;
      });

    // Process low regions for potential rivers
    lowRegions.forEach((region, index) => {
      const xs = region.points.map((p) => p.x);
      const ys = region.points.map((p) => p.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Calculate aspect ratio to identify river-like features
      const width = maxX - minX;
      const height = maxY - minY;
      const aspectRatio = Math.max(width, height) / Math.min(width, height);

      // If elongated enough and large enough, likely a river
      if (aspectRatio > 3 && region.points.length > 100) {
        let riverName = 'unknown_river';

        // Classify rivers based on size and position
        if (width > this.resolution.width * 0.5) {
          riverName = 'thames';
        } else if (width > this.resolution.width * 0.2) {
          riverName = 'walbrook';
        } else {
          riverName = `river_${index}`;
        }

        this.geologicalFeatures.set(riverName, {
          name: riverName,
          type: 'river',
          bounds: { minX, minY, maxX, maxY },
          metadata: {
            pointCount: region.points.length,
            averageHeight: region.avgHeight,
            aspectRatio,
          },
        });
      }
    });
  }

  /**
   * Adds a processing task to the queue and processes it in order
   * This ensures we don't overwhelm the CPU with simultaneous terrain operations
   * @param task A function that returns a promise representing the task
   * @returns Promise that resolves when the task is complete
   */
  private async enqueueProcessingTask(task: () => Promise<void>): Promise<void> {
    // Add the task to the queue
    this.processingQueue.push(task);

    // If we're not already processing the queue, start processing
    if (!this.isProcessingQueue) {
      await this.processQueue();
    }
  }

  /**
   * Process tasks in the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    try {
      this.isProcessingQueue = true;

      while (this.processingQueue.length > 0) {
        const nextTask = this.processingQueue.shift();
        if (nextTask) {
          await nextTask();
        }
      }
    } catch (error) {
      console.error('Error processing terrain queue:', error);
      // Notify about the error
      this.dispatchEvent(
        new CustomEvent('processingStatusUpdate', {
          detail: {
            stage: 'error',
            message: `Error in terrain processing queue: ${
              error instanceof Error ? error.message : String(error)
            }`,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process terrain data in batches to avoid UI blocking
   * @param data The heightmap data to process
   * @param width Width of the heightmap
   * @param height Height of the heightmap
   * @param batchSize Number of rows to process in each batch
   */
  async processTerraininBatches(
    data: Float32Array,
    width: number,
    height: number,
    batchSize: number = 50
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!data || width <= 0 || height <= 0) {
        reject(new Error('Invalid terrain data for batch processing'));
        return;
      }

      // Create a copy of the data to work with
      const processedData = new Float32Array(data.length);

      // Calculate total number of batches
      const totalBatches = Math.ceil(height / batchSize);
      let completedBatches = 0;

      // Process one batch
      const processBatch = (batchIndex: number) => {
        // Calculate the start and end rows for this batch
        const startRow = batchIndex * batchSize;
        const endRow = Math.min(startRow + batchSize, height);

        // Report progress
        this.dispatchEvent(
          new CustomEvent('processingStatusUpdate', {
            detail: {
              stage: 'optimizing',
              progress: Math.round((completedBatches / totalBatches) * 100),
              message: `Optimizing terrain batch ${completedBatches + 1}/${totalBatches}...`,
              timestamp: new Date().toISOString(),
            },
          })
        );

        // Process all pixels in this batch
        for (let y = startRow; y < endRow; y++) {
          for (let x = 0; x < width; x++) {
            const index = y * width + x;

            // Apply processing to each height value
            // Example: Noise reduction via simple 3x3 median filter
            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
              const neighbors = [
                data[(y - 1) * width + (x - 1)],
                data[(y - 1) * width + x],
                data[(y - 1) * width + (x + 1)],
                data[y * width + (x - 1)],
                data[y * width + x],
                data[y * width + (x + 1)],
                data[(y + 1) * width + (x - 1)],
                data[(y + 1) * width + x],
                data[(y + 1) * width + (x + 1)],
              ];

              // Sort neighbors and take the median
              neighbors.sort((a, b) => a - b);
              processedData[index] = neighbors[4]; // Median of 9 values
            } else {
              processedData[index] = data[index]; // Keep edge values as is
            }
          }
        }

        completedBatches++;

        // If there are more batches, schedule the next one with a small delay
        // to allow UI updates and prevent blocking
        if (completedBatches < totalBatches) {
          setTimeout(() => processBatch(completedBatches), 0);
        } else {
          // We're done, update the heightmap data
          resolve();
        }
      };

      // Start processing the first batch
      processBatch(0);
    });
  }

  /**
   * Updates the processLIDARData method to use the worker pool
   */
  async processLIDARData(tiffData: ArrayBuffer, targetResolution: Resolution): Promise<void> {
    try {
      this.isProcessing = true;

      // If we have a worker pool, offload the processing
      if (this.workerPool) {
        // Dispatch event to indicate processing has started
        this.dispatchEvent(
          new CustomEvent('processingStatusUpdate', {
            detail: {
              stage: 'starting',
              progress: 0,
              message: 'Starting LIDAR data processing...',
              timestamp: new Date().toISOString(),
            },
          })
        );

        // Submit task to worker pool
        const result = await this.workerPool.submitTask<{
          heightmapData: ArrayBuffer;
          normalMap: ArrayBuffer;
          width: number;
          height: number;
        }>({
          type: TerrainWorkerMessageType.PROCESS_TIFF,
          data: {
            tiffData,
            targetResolution,
          },
          transferables: [tiffData],
          onProgress: (progress, message) => {
            // Forward progress updates
            this.dispatchEvent(
              new CustomEvent('processingStatusUpdate', {
                detail: {
                  stage: 'processing',
                  progress,
                  message: message || `Processing LIDAR data (${progress}%)...`,
                  timestamp: new Date().toISOString(),
                },
              })
            );
          },
          onError: (error) => {
            // Handle error and report to UI
            this.dispatchEvent(
              new CustomEvent('processingStatusUpdate', {
                detail: {
                  stage: 'error',
                  message: `Error processing LIDAR data: ${error.message}`,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                },
              })
            );
          },
        });

        // Process the result
        if (result && result.heightmapData) {
          this.heightmapData = new Float32Array(result.heightmapData);
          this.resolution = targetResolution;

          // Process terrain in batches for better performance before building spatial index
          this.enqueueProcessingTask(async () => {
            try {
              await this.processTerraininBatches(
                this.heightmapData!,
                this.resolution.width,
                this.resolution.height
              );

              // Build the spatial index after receiving heightmap data
              this.buildTerrainIndex();
            } catch (error) {
              console.error('Error during batch processing:', error);
            }
          });
        } else {
          throw new Error('Processing failed: No heightmap data returned from worker pool');
        }
      } else {
        // Fallback to processing on the main thread if no worker pool
        try {
          const tiff = await fromArrayBuffer(tiffData);
          const image = await tiff.getImage();
          const rasters = await image.readRasters();

          // Extract and normalize elevation data from first band
          const originalData = rasters[0] as Uint16Array;
          const originalWidth = image.getWidth();
          const originalHeight = image.getHeight();

          // Resample to target resolution using bilinear interpolation
          this.heightmapData = resampleHeightmap(
            originalData,
            originalWidth,
            originalHeight,
            targetResolution.width,
            targetResolution.height
          );

          // Store resolution for later use
          this.resolution = targetResolution;

          // Process terrain in batches for improved performance
          await this.processTerraininBatches(
            this.heightmapData,
            this.resolution.width,
            this.resolution.height
          );

          // Build spatial index
          this.buildTerrainIndex();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Main thread terrain processing error:', errorMsg);
          throw new Error(`Terrain processing failed on main thread: ${errorMsg}`);
        }
      }

      this.isProcessing = false;
    } catch (error) {
      this.isProcessing = false;
      // Ensure we clean up any partial resources on error
      this.heightmapData = null;

      console.error('Failed to process LIDAR data:', error);

      // Notify UI of the error
      this.dispatchEvent(
        new CustomEvent('processingStatusUpdate', {
          detail: {
            stage: 'error',
            message: `Failed to process LIDAR data: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            timestamp: new Date().toISOString(),
          },
        })
      );

      throw new Error(error instanceof Error ? error.message : 'Terrain generation failed');
    }
  }

  /**
   * Apply historical adjustments to the terrain based on the selected era
   * @param era The historical era to adjust for
   * @returns Promise resolving when adjustments are complete
   */
  async applyHistoricalAdjustments(era: Era): Promise<void> {
    if (!this.heightmapData || !this.resolution) {
      throw new Error('Cannot apply historical adjustments: No heightmap data available');
    }

    // Calculate the terrain metrics for the selected era
    const metrics: TerrainFeatureMetrics = {
      area: this.calculateTerrainArea(),
      averageHeight: this.calculateAverageHeight(),
      range: this.calculateHeightRange(),
      slope: this.calculateAverageSlope(),
    };

    console.log(`Applying adjustments for era ${era}, terrain metrics:`, metrics);

    // In a real implementation, we would apply the appropriate adjustments for each era
    switch (era) {
      case 'roman':
        // Apply Roman era adjustments
        console.log('Applying Roman era terrain adjustments');
        break;
      case 'cyberpunk':
        // Apply Cyberpunk era adjustments
        console.log('Applying Cyberpunk era terrain adjustments');
        break;
      default:
        // Modern era - no adjustments needed
        console.log('No adjustments needed for modern era');
        break;
    }
  }

  /**
   * Calculate the total area of the terrain in square meters
   */
  private calculateTerrainArea(): number {
    if (!this.resolution) return 0;
    // Simple area calculation - in a real implementation this would account for
    // the actual geographical area represented by the terrain
    return this.resolution.width * this.resolution.height;
  }

  /**
   * Calculate the average height of the terrain
   */
  private calculateAverageHeight(): number {
    if (!this.heightmapData || this.heightmapData.length === 0) return 0;

    const sum = this.heightmapData.reduce((acc, val) => acc + val, 0);
    return sum / this.heightmapData.length;
  }

  /**
   * Calculate the minimum and maximum heights in the terrain
   */
  private calculateHeightRange(): { min: number; max: number } {
    if (!this.heightmapData || this.heightmapData.length === 0) {
      return { min: 0, max: 0 };
    }

    let min = this.heightmapData[0];
    let max = this.heightmapData[0];

    for (let i = 1; i < this.heightmapData.length; i++) {
      const height = this.heightmapData[i];
      if (height < min) min = height;
      if (height > max) max = height;
    }

    return { min, max };
  }

  /**
   * Calculate the average slope of the terrain
   * This is a simplified implementation - real slope calculation would be more complex
   */
  private calculateAverageSlope(): number {
    if (
      !this.heightmapData ||
      !this.resolution ||
      this.resolution.width <= 1 ||
      this.resolution.height <= 1
    ) {
      return 0;
    }

    let totalSlope = 0;
    let slopeCount = 0;

    // Calculate slopes between adjacent points
    for (let y = 0; y < this.resolution.height - 1; y++) {
      for (let x = 0; x < this.resolution.width - 1; x++) {
        const idx = y * this.resolution.width + x;
        const rightIdx = idx + 1;
        const belowIdx = idx + this.resolution.width;

        // Calculate x and y slopes
        const slopeX = Math.abs(this.heightmapData![rightIdx] - this.heightmapData![idx]);
        const slopeY = Math.abs(this.heightmapData![belowIdx] - this.heightmapData![idx]);

        // Average the two slopes
        totalSlope += (slopeX + slopeY) / 2;
        slopeCount++;
      }
    }

    return slopeCount > 0 ? totalSlope / slopeCount : 0;
  }

  /**
   * Creates a cached terrain geometry with adaptive LOD based on camera position
   * @param segmentSize Base size of each segment in the plane geometry
   * @param cameraPosition Optional camera position for LOD calculation
   * @returns THREE.PlaneGeometry with applied heightmap
   */
  createTerrainGeometry(segmentSize: number, cameraPosition?: THREE.Vector3): THREE.PlaneGeometry {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      throw new Error('No heightmap data available for geometry creation');
    }

    // Use LOD based on camera distance if available
    let adjustedSegmentSize = segmentSize;
    let lodLevel = 1;

    if (cameraPosition) {
      // Calculate distance to terrain center
      const terrainCenter = new THREE.Vector3(
        this.resolution.width / 2,
        0,
        this.resolution.height / 2
      );

      const distance = cameraPosition.distanceTo(terrainCenter);

      // Multi-level LOD system with more granular steps
      if (distance > this.resolution.width * 4) {
        adjustedSegmentSize = segmentSize * 8; // Very low detail for very far away
        lodLevel = 8;
      } else if (distance > this.resolution.width * 3) {
        adjustedSegmentSize = segmentSize * 6; // Extra low detail
        lodLevel = 6;
      } else if (distance > this.resolution.width * 2) {
        adjustedSegmentSize = segmentSize * 4; // Low detail far away
        lodLevel = 4;
      } else if (distance > this.resolution.width) {
        adjustedSegmentSize = segmentSize * 2; // Medium detail
        lodLevel = 2;
      }
    }

    // Check cache for this LOD level
    const cacheKey = `terrain_lod_${lodLevel}`;
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!;
    }

    // Create a plane geometry with the appropriate dimensions
    const segmentsX = Math.max(1, Math.ceil(this.resolution.width / adjustedSegmentSize));
    const segmentsY = Math.max(1, Math.ceil(this.resolution.height / adjustedSegmentSize));

    const geometry = new THREE.PlaneGeometry(
      this.resolution.width,
      this.resolution.height,
      segmentsX,
      segmentsY
    );

    // Apply heightmap to geometry vertices
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      // Extract the x,y coordinates from the geometry
      const x = Math.floor(positions[i * 3] + this.resolution.width / 2);
      const y = Math.floor(positions[i * 3 + 1] + this.resolution.height / 2);

      // Clamp to valid coordinates
      const clampedX = Math.max(0, Math.min(this.resolution.width - 1, x));
      const clampedY = Math.max(0, Math.min(this.resolution.height - 1, y));

      // Calculate the height from the heightmap
      const heightIndex = clampedY * this.resolution.width + clampedX;
      const height = this.heightmapData[heightIndex];

      // Apply the height to the geometry
      positions[i * 3 + 2] = height;
    }

    // Update normals
    geometry.computeVertexNormals();

    // Add LOD level as a custom property to help with debugging
    (geometry as THREE.PlaneGeometry & { lodLevel: number }).lodLevel = lodLevel;

    // Cache the geometry
    this.geometryCache.set(cacheKey, geometry);

    console.log(
      `Created terrain geometry with LOD level ${lodLevel} (${segmentsX}x${segmentsY} segments)`
    );

    return geometry;
  }

  /**
   * Creates terrain geometries for multiple LOD levels at once
   * @param baseSegmentSize The base segment size for the highest detail level
   * @param lodLevels The number of LOD levels to generate
   * @returns Array of geometries for each LOD level (from highest to lowest detail)
   */
  createLODLevels(baseSegmentSize: number, lodLevels: number = 4): THREE.PlaneGeometry[] {
    if (!this.heightmapData) {
      throw new Error('No heightmap data available for LOD generation');
    }

    const geometries: THREE.PlaneGeometry[] = [];

    for (let i = 0; i < lodLevels; i++) {
      // Each LOD level uses progressively larger segments (reducing detail)
      const segmentMultiplier = Math.pow(2, i);
      const lodSegmentSize = baseSegmentSize * segmentMultiplier;

      // Create geometry for this LOD level
      const lodGeometry = this.createTerrainGeometry(lodSegmentSize);
      geometries.push(lodGeometry);

      console.log(`Created LOD level ${i} with segment size ${lodSegmentSize}`);
    }

    return geometries;
  }

  /**
   * Clears the geometry cache to free memory
   */
  clearGeometryCache(): void {
    // Dispose all cached geometries to prevent memory leaks
    this.geometryCache.forEach((geometry) => {
      geometry.dispose();
    });

    this.geometryCache.clear();
    console.log('Terrain geometry cache cleared');
  }

  /**
   * Generate a normal map texture from the heightmap
   * @returns THREE.DataTexture containing normal map data
   */
  generateNormalMap(): THREE.DataTexture {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      throw new Error('No heightmap data available for normal map generation');
    }

    // If we have a worker, use it to generate the normal map
    if (this.worker) {
      this.worker.postMessage({
        type: 'generate_normal_map',
        data: {
          heightmapData: this.heightmapData,
          width: this.resolution.width,
          height: this.resolution.height,
        },
      });

      // Note: This would be improved with proper async handling
      // For now, we'll generate on the main thread
    }

    // Generate normal map on the main thread using the shared utility function
    const normalMapData = generateNormalMap(
      this.heightmapData,
      this.resolution.width,
      this.resolution.height
    );

    // Create a Three.js data texture
    const normalMap = new THREE.DataTexture(
      normalMapData,
      this.resolution.width,
      this.resolution.height,
      THREE.RGBAFormat
    );
    normalMap.needsUpdate = true;

    return normalMap;
  }

  /**
   * Get the processed heightmap data
   * @returns The processed heightmap as Float32Array
   */
  getHeightmapData(): Float32Array | null {
    return this.heightmapData;
  }

  /**
   * Get the current resolution of the heightmap
   * @returns Resolution object with width and height
   */
  getResolution(): Resolution {
    return this.resolution;
  }

  /**
   * Get identified geological features
   * @returns Map of geological features
   */
  getGeologicalFeatures(): Map<string, GeologicalFeature> {
    return this.geologicalFeatures;
  }

  /**
   * Clean up resources used by the processor
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clean up worker pool if it exists
    if (this.workerPool) {
      this.workerPool.terminate();
      this.workerPool = null;
    }

    // Clean up cached geometries
    this.geometryCache.forEach((geometry) => {
      geometry.dispose();
    });
    this.geometryCache.clear();

    this.heightmapData = null;
    this.geologicalFeatures.clear();
    this.terrainQuadtree = null;
    this.geologicalFeatures = null as unknown as Map<string, GeologicalFeature>;
  }
}
