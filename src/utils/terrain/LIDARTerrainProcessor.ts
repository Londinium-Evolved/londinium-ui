import * as THREE from 'three';
import { fromArrayBuffer } from 'geotiff';
import {
  GeologicalFeature,
  Resolution,
  TerrainAdjustment,
  ROMAN_ERA_ADJUSTMENTS,
  CYBERPUNK_ERA_ADJUSTMENTS,
  MODERN_INFRASTRUCTURE_MASK,
  HEIGHT_SCALE,
  NODATA_VALUE,
  TerrainFeatureMetrics,
} from './types';
import { Era } from '../../state/types';

/**
 * LIDARTerrainProcessor handles the processing of Digital Terrain Model (DTM)
 * LIDAR data to create an accurate terrain representation for the game.
 */
export class LIDARTerrainProcessor {
  private heightmapData: Float32Array | null = null;
  private resolution: Resolution = { width: 0, height: 0 };
  private geologicalFeatures: Map<string, GeologicalFeature> = new Map();
  private worker: Worker | null = null;
  private isProcessing: boolean = false;

  constructor() {
    // Initialize the WebWorker if supported
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./terrainWorker.ts', import.meta.url), { type: 'module' });

      // Set up message handling from worker
      this.worker.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === 'error') {
          console.error('Worker error:', data);
        } else if (type === 'result') {
          if (data.heightmapData) {
            this.heightmapData = new Float32Array(data.heightmapData);
          }
          if (data.geologicalFeatures) {
            this.geologicalFeatures = new Map(data.geologicalFeatures);
          }
          this.isProcessing = false;
        }
      };
    }
  }

  /**
   * Process LIDAR data from a GeoTIFF file
   * @param tiffData ArrayBuffer containing GeoTIFF data
   * @param targetResolution Desired resolution for the terrain
   */
  async processLIDARData(tiffData: ArrayBuffer, targetResolution: Resolution): Promise<void> {
    try {
      this.isProcessing = true;

      // If we have a worker, offload the processing
      if (this.worker) {
        this.worker.postMessage(
          {
            type: 'process_tiff',
            data: {
              tiffData,
              targetResolution,
            },
          },
          [tiffData]
        ); // Transfer the buffer for efficiency

        // Wait for the worker to finish using a one-time event listener
        return new Promise((resolve, reject) => {
          const messageHandler = (event: MessageEvent) => {
            const { type, data } = event.data;

            if (type === 'process_tiff_done') {
              this.isProcessing = false;
              if (data.heightmapData) {
                this.heightmapData = new Float32Array(data.heightmapData);
                this.resolution = targetResolution;
                resolve();
              } else {
                reject(new Error('Processing failed'));
              }
              this.worker?.removeEventListener('message', messageHandler);
            } else if (type === 'error') {
              this.isProcessing = false;
              reject(new Error(data));
              this.worker?.removeEventListener('message', messageHandler);
            }
          };

          // Add null check for TypeScript
          if (this.worker) {
            this.worker.addEventListener('message', messageHandler);
          } else {
            reject(new Error('Worker not available'));
          }
        });
      }

      // Fallback to processing on the main thread if no worker
      const tiff = await fromArrayBuffer(tiffData);
      const image = await tiff.getImage();
      const rasters = await image.readRasters();

      // Extract and normalize elevation data from first band
      const originalData = rasters[0] as Uint16Array;
      const originalWidth = image.getWidth();
      const originalHeight = image.getHeight();

      // Resample to target resolution using bilinear interpolation
      this.heightmapData = this.resampleHeightmap(
        originalData,
        originalWidth,
        originalHeight,
        targetResolution.width,
        targetResolution.height
      );

      // Store resolution for later use
      this.resolution = targetResolution;

      // Process and identify key geological features
      this.identifyGeologicalFeatures();

      this.isProcessing = false;
    } catch (error) {
      this.isProcessing = false;
      console.error('Failed to process LIDAR data:', error);
      throw new Error('Terrain generation failed');
    }
  }

  /**
   * Apply historical adjustments to the terrain based on era
   * @param era The game era to adjust terrain for
   * @returns TerrainFeatureMetrics object with information about key terrain features
   */
  applyHistoricalAdjustments(era: Era): TerrainFeatureMetrics {
    if (!this.heightmapData) {
      throw new Error('No heightmap data available for adjustment');
    }

    const adjustments = era === 'roman' ? ROMAN_ERA_ADJUSTMENTS : CYBERPUNK_ERA_ADJUSTMENTS;

    // Track metrics before applying adjustments
    const preAdjustmentMetrics = this.calculateTerrainMetrics();

    // Process each adjustment
    adjustments.forEach((adjustment) => {
      switch (adjustment.type) {
        case 'river':
          this.adjustRiverWidth(adjustment.name, adjustment.factor);
          break;
        case 'elevation':
          if (adjustment.name === 'modern_infrastructure') {
            this.applyElevationMask(MODERN_INFRASTRUCTURE_MASK, adjustment.factor);
          } else if (adjustment.bounds) {
            this.applyElevationAdjustment(adjustment.bounds, adjustment.factor);
          }
          break;
        default:
          console.warn(`Unknown adjustment type: ${adjustment.type}`);
      }
    });

    // Additional era-specific adjustments
    if (era === 'roman') {
      this.restoreHistoricalElevations();
    }

    // Calculate terrain metrics after adjustments
    const postAdjustmentMetrics = this.calculateTerrainMetrics();

    return {
      era,
      thamesWidth: postAdjustmentMetrics.thamesWidth,
      walbrookWidth: postAdjustmentMetrics.walbrookWidth,
      hillHeights: postAdjustmentMetrics.hillHeights,
      adjustmentFactors: {
        thamesWidthChange:
          preAdjustmentMetrics.thamesWidth > 0
            ? postAdjustmentMetrics.thamesWidth / preAdjustmentMetrics.thamesWidth
            : 1,
        walbrookWidthChange:
          preAdjustmentMetrics.walbrookWidth > 0
            ? postAdjustmentMetrics.walbrookWidth / preAdjustmentMetrics.walbrookWidth
            : 1,
        ludgateHillHeightChange:
          preAdjustmentMetrics.hillHeights.ludgateHill > 0
            ? postAdjustmentMetrics.hillHeights.ludgateHill /
              preAdjustmentMetrics.hillHeights.ludgateHill
            : 1,
        cornhillHeightChange:
          preAdjustmentMetrics.hillHeights.cornhill > 0
            ? postAdjustmentMetrics.hillHeights.cornhill / preAdjustmentMetrics.hillHeights.cornhill
            : 1,
      },
    };
  }

  /**
   * Calculate metrics about key terrain features
   * @private
   */
  private calculateTerrainMetrics(): TerrainFeatureMetrics {
    const result: TerrainFeatureMetrics = {
      era: 'roman', // Default
      thamesWidth: 0,
      walbrookWidth: 0,
      hillHeights: {
        ludgateHill: 0,
        cornhill: 0,
        towerHill: 0,
      },
      adjustmentFactors: {
        thamesWidthChange: 1,
        walbrookWidthChange: 1,
        ludgateHillHeightChange: 1,
        cornhillHeightChange: 1,
      },
    };

    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      return result;
    }

    // Calculate Thames width
    const thamesFeature = this.geologicalFeatures.get('thames');
    if (thamesFeature) {
      // Simplified width calculation - in a real implementation this would be more sophisticated
      result.thamesWidth = this.calculateRiverWidth(thamesFeature);
    }

    // Calculate Walbrook width
    const walbrookFeature = this.geologicalFeatures.get('walbrook');
    if (walbrookFeature) {
      result.walbrookWidth = this.calculateRiverWidth(walbrookFeature);
    }

    // Calculate hill heights
    const ludgateHill =
      this.geologicalFeatures.get('hill_0') || this.geologicalFeatures.get('ludgate_hill');
    if (ludgateHill) {
      result.hillHeights.ludgateHill = this.calculateHillHeight(ludgateHill);
    }

    const cornhill =
      this.geologicalFeatures.get('hill_1') || this.geologicalFeatures.get('cornhill');
    if (cornhill) {
      result.hillHeights.cornhill = this.calculateHillHeight(cornhill);
    }

    const towerHill =
      this.geologicalFeatures.get('hill_2') || this.geologicalFeatures.get('tower_hill');
    if (towerHill) {
      result.hillHeights.towerHill = this.calculateHillHeight(towerHill);
    }

    return result;
  }

  /**
   * Calculate the average width of a river feature
   * @private
   */
  private calculateRiverWidth(riverFeature: GeologicalFeature): number {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      return 0;
    }

    const { bounds } = riverFeature;
    const avgHeight = this.calculateAverageHeight(bounds);

    // Count points that are significantly lower than average (likely river points)
    const rows: number[] = [];

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      let rowRiverPoints = 0;

      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;
          // Consider points significantly lower than average as river points
          if (this.heightmapData[index] < avgHeight * 0.8) {
            rowRiverPoints++;
          }
        }
      }

      if (rowRiverPoints > 0) {
        rows.push(rowRiverPoints);
      }
    }

    // Calculate average width across rows
    return rows.length > 0 ? rows.reduce((sum, width) => sum + width, 0) / rows.length : 0;
  }

  /**
   * Calculate the average height of a hill feature
   * @private
   */
  private calculateHillHeight(hillFeature: GeologicalFeature): number {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      return 0;
    }

    const { bounds } = hillFeature;
    let maxHeight = 0;

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;
          maxHeight = Math.max(maxHeight, this.heightmapData[index]);
        }
      }
    }

    return maxHeight;
  }

  /**
   * Calculate average height within bounds
   * @private
   */
  private calculateAverageHeight(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): number {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      return 0;
    }

    let sum = 0;
    let count = 0;

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;
          sum += this.heightmapData[index];
          count++;
        }
      }
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Create Three.js geometry from the processed heightmap
   * @param segmentSize Size of each segment in the plane geometry
   * @returns THREE.PlaneGeometry with applied heightmap
   */
  createTerrainGeometry(segmentSize: number): THREE.PlaneGeometry {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) {
      throw new Error('No heightmap data available for geometry creation');
    }

    // Create a plane geometry with the appropriate dimensions
    const geometry = new THREE.PlaneGeometry(
      this.resolution.width,
      this.resolution.height,
      this.resolution.width / segmentSize,
      this.resolution.height / segmentSize
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

    return geometry;
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

    // Generate normal map on the main thread
    const normalMapData = new Uint8Array(this.resolution.width * this.resolution.height * 4);

    // For each pixel in the heightmap
    for (let y = 0; y < this.resolution.height; y++) {
      for (let x = 0; x < this.resolution.width; x++) {
        const index = y * this.resolution.width + x;
        const normalIndex = index * 4;

        // Get heights of neighboring pixels
        const left = x > 0 ? this.heightmapData[index - 1] : this.heightmapData[index];
        const right =
          x < this.resolution.width - 1 ? this.heightmapData[index + 1] : this.heightmapData[index];
        const up =
          y > 0 ? this.heightmapData[index - this.resolution.width] : this.heightmapData[index];
        const down =
          y < this.resolution.height - 1
            ? this.heightmapData[index + this.resolution.width]
            : this.heightmapData[index];

        // Calculate normal using central differences
        const dzdx = (right - left) * 2.0;
        const dzdy = (down - up) * 2.0;

        // Create and normalize the normal vector
        const normal = new THREE.Vector3(-dzdx, -dzdy, 8.0).normalize();

        // Pack into RGB format (0-255)
        normalMapData[normalIndex] = Math.floor((normal.x * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 3] = 255; // Alpha channel
      }
    }

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

    this.heightmapData = null;
    this.geologicalFeatures.clear();
    this.geologicalFeatures = null as unknown as Map<string, GeologicalFeature>;
  }

  // ------------------------
  // Private helper methods
  // ------------------------

  /**
   * Resample heightmap data to a new resolution using bilinear interpolation
   * @private
   */
  private resampleHeightmap(
    originalData: Uint16Array,
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number
  ): Float32Array {
    const result = new Float32Array(targetWidth * targetHeight);

    // Calculate scaling factors
    const xScale = originalWidth / targetWidth;
    const yScale = originalHeight / targetHeight;

    // For each pixel in the target heightmap
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const targetIndex = y * targetWidth + x;

        // Calculate corresponding position in the original heightmap
        const origX = x * xScale;
        const origY = y * yScale;

        // Calculate integer positions for bilinear interpolation
        const x0 = Math.floor(origX);
        const y0 = Math.floor(origY);
        const x1 = Math.min(x0 + 1, originalWidth - 1);
        const y1 = Math.min(y0 + 1, originalHeight - 1);

        // Calculate fractional parts
        const xFrac = origX - x0;
        const yFrac = origY - y0;

        // Get values at the four corners
        const val00 = originalData[y0 * originalWidth + x0];
        const val01 = originalData[y0 * originalWidth + x1];
        const val10 = originalData[y1 * originalWidth + x0];
        const val11 = originalData[y1 * originalWidth + x1];

        // Handle NoData values (usually indicated by very large values)
        const useVal00 = val00 < NODATA_VALUE ? val00 : 0;
        const useVal01 = val01 < NODATA_VALUE ? val01 : 0;
        const useVal10 = val10 < NODATA_VALUE ? val10 : 0;
        const useVal11 = val11 < NODATA_VALUE ? val11 : 0;

        // Perform bilinear interpolation
        const top = useVal00 * (1 - xFrac) + useVal01 * xFrac;
        const bottom = useVal10 * (1 - xFrac) + useVal11 * xFrac;
        const value = top * (1 - yFrac) + bottom * yFrac;

        // Normalize the height data to a reasonable range
        result[targetIndex] = value / HEIGHT_SCALE; // Scale to reasonable values for Three.js
      }
    }

    return result;
  }

  /**
   * Identify geological features in the heightmap
   * @private
   */
  private identifyGeologicalFeatures(): void {
    if (!this.heightmapData) return;

    // Simple thresholding approach for feature detection
    // For a real implementation, more sophisticated algorithms would be used

    // Look for river valleys (lowest points) - simplified example
    this.detectRivers();

    // Detect hills (highest points)
    this.detectHills();
  }

  /**
   * Detect rivers in the heightmap using simple thresholding
   * @private
   */
  private detectRivers(): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    // For a real implementation, this would use more sophisticated
    // water flow simulation and analysis. This is simplified.

    // Find low areas that form connected paths
    const visited = new Set<number>();
    const lowThreshold = this.calculateHeightThreshold(0.15); // Bottom 15% of heights

    for (let y = 0; y < this.resolution.height; y++) {
      for (let x = 0; x < this.resolution.width; x++) {
        const index = y * this.resolution.width + x;

        if (this.heightmapData[index] <= lowThreshold && !visited.has(index)) {
          // Found a potential river point - flood fill to find connected points
          const riverPoints = this.floodFillLowAreas(x, y, lowThreshold, visited);

          // If we have enough connected points, it might be a river
          if (riverPoints.length > 50) {
            // Arbitrary threshold
            // Calculate the bounding box
            const xs = riverPoints.map((p) => p.x);
            const ys = riverPoints.map((p) => p.y);

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            // Determine if it's likely to be the Thames or another river
            // This is an oversimplification - real detection would be more complex
            let riverName = 'unknown_river';

            // Check if it spans a large portion of the map width
            if (maxX - minX > this.resolution.width * 0.5) {
              riverName = 'thames';
            } else if (maxX - minX > this.resolution.width * 0.2) {
              riverName = 'walbrook';
            }

            // Add to geological features
            this.geologicalFeatures.set(riverName, {
              name: riverName,
              type: 'river',
              bounds: { minX, minY, maxX, maxY },
              metadata: {
                pointCount: riverPoints.length,
                averageDepth:
                  riverPoints.reduce(
                    (sum, p) => sum + this.heightmapData![p.y * this.resolution.width + p.x],
                    0
                  ) / riverPoints.length,
              },
            });
          }
        }
      }
    }
  }

  /**
   * Detect hills and high points in the heightmap
   * @private
   */
  private detectHills(): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    // Find high areas
    const highThreshold = this.calculateHeightThreshold(0.85); // Top 15% of heights
    const visited = new Set<number>();

    for (let y = 0; y < this.resolution.height; y++) {
      for (let x = 0; x < this.resolution.width; x++) {
        const index = y * this.resolution.width + x;

        if (this.heightmapData[index] >= highThreshold && !visited.has(index)) {
          // Found a potential hill point - flood fill to find connected high points
          const hillPoints = this.floodFillHighAreas(x, y, highThreshold, visited);

          // If we have enough connected points, it might be a hill
          if (hillPoints.length > 20) {
            // Arbitrary threshold
            // Calculate the bounding box
            const xs = hillPoints.map((p) => p.x);
            const ys = hillPoints.map((p) => p.y);

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            // Add to geological features - simplistic naming
            const hillName = `hill_${this.geologicalFeatures.size}`;

            this.geologicalFeatures.set(hillName, {
              name: hillName,
              type: 'hill',
              bounds: { minX, minY, maxX, maxY },
              metadata: {
                pointCount: hillPoints.length,
                averageHeight:
                  hillPoints.reduce(
                    (sum, p) => sum + this.heightmapData![p.y * this.resolution.width + p.x],
                    0
                  ) / hillPoints.length,
              },
            });
          }
        }
      }
    }
  }

  /**
   * Calculate a height threshold based on percentile
   * @private
   */
  private calculateHeightThreshold(percentile: number): number {
    if (!this.heightmapData || this.heightmapData.length === 0) return 0;

    // Copy data to avoid modifying original
    const sortedHeights = [...this.heightmapData].sort((a, b) => a - b);
    const index = Math.floor(sortedHeights.length * percentile);
    return sortedHeights[index];
  }

  /**
   * Flood fill algorithm to find connected low areas (potential rivers)
   * @private
   */
  private floodFillLowAreas(
    startX: number,
    startY: number,
    threshold: number,
    visited: Set<number>
  ): Array<{ x: number; y: number }> {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return [];

    const result: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const index = y * this.resolution.width + x;

      if (visited.has(index)) continue;

      // Mark as visited
      visited.add(index);

      // Check if this is a low point
      if (this.heightmapData[index] <= threshold) {
        result.push({ x, y });

        // Add adjacent points to queue
        const directions = [
          { dx: -1, dy: 0 }, // Left
          { dx: 1, dy: 0 }, // Right
          { dx: 0, dy: -1 }, // Up
          { dx: 0, dy: 1 }, // Down
        ];

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;

          // Check if within bounds
          if (nx >= 0 && nx < this.resolution.width && ny >= 0 && ny < this.resolution.height) {
            const neighborIndex = ny * this.resolution.width + nx;
            if (!visited.has(neighborIndex)) {
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Flood fill algorithm to find connected high areas (potential hills)
   * @private
   */
  private floodFillHighAreas(
    startX: number,
    startY: number,
    threshold: number,
    visited: Set<number>
  ): Array<{ x: number; y: number }> {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return [];

    const result: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const index = y * this.resolution.width + x;

      if (visited.has(index)) continue;

      // Mark as visited
      visited.add(index);

      // Check if this is a high point
      if (this.heightmapData[index] >= threshold) {
        result.push({ x, y });

        // Add adjacent points to queue
        const directions = [
          { dx: -1, dy: 0 }, // Left
          { dx: 1, dy: 0 }, // Right
          { dx: 0, dy: -1 }, // Up
          { dx: 0, dy: 1 }, // Down
        ];

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;

          // Check if within bounds
          if (nx >= 0 && nx < this.resolution.width && ny >= 0 && ny < this.resolution.height) {
            const neighborIndex = ny * this.resolution.width + nx;
            if (!visited.has(neighborIndex)) {
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Adjust river width based on historical data
   * @private
   */
  private adjustRiverWidth(riverName: string, widthFactor: number): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    // Find the river feature
    const riverFeature = this.geologicalFeatures.get(riverName);
    if (!riverFeature) {
      console.warn(`River feature '${riverName}' not found`);
      return;
    }

    const { bounds } = riverFeature;

    // For this simplified example, we'll just adjust the depth of river points
    // by scaling their elevation difference from the average height

    // Calculate the average height in the region
    let sum = 0;
    let count = 0;

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;
          sum += this.heightmapData[index];
          count++;
        }
      }
    }

    const avgHeight = count > 0 ? sum / count : 0;

    // Adjust river points
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;
          const height = this.heightmapData[index];

          // If it's a low point (likely part of the river)
          if (height < avgHeight) {
            // Calculate distance from center of river
            // This is a simplification - real implementation would be more sophisticated
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            // Get the river width (half the average of width and height)
            const riverWidth = (bounds.maxX - bounds.minX + bounds.maxY - bounds.minY) / 4;

            // If we're reducing width (widthFactor < 1), only adjust points closer to edge
            // If we're increasing width (widthFactor > 1), affect more points
            if (
              (widthFactor < 1 && distFromCenter > riverWidth * widthFactor) ||
              (widthFactor >= 1 && distFromCenter <= riverWidth * widthFactor)
            ) {
              // Adjustment factor based on distance
              let adjustmentFactor;
              if (widthFactor < 1) {
                // When narrowing the river, raise the edges
                adjustmentFactor =
                  (distFromCenter - riverWidth * widthFactor) /
                  (riverWidth - riverWidth * widthFactor);
                adjustmentFactor = Math.min(1, Math.max(0, adjustmentFactor)); // Clamp to 0-1

                // Gradually raise the elevation back toward the average height
                this.heightmapData[index] =
                  height * (1 - adjustmentFactor) + avgHeight * adjustmentFactor;
              } else {
                // When widening the river, lower areas near the edge
                adjustmentFactor = 1 - distFromCenter / (riverWidth * widthFactor);
                adjustmentFactor = Math.min(0.5, Math.max(0, adjustmentFactor)); // Clamp to 0-0.5

                // Decrease elevation for points near the edge
                this.heightmapData[index] = height - (avgHeight - height) * adjustmentFactor;
              }
            }
          }
        }
      }
    }

    // Update the river feature bounds
    const paddingFactor = widthFactor > 1 ? widthFactor : 1;
    const widthPadding = ((bounds.maxX - bounds.minX) * (paddingFactor - 1)) / 2;
    const heightPadding = ((bounds.maxY - bounds.minY) * (paddingFactor - 1)) / 2;

    riverFeature.bounds = {
      minX: Math.max(0, bounds.minX - widthPadding),
      minY: Math.max(0, bounds.minY - heightPadding),
      maxX: Math.min(this.resolution.width - 1, bounds.maxX + widthPadding),
      maxY: Math.min(this.resolution.height - 1, bounds.maxY + heightPadding),
    };
  }

  /**
   * Apply elevation mask to specific areas
   * @private
   */
  private applyElevationMask(mask: Record<string, unknown>, factor: number): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    // This is a simplified placeholder implementation
    // In a real scenario, the mask would define specific regions to adjust

    // For demonstration purposes only
    console.log(`Applied elevation mask with factor ${factor}`);
  }

  /**
   * Apply elevation adjustment to a specific area
   * @private
   */
  private applyElevationAdjustment(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    factor: number
  ): void {
    if (!this.heightmapData || !this.resolution.width || !this.resolution.height) return;

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (x >= 0 && x < this.resolution.width && y >= 0 && y < this.resolution.height) {
          const index = y * this.resolution.width + x;

          // Scale elevation by the factor
          this.heightmapData[index] *= factor;
        }
      }
    }
  }

  /**
   * Restore historical elevations for Roman-era terrain
   * @private
   */
  private restoreHistoricalElevations(): void {
    // In a real implementation, this would use historical data sources
    // to restore specific topographical features known from archaeological records

    // Example: Restore Ludgate Hill elevation
    const ludgateHill = this.geologicalFeatures.get('hill_0'); // Simplified, would match by location in real implementation
    if (ludgateHill) {
      this.applyElevationAdjustment(ludgateHill.bounds, 1.2); // Increase height by 20%
    }

    // Example: Restore Cornhill elevation
    const cornhill = this.geologicalFeatures.get('hill_1'); // Simplified
    if (cornhill) {
      this.applyElevationAdjustment(cornhill.bounds, 1.15); // Increase height by 15%
    }
  }
}
