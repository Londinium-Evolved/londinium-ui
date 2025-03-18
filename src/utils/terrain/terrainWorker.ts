/**
 * WebWorker for terrain processing operations
 * This offloads computationally expensive tasks from the main thread
 */

import { TerrainWorkerMessageType } from './types';
import { fromArrayBuffer } from 'geotiff';
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

/**
 * Process requests in the worker thread
 * Each worker handles terrain processing operations offloaded from the main thread
 */

// Track the worker's active status
let isProcessing = false;

// Store active task information for diagnostics
let activeTask: {
  type: string;
  startTime: number;
  progress: number;
} | null = null;

/**
 * Handle errors in a structured way
 */
function handleError(message: string, operation: string, stack?: string): void {
  postMessage({
    type: 'error',
    data: {
      message,
      operation,
      timestamp: new Date().toISOString(),
      stack,
      type: 'terrain_worker_error',
    },
  });
}

/**
 * Report processing progress back to main thread
 */
function reportProgress(operation: string, progress: number, message?: string): void {
  postMessage({
    type: 'progress',
    data: {
      operation,
      progress,
      message,
      timestamp: new Date().toISOString(),
    },
  });

  // Update active task info
  if (activeTask) {
    activeTask.progress = progress;
  }
}

/**
 * Validates worker message to ensure it has the required fields
 */
function validateWorkerMessage(
  event: MessageEvent
): { type: TerrainWorkerMessageType; data: unknown } | null {
  if (!event || !event.data) {
    handleError('Invalid worker message: empty or missing data', 'validate_message');
    return null;
  }

  const { type, data } = event.data;

  if (!type) {
    handleError('Invalid worker message: missing type field', 'validate_message');
    return null;
  }

  return { type, data };
}

/**
 * Process a GeoTIFF file containing LIDAR data
 */
async function processTiff(data: unknown): Promise<void> {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('No data provided for processing');
    }

    // Type assertion after validation
    const typedData = data as {
      tiffData: ArrayBuffer;
      targetResolution: { width: number; height: number };
    };
    const { tiffData, targetResolution } = typedData;

    if (!tiffData) {
      throw new Error('No TIFF data provided');
    }

    if (!targetResolution || !targetResolution.width || !targetResolution.height) {
      throw new Error('Invalid target resolution');
    }

    // Process TIFF data
    reportProgress('process_tiff', 10, 'Loading GeoTIFF...');
    const tiff = await fromArrayBuffer(tiffData);

    reportProgress('process_tiff', 30, 'Reading TIFF data...');
    const image = await tiff.getImage();
    const rasters = await image.readRasters();

    // Extract raster data
    reportProgress('process_tiff', 50, 'Extracting height data...');
    const originalData = rasters[0] as Uint16Array;
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // Validate data dimensions
    if (originalWidth <= 0 || originalHeight <= 0) {
      throw new Error(`Invalid TIFF dimensions: ${originalWidth}x${originalHeight}`);
    }

    reportProgress('process_tiff', 60, 'Resampling heightmap...');

    // Use parallel processing for large heightmaps
    let heightmapData: Float32Array;

    // For large heightmaps, process in chunks
    if (targetResolution.width * targetResolution.height > 1000000) {
      heightmapData = await processHeightmapInParallel(
        originalData,
        originalWidth,
        originalHeight,
        targetResolution.width,
        targetResolution.height
      );
    } else {
      // For smaller heightmaps, use the standard algorithm
      heightmapData = resampleHeightmap(
        originalData,
        originalWidth,
        originalHeight,
        targetResolution.width,
        targetResolution.height
      );
    }

    reportProgress('process_tiff', 90, 'Generating normal map...');

    // Generate normal map
    const normalMap = generateNormalMap(
      heightmapData,
      targetResolution.width,
      targetResolution.height
    );

    reportProgress('process_tiff', 100, 'Processing complete');

    // Return processed data to main thread
    // Use correct transferable format for postMessage
    postMessage(
      {
        type: 'process_tiff_done',
        data: {
          heightmapData: heightmapData.buffer,
          normalMap: normalMap.buffer,
          width: targetResolution.width,
          height: targetResolution.height,
        },
      },
      {
        transfer: [heightmapData.buffer, normalMap.buffer],
      }
    );
  } catch (error) {
    console.error('Terrain worker error:', error);
    handleError(
      error instanceof Error ? error.message : String(error),
      'process_tiff',
      error instanceof Error ? error.stack : undefined
    );
  }
}

