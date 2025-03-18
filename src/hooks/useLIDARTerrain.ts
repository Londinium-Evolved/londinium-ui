import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useRootStore } from './useRootStore';
import { LIDARTerrainProcessor } from '../utils/terrain/LIDARTerrainProcessor';
import { TerrainSettings } from '../utils/terrain/types';

/**
 * Processing status interface for tracking progress
 */
export interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
  timestamp?: string;
}

/**
 * Interface for the hook's return object
 */
interface UseLIDARTerrainReturn {
  isLoading: boolean;
  error: string | null;
  terrainGeometry: THREE.PlaneGeometry | null;
  normalMap: THREE.DataTexture | null;
  processor: LIDARTerrainProcessor | null;
  processingStatus: ProcessingStatus | null;
  loadTerrain: (tiffData: ArrayBuffer, settings: TerrainSettings) => Promise<void>;
}

/**
 * Hook for using the LIDARTerrainProcessor within React components
 */
export function useLIDARTerrain(): UseLIDARTerrainReturn {
  const { gameState } = useRootStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [terrainGeometry, setTerrainGeometry] = useState<THREE.PlaneGeometry | null>(null);
  const [normalMap, setNormalMap] = useState<THREE.DataTexture | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);

  // Use ref to maintain processor instance across renders
  const processorRef = useRef<LIDARTerrainProcessor | null>(null);

  // Initialize processor on mount
  useEffect(() => {
    processorRef.current = new LIDARTerrainProcessor();

    // Listen for worker messages with status updates
    if (processorRef.current) {
      // Fix the event listener to properly handle CustomEvent with status detail
      processorRef.current.addEventListener('processingStatusUpdate', ((event: CustomEvent) => {
        setProcessingStatus(event.detail);
      }) as EventListener);
    }

    // Clean up on unmount
    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
      }

      // Clean up Three.js resources
      if (terrainGeometry) {
        terrainGeometry.dispose();
      }
      if (normalMap) {
        normalMap.dispose();
      }
    };
  }, []);

  // Listen for era changes and update terrain
  useEffect(() => {
    if (!processorRef.current || !gameState) return;

    // When era changes, update the terrain
    // This assumes the terrain data is already loaded
    const updateTerrainForEra = () => {
      if (!processorRef.current) return;

      try {
        setProcessingStatus({
          stage: 'adjusting',
          progress: 70,
          message: `Applying ${gameState.currentEra} era terrain adjustments...`,
        });

        processorRef.current.applyHistoricalAdjustments(gameState.currentEra);

        // Regenerate geometry and normal map if we have data
        if (processorRef.current.getHeightmapData()) {
          setProcessingStatus({
            stage: 'rebuilding',
            progress: 80,
            message: 'Rebuilding terrain geometry...',
          });

          const newGeometry = processorRef.current.createTerrainGeometry(10); // Example segment size
          const newNormalMap = processorRef.current.generateNormalMap();

          // Update state
          setTerrainGeometry((prev) => {
            if (prev) prev.dispose();
            return newGeometry;
          });
          setNormalMap((prev) => {
            if (prev) prev.dispose();
            return newNormalMap;
          });

          setProcessingStatus({
            stage: 'complete',
            progress: 100,
            message: 'Terrain processing complete',
          });
        }
      } catch (err) {
        setError(
          `Failed to update terrain for era: ${err instanceof Error ? err.message : String(err)}`
        );
        setProcessingStatus({
          stage: 'error',
          progress: 0,
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };

    // Update when the era changes
    updateTerrainForEra();

    // No need for cleanup as we're not setting up new listeners
  }, [gameState?.currentEra, gameState?.eraProgress]);

  /**
   * Load terrain data from a GeoTIFF file
   */
  const loadTerrain = useCallback(
    async (tiffData: ArrayBuffer, settings: TerrainSettings) => {
      if (!processorRef.current) {
        setError('Terrain processor not initialized');
        setProcessingStatus({
          stage: 'error',
          progress: 0,
          message: 'Error: Terrain processor not initialized',
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Initial download complete
        setProcessingStatus({
          stage: 'initializing',
          progress: 20,
          message: 'Initializing LIDAR processor...',
        });

        // Add a small delay to show initialization progress
        await new Promise((resolve) => setTimeout(resolve, 300));

        setProcessingStatus({
          stage: 'processing',
          progress: 40,
          message: 'Processing LIDAR data...',
        });

        // Process the LIDAR data
        await processorRef.current.processLIDARData(tiffData, settings.resolution);

        setProcessingStatus({
          stage: 'adjusting',
          progress: 60,
          message: 'Applying historical adjustments...',
        });

        // Apply historical adjustments based on current era
        if (gameState) {
          processorRef.current.applyHistoricalAdjustments(gameState.currentEra);
        }

        setProcessingStatus({
          stage: 'creating-geometry',
          progress: 70,
          message: 'Creating terrain geometry...',
        });

        // Create geometry and normal map
        const newGeometry = processorRef.current.createTerrainGeometry(settings.segmentSize);

        setProcessingStatus({
          stage: 'generating-normals',
          progress: 80,
          message: 'Generating normal maps...',
        });

        const newNormalMap = processorRef.current.generateNormalMap();

        setProcessingStatus({
          stage: 'finalizing',
          progress: 90,
          message: 'Finalizing terrain...',
        });

        // Clean up old resources before setting new ones
        if (terrainGeometry) terrainGeometry.dispose();
        if (normalMap) normalMap.dispose();

        // Update state
        setTerrainGeometry(newGeometry);
        setNormalMap(newNormalMap);

        setProcessingStatus({
          stage: 'complete',
          progress: 100,
          message: 'Terrain processing complete',
        });

        // Keep the complete message visible briefly before hiding
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        setError(`Failed to load terrain: ${err instanceof Error ? err.message : String(err)}`);
        setProcessingStatus({
          stage: 'error',
          progress: 0,
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [gameState]
  );

  return {
    isLoading,
    error,
    terrainGeometry,
    normalMap,
    processor: processorRef.current,
    processingStatus,
    loadTerrain,
  };
}
