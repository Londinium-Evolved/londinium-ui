/**
 * WebWorker for terrain processing operations
 * This offloads computationally expensive tasks from the main thread
 */

import { fromArrayBuffer } from 'geotiff';
import { TerrainWorkerMessageType } from './types';
import { resampleHeightmap, generateNormalMap } from './terrainUtils';

// No longer need the local constant as we're importing it
// const NODATA_VALUE = 32768;

/**
 * Interface for detailed error information
 */
interface DetailedErrorInfo {
  message: string;
  type: string;
  stack?: string;
  operation: string;
  stage: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Create a detailed error object with additional context
 */
function createDetailedError(error: unknown, operation: string, stage: string): DetailedErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.name : 'UnknownError';
  const errorStack = error instanceof Error ? error.stack : undefined;

  return {
    message: errorMessage,
    type: errorType,
    stack: errorStack,
    operation,
    stage,
    timestamp: new Date().toISOString(),
    details:
      error instanceof Error && 'details' in error
        ? (error as Error & { details?: Record<string, unknown> }).details
        : undefined,
  };
}

/**
 * Validate worker message data with detailed error reporting
 */
function validateMessageData(type: string, data: Record<string, unknown>): void {
  switch (type) {
    case TerrainWorkerMessageType.PROCESS_TIFF:
      if (!data) {
        throw Object.assign(new Error('No data provided for TIFF processing'), {
          details: { missingParam: 'data' },
        });
      }
      if (
        !data.tiffData ||
        !(data.tiffData instanceof ArrayBuffer) ||
        data.tiffData.byteLength === 0
      ) {
        throw Object.assign(new Error('Invalid or empty TIFF data provided'), {
          details: {
            provided: data.tiffData
              ? `ArrayBuffer of ${(data.tiffData as ArrayBuffer).byteLength} bytes`
              : typeof data.tiffData,
            required: 'Non-empty ArrayBuffer',
          },
        });
      }
      if (
        !data.targetResolution ||
        typeof data.targetResolution !== 'object' ||
        !(data.targetResolution as Record<string, unknown>).width ||
        !(data.targetResolution as Record<string, unknown>).height
      ) {
        throw Object.assign(new Error('Invalid target resolution specified'), {
          details: {
            provided: JSON.stringify(data.targetResolution),
            required: '{ width: number, height: number } with positive values',
          },
        });
      }
      break;

    case TerrainWorkerMessageType.RESAMPLE:
      if (!data.originalData || !(data.originalData instanceof Uint16Array)) {
        throw Object.assign(new Error('Invalid or missing original data array for resampling'), {
          details: {
            provided: data.originalData
              ? `${(data.originalData as object).constructor.name} of length ${
                  (data.originalData as ArrayLike<unknown>).length
                }`
              : typeof data.originalData,
            required: 'Uint16Array',
          },
        });
      }
      if (!Number.isFinite(data.originalWidth as number) || (data.originalWidth as number) <= 0) {
        throw Object.assign(new Error('Invalid original width for resampling'), {
          details: { provided: data.originalWidth, required: 'Positive number' },
        });
      }
      if (!Number.isFinite(data.originalHeight as number) || (data.originalHeight as number) <= 0) {
        throw Object.assign(new Error('Invalid original height for resampling'), {
          details: { provided: data.originalHeight, required: 'Positive number' },
        });
      }
      if (!Number.isFinite(data.targetWidth as number) || (data.targetWidth as number) <= 0) {
        throw Object.assign(new Error('Invalid target width for resampling'), {
          details: { provided: data.targetWidth, required: 'Positive number' },
        });
      }
      if (!Number.isFinite(data.targetHeight as number) || (data.targetHeight as number) <= 0) {
        throw Object.assign(new Error('Invalid target height for resampling'), {
          details: { provided: data.targetHeight, required: 'Positive number' },
        });
      }
      break;

    case TerrainWorkerMessageType.GENERATE_NORMAL_MAP:
      if (!data.heightmapData || !(data.heightmapData instanceof Float32Array)) {
        throw Object.assign(
          new Error('Invalid or missing heightmap data for normal map generation'),
          {
            details: {
              provided: data.heightmapData
                ? `${(data.heightmapData as object).constructor.name} of length ${
                    (data.heightmapData as ArrayLike<unknown>).length
                  }`
                : typeof data.heightmapData,
              required: 'Float32Array',
            },
          }
        );
      }
      if (!Number.isFinite(data.width as number) || (data.width as number) <= 0) {
        throw Object.assign(new Error('Invalid width for normal map generation'), {
          details: { provided: data.width, required: 'Positive number' },
        });
      }
      if (!Number.isFinite(data.height as number) || (data.height as number) <= 0) {
        throw Object.assign(new Error('Invalid height for normal map generation'), {
          details: { provided: data.height, required: 'Positive number' },
        });
      }
      break;
  }
}

