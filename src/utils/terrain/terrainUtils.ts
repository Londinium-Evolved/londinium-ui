import { HEIGHT_SCALE, NODATA_VALUE } from './types';

/**
 * Generic memoization utility that caches function results based on arguments
 * @param fn The function to memoize
 * @param keyFn Optional function to generate a cache key from arguments
 * @param maxSize Optional maximum cache size (number of entries)
 * @returns Memoized function with the same signature as the original
 */
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  keyFn: (...args: Args) => string = (...args) => JSON.stringify(args),
  maxSize: number = 20
): (...args: Args) => Result {
  const cache = new Map<string, Result>();

  const memoized = (...args: Args): Result => {
    const key = keyFn(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    // Manage cache size - remove oldest entries if we exceed maxSize
    if (maxSize > 0 && cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, result);
    return result;
  };

  // Add a method to clear the cache
  (memoized as { clearCache?: () => void }).clearCache = () => cache.clear();

  return memoized;
}

// Cache functions using the typed memoize utility
export const resampleHeightmap = memoize<
  [Uint16Array, number, number, number, number],
  Float32Array
>(
  (
    originalData: Uint16Array,
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number
  ): Float32Array => {
    // Validate input parameters
    if (!originalData || originalData.length === 0) {
      throw new Error('No source data provided for resampling');
    }

    if (originalWidth <= 0 || originalHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
      throw new Error(
        `Invalid dimensions for resampling: source ${originalWidth}x${originalHeight}, target ${targetWidth}x${targetHeight}`
      );
    }

    if (originalData.length !== originalWidth * originalHeight) {
      throw new Error(
        `Data length mismatch: expected ${originalWidth * originalHeight} elements, got ${
          originalData.length
        }`
      );
    }

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
  },
  // Custom key generation function that's more efficient for heightmap data
  (originalData, originalWidth, originalHeight, targetWidth, targetHeight) =>
    `${originalWidth}x${originalHeight}-${targetWidth}x${targetHeight}-${originalData.length}`
);

export const generateNormalMap = memoize<[Float32Array, number, number], Uint8Array>(
  (heightmapData: Float32Array, width: number, height: number): Uint8Array => {
    // Validate input parameters
    if (!heightmapData || heightmapData.length === 0) {
      throw new Error('No heightmap data provided for normal map generation');
    }

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid dimensions for normal map: ${width}x${height}`);
    }

    if (heightmapData.length !== width * height) {
      throw new Error(
        `Heightmap data length mismatch: expected ${width * height} elements, got ${
          heightmapData.length
        }`
      );
    }

    const normalMapData = new Uint8Array(width * height * 4);

    // For each pixel in the heightmap
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const normalIndex = index * 4;

        // Get heights of neighboring pixels
        const left = x > 0 ? heightmapData[index - 1] : heightmapData[index];
        const right = x < width - 1 ? heightmapData[index + 1] : heightmapData[index];
        const up = y > 0 ? heightmapData[index - width] : heightmapData[index];
        const down = y < height - 1 ? heightmapData[index + width] : heightmapData[index];

        // Calculate normal using central differences
        const dzdx = (right - left) * 2.0;
        const dzdy = (down - up) * 2.0;

        // Create normal vector (not using Three.js in worker)
        // Normalize the vector: [dx, dy, 8] / length
        const dx = -dzdx;
        const dy = -dzdy;
        const dz = 8.0;

        // Calculate length
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Normalize
        const nx = dx / length;
        const ny = dy / length;
        const nz = dz / length;

        // Pack into RGB format (0-255)
        normalMapData[normalIndex] = Math.floor((nx * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        normalMapData[normalIndex + 3] = 255; // Alpha channel
      }
    }

    return normalMapData;
  },
  // Custom key generation function for normal maps
  (heightmapData, width, height) => `${width}x${height}-${heightmapData.length}`
);
