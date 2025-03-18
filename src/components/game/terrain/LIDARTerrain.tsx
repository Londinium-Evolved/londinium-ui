import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useLIDARTerrain } from '../../../hooks/useLIDARTerrain';
import { TerrainSettings } from '../../../utils/terrain/types';
import { useRootStore } from '../../../hooks/useRootStore';
import { Text } from '@react-three/drei';

interface LIDARTerrainProps {
  dataUrl: string;
  settings: TerrainSettings;
}

/**
 * Loading state information with progress tracking
 */
interface LoadingState {
  stage: 'idle' | 'fetching' | 'processing' | 'finalizing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

/**
 * Component for rendering terrain from LIDAR data
 */
export const LIDARTerrain: React.FC<LIDARTerrainProps> = ({ dataUrl, settings }) => {
  const { gameState } = useRootStore();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'idle',
    progress: 0,
    message: 'Initializing terrain system...',
  });

  // Use our custom hook
  const { isLoading, error, terrainGeometry, normalMap, loadTerrain, processingStatus } =
    useLIDARTerrain();

  // Update loading state based on processing status
  useEffect(() => {
    if (processingStatus) {
      setLoadingState((prevState) => ({
        ...prevState,
        stage: processingStatus.stage as LoadingState['stage'],
        progress: processingStatus.progress || prevState.progress,
        message: processingStatus.message || prevState.message,
      }));
    }
  }, [processingStatus]);

  // Define fetchAndLoadTerrain outside of useEffect
  const fetchAndLoadTerrain = useCallback(async () => {
    try {
      setLoadingState({
        stage: 'fetching',
        progress: 10,
        message: 'Fetching LIDAR data...',
      });

      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch LIDAR data: ${response.statusText}`);
      }

      // Calculate download progress if content length is available
      const contentLength = response.headers.get('content-length');
      let receivedLength = 0;

      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];

      if (reader && contentLength) {
        const contentSize = parseInt(contentLength, 10);

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          // Update progress
          const downloadProgress = Math.min(
            30,
            10 + Math.round((receivedLength / contentSize) * 20)
          );
          setLoadingState((prev) => ({
            ...prev,
            progress: downloadProgress,
            message: `Downloading LIDAR data (${Math.round(
              (receivedLength / contentSize) * 100
            )}%)...`,
          }));
        }

        // Concatenate chunks
        const chunksSize = chunks.reduce((acc, val) => acc + val.length, 0);
        const data = new Uint8Array(chunksSize);
        let position = 0;

        for (const chunk of chunks) {
          data.set(chunk, position);
          position += chunk.length;
        }

        const arrayBuffer = data.buffer;

        setLoadingState({
          stage: 'processing',
          progress: 30,
          message: 'Processing terrain data...',
        });

        await loadTerrain(arrayBuffer, settings);
      } else {
        // Fallback if streaming isn't supported
        const arrayBuffer = await response.arrayBuffer();

        setLoadingState({
          stage: 'processing',
          progress: 30,
          message: 'Processing terrain data...',
        });

        await loadTerrain(arrayBuffer, settings);
      }
    } catch (err) {
      console.error('Error loading terrain:', err);
      setLoadingState({
        stage: 'error',
        progress: 0,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [dataUrl, loadTerrain, settings]);

  // Load the terrain data
  useEffect(() => {
    fetchAndLoadTerrain();
  }, [fetchAndLoadTerrain]);

  // Create a material that adapts to the current era
  const [material, setMaterial] = useState<THREE.Material | null>(null);

  // Define createMaterial outside of useEffect
  const createMaterial = useCallback(() => {
    if (!normalMap || !gameState) return null;

    // Base material properties
    const materialProps = {
      side: THREE.DoubleSide,
      flatShading: false,
      normalMap,
      normalScale: new THREE.Vector2(1, 1),
      // Height-based coloring could be implemented here
    };

    let newMaterial;

    // Era-specific customizations
    if (gameState.currentEra === 'roman') {
      // Roman-era terrain appearance
      newMaterial = new THREE.MeshStandardMaterial({
        ...materialProps,
        color: new THREE.Color(0x8b7355), // Earthy brown
        roughness: 0.9,
        metalness: 0.1,
      });
    } else {
      // Cyberpunk-era terrain appearance
      newMaterial = new THREE.MeshStandardMaterial({
        ...materialProps,
        color: new THREE.Color(0x505050), // Urban gray
        roughness: 0.7,
        metalness: 0.3,
        // Could add emissive properties for cyberpunk style
      });
    }

    return newMaterial;
  }, [normalMap, gameState]);

  useEffect(() => {
    const newMaterial = createMaterial();
    if (!newMaterial) return;

    setMaterial((prev) => {
      if (prev) prev.dispose();
      return newMaterial;
    });
  }, [createMaterial]);

  // Create a visual loading indicator
  const LoadingIndicator = useMemo(() => {
    return (
      <group position={[0, 0, 5]}>
        {/* Loading ring */}
        <mesh rotation={[0, loadingState.progress / 50, 0]}>
          <torusGeometry args={[3, 0.5, 16, 50]} />
          <meshStandardMaterial
            color={loadingState.stage === 'error' ? '#ff3333' : '#4488ff'}
            wireframe={loadingState.stage === 'error'}
            emissive={loadingState.stage === 'error' ? '#ff0000' : '#0066ff'}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Progress indicator */}
        <mesh position={[0, 0, 0.5]}>
          <circleGeometry args={[2.5, 32]} />
          <meshStandardMaterial color='#333333' />
        </mesh>

        <mesh position={[0, 0, 0.6]} rotation={[0, 0, Math.PI * 1.5]}>
          <ringGeometry args={[2, 2.4, 32, 1, 0, Math.PI * 2 * (loadingState.progress / 100)]} />
          <meshStandardMaterial
            color={loadingState.stage === 'error' ? '#ff3333' : '#22aaff'}
            emissive={loadingState.stage === 'error' ? '#ff0000' : '#0066ff'}
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Status text */}
        <Text
          position={[0, -4, 0]}
          fontSize={0.8}
          color={loadingState.stage === 'error' ? '#ff3333' : '#ffffff'}
          anchorX='center'
          anchorY='middle'>
          {loadingState.message}
        </Text>

        {/* Loading percentage */}
        <Text
          position={[0, 0, 0.7]}
          fontSize={1.2}
          color='#ffffff'
          anchorX='center'
          anchorY='middle'>
          {loadingState.stage === 'error' ? 'ERROR' : `${loadingState.progress}%`}
        </Text>

        <pointLight
          intensity={2}
          distance={10}
          color={loadingState.stage === 'error' ? '#ff3333' : '#4488ff'}
        />
      </group>
    );
  }, [loadingState]);

  // Display a loading indicator or temporary terrain while data is being processed
  if (isLoading || !terrainGeometry || !material) {
    return (
      <group>
        {/* Placeholder wireframe terrain */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[settings.resolution.width, settings.resolution.height, 10, 10]} />
          <meshStandardMaterial
            color={gameState?.currentEra === 'roman' ? '#8b7355' : '#505050'}
            wireframe={true}
            opacity={0.3}
            transparent={true}
          />
        </mesh>

        {/* Loading indicator */}
        {LoadingIndicator}
      </group>
    );
  }

  // If there was an error but we still have geometry, show a warning
  if (error) {
    console.error('Terrain error:', error);

    // We can still show the terrain if we have it, but with a warning indicator
    return (
      <group>
        <mesh
          geometry={terrainGeometry}
          material={material}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat
          position={[0, 0, 0]}
        />

        {/* Warning indicator */}
        <group
          position={[settings.resolution.width / 2 - 5, 0, settings.resolution.height / 2 - 5]}>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[1, 10, 1]} />
            <meshStandardMaterial color='#ff3333' emissive='#ff0000' emissiveIntensity={0.8} />
          </mesh>
          <Text
            position={[0, 10, 0]}
            fontSize={5}
            color='#ff3333'
            anchorX='center'
            anchorY='middle'>
            ⚠️ {error}
          </Text>
        </group>
      </group>
    );
  }

  // Render the terrain with the appropriate material
  return (
    <mesh
      geometry={terrainGeometry}
      material={material}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat
      position={[0, 0, 0]}
    />
  );
};

/**
 * Default export with loading handler
 */
export default function TerrainWithLoading(props: LIDARTerrainProps) {
  return <LIDARTerrain {...props} />;
}
