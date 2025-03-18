/**
 * WebWorker for terrain processing operations
 * This offloads computationally expensive tasks from the main thread
 */

import { fromArrayBuffer } from 'geotiff';
import { TerrainWorkerMessageType } from './types';
import { resampleHeightmap, generateNormalMap } from './terrainUtils';

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
        if (
          !data.originalData ||
          !data.originalWidth ||
          !data.originalHeight ||
          !data.targetWidth ||
          !data.targetHeight
        ) {
          throw new Error(
            'Incomplete data provided for resampling operation. Please ensure all parameters are specified.'
          );
        }

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
        throw new Error('APPLY_ADJUSTMENTS operation not yet implemented in terrain worker');
        break;

      case TerrainWorkerMessageType.GENERATE_NORMAL_MAP: {
        if (!data.heightmapData || !data.width || !data.height) {
          throw new Error('Missing heightmap data or dimensions for normal map generation');
        }

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
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Send a more detailed error message back to the main thread
    self.postMessage({
      type: TerrainWorkerMessageType.ERROR,
      data: {
        message: errorMessage,
        type: errorType,
        stack: errorStack,
        operation: type,
        timestamp: new Date().toISOString(),
      },
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
  if (!tiffData || tiffData.byteLength === 0) {
    throw new Error('Invalid or empty TIFF data provided');
  }

  if (!targetResolution || !targetResolution.width || !targetResolution.height) {
    throw new Error('Invalid target resolution specified');
  }

  try {
    const tiff = await fromArrayBuffer(tiffData);
    if (!tiff) {
      throw new Error('Failed to parse TIFF from ArrayBuffer - invalid file format');
    }

    const image = await tiff.getImage();
    if (!image) {
      throw new Error('Could not extract image from TIFF file');
    }

    const rasters = await image.readRasters();
    if (!rasters || rasters.length === 0) {
      throw new Error('No raster data found in TIFF image');
    }

    // Extract and normalize elevation data from first band
    const originalData = rasters[0] as Uint16Array;
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    if (originalWidth <= 0 || originalHeight <= 0) {
      throw new Error(`Invalid dimensions in TIFF: ${originalWidth}x${originalHeight}`);
    }

    // Resample to target resolution using bilinear interpolation using the shared utility function
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
          originalDimensions: {
            width: originalWidth,
            height: originalHeight,
          },
        },
      },
      { transfer: [heightmapData.buffer] }
    );
  } catch (error: unknown) {
    // Provide more specific error context
    let errorContext = 'Unknown processing stage';
    if (error instanceof Error) {
      // Try to determine which processing stage failed
      if (error.message.includes('fromArrayBuffer')) {
        errorContext = 'TIFF parsing';
      } else if (error.message.includes('getImage')) {
        errorContext = 'Image extraction';
      } else if (error.message.includes('readRasters')) {
        errorContext = 'Raster data reading';
      } else if (error.message.includes('resample')) {
        errorContext = 'Heightmap resampling';
      }
    }

    throw new Error(
      `Failed to process TIFF (${errorContext}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// The resampleHeightmap and generateNormalMap functions have been moved to terrainUtils.ts
// and are now imported at the top of this file
