import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useRootStore } from './useRootStore';
import { LIDARTerrainProcessor } from '../utils/terrain/LIDARTerrainProcessor';
import { Resolution, TerrainSettings } from '../utils/terrain/types';

/**
 * Interface for the hook's return object
 */
interface UseLIDARTerrainReturn {
  isLoading: boolean;
  error: string | null;
  terrainGeometry: THREE.PlaneGeometry | null;
  normalMap: THREE.DataTexture | null;
  processor: LIDARTerrainProcessor | null;
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
  
  // Use ref to maintain processor instance across renders
  const processorRef = useRef<LIDARTerrainProcessor | null>(null);
  
  // Initialize processor on mount
  useEffect(() => {
    processorRef.current = new LIDARTerrainProcessor();
    
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
        processorRef.current.applyHistoricalAdjustments(gameState.currentEra);
        
        // Regenerate geometry and normal map if we have data
        if (processorRef.current.getHeightmapData()) {
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
        }
      } catch (err) {
        setError(`Failed to update terrain for era: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Update when the era changes
    updateTerrainForEra();
    
    // No need for cleanup as we're not setting up new listeners
  }, [gameState?.currentEra, gameState?.eraProgress]);
  
  /**
   * Load terrain data from a GeoTIFF file
   */
  const loadTerrain = useCallback(async (tiffData: ArrayBuffer, settings: TerrainSettings) => {
    if (!processorRef.current) {
      setError('Terrain processor not initialized');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Process the LIDAR data
      await processorRef.current.processLIDARData(tiffData, settings.resolution);
      
      // Apply historical adjustments based on current era
      if (gameState) {
        processorRef.current.applyHistoricalAdjustments(gameState.currentEra);
      }
      
      // Create geometry and normal map
      const newGeometry = processorRef.current.createTerrainGeometry(settings.segmentSize);
      const newNormalMap = processorRef.current.generateNormalMap();
      
      // Clean up old resources before setting new ones
      if (terrainGeometry) terrainGeometry.dispose();
      if (normalMap) normalMap.dispose();
      
      // Update state
      setTerrainGeometry(newGeometry);
      setNormalMap(newNormalMap);
    } catch (err) {
      setError(`Failed to load terrain: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [gameState]);
  
  return {
    isLoading,
    error,
    terrainGeometry,
    normalMap,
    processor: processorRef.current,
    loadTerrain
  };
}