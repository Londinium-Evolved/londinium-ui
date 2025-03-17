import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
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
  const { scene } = useThree();
  const [isReady, setIsReady] = useState(false);
  
  // Use our custom hook
  const { 
    isLoading, 
    error, 
    terrainGeometry, 
    normalMap, 
    loadTerrain 
  } = useLIDARTerrain();
  
  // Load the terrain data
  useEffect(() => {
    async function fetchAndLoadTerrain() {
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch LIDAR data: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        await loadTerrain(arrayBuffer, settings);
        setIsReady(true);
      } catch (err) {
        console.error('Error loading terrain:', err);
      }
    }
    
    fetchAndLoadTerrain();
  }, [dataUrl, loadTerrain, settings]);
  
  // Create a material that adapts to the current era
  const [material, setMaterial] = useState<THREE.Material | null>(null);
  
  useEffect(() => {
    if (!normalMap || !gameState) return;
    
    // Create a material based on the era
    const createMaterial = () => {
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
          color: new THREE.Color(0x8B7355), // Earthy brown
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
    };
    
    const newMaterial = createMaterial();
    setMaterial((prev) => {
      if (prev) prev.dispose();
      return newMaterial;
    });
    
  }, [normalMap, gameState?.currentEra]);
  
  // Render terrain mesh when ready
  if (!isReady || !terrainGeometry || !material) {
    return null; // Or a loading indicator
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
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate checking if data is available
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, []);
  
  if (isLoading) {
    return (
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    );
  }
  
  return <LIDARTerrain {...props} />;
}