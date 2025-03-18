import React, { useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useLIDARTerrain } from '../../../hooks/useLIDARTerrain';
import { TerrainSettings } from '../../../utils/terrain/types';
import { useRootStore } from '../../../hooks/useRootStore';

interface LIDARTerrainProps {
  dataUrl: string;
  settings: TerrainSettings;
}

/**
 * Component for rendering terrain from LIDAR data
 */
export const LIDARTerrain: React.FC<LIDARTerrainProps> = ({ dataUrl, settings }) => {
  const { gameState } = useRootStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Use our custom hook
  const { isLoading, error, terrainGeometry, normalMap, loadTerrain } = useLIDARTerrain();

  // Define fetchAndLoadTerrain outside of useEffect
  const fetchAndLoadTerrain = useCallback(async () => {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch LIDAR data: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await loadTerrain(arrayBuffer, settings);
      setIsInitializing(false);
    } catch (err) {
      console.error('Error loading terrain:', err);
      setIsInitializing(false);
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

  // Display a loading indicator or temporary terrain while data is being processed
  if (isInitializing || isLoading || !terrainGeometry || !material) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[settings.resolution.width, settings.resolution.height, 4, 4]} />
        <meshStandardMaterial
          color={gameState?.currentEra === 'roman' ? '#8b7355' : '#505050'}
          wireframe={true}
          opacity={0.7}
          transparent={true}>
          <primitive
            attach='map'
            object={
              new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1, THREE.RGBAFormat)
            }
          />
        </meshStandardMaterial>
        {/* Optional loading text */}
        {isInitializing || isLoading ? (
          <group position={[0, 0, 5]}>
            <mesh>
              <sphereGeometry args={[2, 16, 16]} />
              <meshStandardMaterial color='#444' />
            </mesh>
            <pointLight intensity={0.5} distance={10} />
          </group>
        ) : null}
      </mesh>
    );
  }

  // If there was an error, log it but still try to render whatever we have
  if (error) {
    console.error('Terrain error:', error);
  }

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