self.onmessage = async (event) => {
  const { type, data } = event.data;
  let operationStage = 'initialization';

  try {
    // Log operation start for debugging
    console.debug(`Terrain worker starting operation: ${type}`);

    // Validate incoming data before processing
    validateMessageData(type, data);
    operationStage = 'processing';

    switch (type) {
      case TerrainWorkerMessageType.PROCESS_TIFF: {
        await processTiff(data.tiffData, data.targetResolution);
        break;
      }

      case TerrainWorkerMessageType.RESAMPLE: {
        operationStage = 'resampling';
        const resampledData = resampleHeightmap(
          data.originalData,
          data.originalWidth,
          data.originalHeight,
          data.targetWidth,
          data.targetHeight
        );

        operationStage = 'result-transfer';
        self.postMessage(
          {
            type: TerrainWorkerMessageType.RESULT,
            data: { heightmapData: resampledData.buffer },
            success: true,
          },
          { transfer: [resampledData.buffer] }
        );
        break;
      }

      case TerrainWorkerMessageType.APPLY_ADJUSTMENTS:
        // To be implemented
        throw Object.assign(
          new Error('APPLY_ADJUSTMENTS operation not yet implemented in terrain worker'),
          { details: { status: 'not_implemented' } }
        );

      case TerrainWorkerMessageType.GENERATE_NORMAL_MAP: {
        operationStage = 'normal-map-generation';
        const normalMapData = generateNormalMap(data.heightmapData, data.width, data.height);

        operationStage = 'result-transfer';
        self.postMessage(
          {
            type: TerrainWorkerMessageType.RESULT,
            data: { normalMapData: normalMapData.buffer },
            success: true,
          },
          { transfer: [normalMapData.buffer] }
        );
        break;
      }

      default:
        throw Object.assign(new Error(`Unknown message type: ${type}`), {
          details: { availableTypes: Object.values(TerrainWorkerMessageType) },
        });
    }

    // Log operation completion
    console.debug(`Terrain worker completed operation: ${type}`);
  } catch (error: unknown) {
    // Create detailed error report
    const errorData = createDetailedError(error, type, operationStage);

    // Log error in worker for debugging
    console.error(`Terrain worker error during ${type} (${operationStage}):`, errorData);

    // Send error back to main thread
    self.postMessage({
      type: TerrainWorkerMessageType.ERROR,
      data: errorData,
      success: false,
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
  let processingStage = 'preparation';

  try {
    // Parse TIFF data
    processingStage = 'tiff-parsing';
    const tiff = await fromArrayBuffer(tiffData);
    if (!tiff) {
      throw Object.assign(
        new Error('Failed to parse TIFF from ArrayBuffer - invalid file format'),
        { details: { dataSize: tiffData.byteLength } }
      );
    }

    // Get image from TIFF
    processingStage = 'image-extraction';
    const image = await tiff.getImage();
    if (!image) {
      throw Object.assign(new Error('Could not extract image from TIFF file'), {
        details: { tiffInfo: 'TIFF parsed but no image could be extracted' },
      });
    }

    // Extract raster data
    processingStage = 'raster-reading';
    const rasters = await image.readRasters();
    if (!rasters || rasters.length === 0) {
      throw Object.assign(new Error('No raster data found in TIFF image'), {
        details: { imageInfo: { width: image.getWidth(), height: image.getHeight() } },
      });
    }

    // Process dimensions
    processingStage = 'dimensions-verification';
    const originalData = rasters[0] as Uint16Array;
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    if (originalWidth <= 0 || originalHeight <= 0) {
      throw Object.assign(
        new Error(`Invalid dimensions in TIFF: ${originalWidth}x${originalHeight}`),
        { details: { width: originalWidth, height: originalHeight } }
      );
    }

    // Log data characteristics for debugging
    console.debug(
      `TIFF data loaded: ${originalWidth}x${originalHeight}, resampling to ${targetResolution.width}x${targetResolution.height}`
    );

    // Perform resampling
    processingStage = 'resampling';
    const heightmapData = resampleHeightmap(
      originalData,
      originalWidth,
      originalHeight,
      targetResolution.width,
      targetResolution.height
    );

    // Send result back to main thread
    processingStage = 'result-transfer';
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
          metadata: {
            processedAt: new Date().toISOString(),
            dataStats: {
              min: Math.min(...Array.from(heightmapData)),
              max: Math.max(...Array.from(heightmapData)),
            },
          },
        },
        success: true,
      },
      { transfer: [heightmapData.buffer] }
    );
  } catch (error: unknown) {
    // Wrap error with context about which processing stage failed
    throw Object.assign(
      new Error(
        `Failed to process TIFF during ${processingStage}: ${
          error instanceof Error ? error.message : String(error)
        }`
      ),
      {
        details: {
          stage: processingStage,
          originalError: error instanceof Error ? error.message : String(error),
          targetResolution,
        },
      }
    );
  }
}

// The resampleHeightmap and generateNormalMap functions have been moved to terrainUtils.ts
// and are now imported at the top of this file
