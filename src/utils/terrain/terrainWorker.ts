/**
 * WebWorker for terrain processing operations
 * This offloads computationally expensive tasks from the main thread
 */

import { fromArrayBuffer } from 'geotiff';
import { TerrainWorkerMessageType, HEIGHT_SCALE, NODATA_VALUE } from './types';

// No longer need the local constant as we're importing it
// const NODATA_VALUE = 32768;

self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case TerrainWorkerMessageType.PROCESS_TIFF: {
        await processTiff(data.tiffData, data.targetResolution);
        break;
      }

      case TerrainWorkerMessageType.RESAMPLE: {
        const resampledData = resampleHeightmap(
          data.originalData,
          data.originalWidth,
          data.originalHeight,
          data.targetWidth,
          data.targetHeight
        );

        self.postMessage(
          {
            type: TerrainWorkerMessageType.RESULT,
            data: { heightmapData: resampledData.buffer },
          },
          { transfer: [resampledData.buffer] }
        );
        break;
      }

      case TerrainWorkerMessageType.APPLY_ADJUSTMENTS:
        // To be implemented
        break;

      case TerrainWorkerMessageType.GENERATE_NORMAL_MAP: {
        const normalMapData = generateNormalMap(data.heightmapData, data.width, data.height);

        self.postMessage(
          {
            type: TerrainWorkerMessageType.RESULT,
            data: { normalMapData: normalMapData.buffer },
          },
          { transfer: [normalMapData.buffer] }
        );
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: TerrainWorkerMessageType.ERROR,
      data: errorMessage,
    });
  }
};

/**
 * Process GeoTIFF data in the worker
 */
async function processTiff(
  tiffData: ArrayBuffer,
  targetResolution: { width: number; height: number }
) {
  try {
    const tiff = await fromArrayBuffer(tiffData);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();

    // Extract and normalize elevation data from first band
    const originalData = rasters[0] as Uint16Array;
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // Resample to target resolution using bilinear interpolation
    const heightmapData = resampleHeightmap(
      originalData,
      originalWidth,
      originalHeight,
      targetResolution.width,
      targetResolution.height
    );

    // Transfer the buffer back to the main thread with the new message type
    self.postMessage(
      {
        type: TerrainWorkerMessageType.PROCESS_TIFF_DONE,
        data: {
          heightmapData: heightmapData.buffer,
          width: targetResolution.width,
          height: targetResolution.height,
        },
      },
      { transfer: [heightmapData.buffer] }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: TerrainWorkerMessageType.ERROR,
      data: `Failed to process TIFF: ${errorMessage}`,
    });
  }
}

/**
 * Resample heightmap using bilinear interpolation
 */
function resampleHeightmap(
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
 * Generate normal map from heightmap
 */
function generateNormalMap(heightmapData: Float32Array, width: number, height: number): Uint8Array {
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
}