/**
 * Process a heightmap in parallel chunks using the resampleHeightmap function
 * This divides the work into sections to better utilize CPU resources
 */
async function processHeightmapInParallel(
  originalData: Uint16Array,
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number
): Promise<Float32Array> {
  // Create the output heightmap
  const heightmapData = new Float32Array(targetWidth * targetHeight);

  // Determine how many chunks to divide the processing into
  // More chunks means more overhead but better concurrency
  const numChunks = navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 8) : 4;

  // Calculate the height of each chunk
  const chunkHeight = Math.ceil(targetHeight / numChunks);

  // Process each chunk
  const chunkPromises: Promise<{ startY: number; data: Float32Array }>[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startY = i * chunkHeight;
    const endY = Math.min(startY + chunkHeight, targetHeight);
    const chunkTargetHeight = endY - startY;

    // Skip empty chunks
    if (chunkTargetHeight <= 0) continue;

    // Calculate the source area in the original heightmap
    const originalStartY = Math.floor((startY * originalHeight) / targetHeight);
    const originalEndY = Math.ceil((endY * originalHeight) / targetHeight);
    const originalChunkHeight = originalEndY - originalStartY;

    // Create a view of the original data for this chunk
    const chunkOriginalData = new Uint16Array(originalWidth * originalChunkHeight);

    // Copy data for this chunk
    for (let y = 0; y < originalChunkHeight; y++) {
      const srcY = originalStartY + y;
      if (srcY < originalHeight) {
        const srcOffset = srcY * originalWidth;
        const destOffset = y * originalWidth;
        for (let x = 0; x < originalWidth; x++) {
          chunkOriginalData[destOffset + x] = originalData[srcOffset + x];
        }
      }
    }

    // Process this chunk (as a promise to allow parallel execution)
    const chunkPromise = new Promise<{ startY: number; data: Float32Array }>((resolve) => {
      // Process the chunk
      const chunkResult = resampleHeightmap(
        chunkOriginalData,
        originalWidth,
        originalChunkHeight,
        targetWidth,
        chunkTargetHeight
      );

      // Return the result along with its position information
      resolve({
        startY,
        data: chunkResult,
      });
    });

    chunkPromises.push(chunkPromise);

    // Report progress for each chunk
    reportProgress(
      'process_tiff_parallel',
      60 + Math.round((i / numChunks) * 25),
      `Processing chunk ${i + 1}/${numChunks}...`
    );
  }

  // Wait for all chunks to complete
  const results = await Promise.all(chunkPromises);

  // Combine the results into the final heightmap
  for (const { startY, data } of results) {
    const chunkHeight = data.length / targetWidth;

    for (let y = 0; y < chunkHeight; y++) {
      const destY = startY + y;
      if (destY < targetHeight) {
        const srcOffset = y * targetWidth;
        const destOffset = destY * targetWidth;

        for (let x = 0; x < targetWidth; x++) {
          heightmapData[destOffset + x] = data[srcOffset + x];
        }
      }
    }
  }

  return heightmapData;
}

/**
 * Initialize the worker
 */
self.onmessage = async (event: MessageEvent) => {
  try {
    // Skip if we're already processing something
    if (isProcessing) {
      postMessage({
        type: 'worker_busy',
        data: {
          message: 'Worker is busy processing another request',
          currentOperation: activeTask?.type,
          progress: activeTask?.progress,
          startTime: activeTask?.startTime,
        },
      });
      return;
    }

    // Validate the incoming message
    const message = validateWorkerMessage(event);
    if (!message) return;

    const { type, data } = message;

    // Mark worker as busy and store task info
    isProcessing = true;
    activeTask = {
      type: type,
      startTime: Date.now(),
      progress: 0,
    };

    // Process the message based on its type
    switch (type) {
      case 'process_tiff':
        await processTiff(data);
        break;
      default:
        handleError(`Unknown message type: ${type}`, 'handle_message');
    }
  } catch (error) {
    console.error('Worker message handler error:', error);
    handleError(
      error instanceof Error ? error.message : String(error),
      'worker_message_handler',
      error instanceof Error ? error.stack : undefined
    );
  } finally {
    // Mark worker as available again
    isProcessing = false;
    activeTask = null;
  }
};

// The resampleHeightmap and generateNormalMap functions have been moved to terrainUtils.ts
// and are now imported at the top of this file
