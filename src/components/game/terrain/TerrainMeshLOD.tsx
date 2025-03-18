import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useLIDARTerrain } from '../../../hooks/useLIDARTerrain';
import { TerrainSettings } from '../../../utils/terrain/types';
import { useRootStore } from '../../../hooks/useRootStore';

interface TerrainMeshLODProps {
  dataUrl: string;
  settings: TerrainSettings;
  maxLODDistance?: number;
  lodLevels?: number;
}

/**
 * Component that renders terrain with Level of Detail (LOD) system.
 * This creates multiple terrain mesh geometries at different resolution
 * levels and switches between them based on camera distance.
 */
export const TerrainMeshLOD: React.FC<TerrainMeshLODProps> = ({
  dataUrl,
  settings,
  maxLODDistance = 2000,
  lodLevels = 4,
}) => {
  const { camera } = useThree();
  const { gameState } = useRootStore();
  const terrainGroupRef = useRef<THREE.Group>(null);
  const [activeLODLevel, setActiveLODLevel] = useState(0);
  const [lastCameraPosition, setLastCameraPosition] = useState(new THREE.Vector3());
  const [lodDistances, setLodDistances] = useState<number[]>([]);
  const [lodGeometries, setLodGeometries] = useState<(THREE.PlaneGeometry | null)[]>([]);
  const isMounted = useRef(true);

  // Use our custom LIDAR terrain hook
  const { isLoading, error, terrainGeometry, normalMap, processor, loadTerrain } =
    useLIDARTerrain();

  // Material that adapts to the current era
  const material = useMemo(() => {
    if (!normalMap || !gameState) return null;

    const materialProps = {
      side: THREE.DoubleSide,
      flatShading: false,
      normalMap,
      normalScale: new THREE.Vector2(1, 1),
      receiveShadow: true,
    };

    // Era-specific customizations
    if (gameState.currentEra === 'roman') {
      return new THREE.MeshStandardMaterial({
        ...materialProps,
        color: new THREE.Color(0x8b7355), // Earthy brown
        roughness: 0.9,
        metalness: 0.1,
      });
    } else {
      return new THREE.MeshStandardMaterial({
        ...materialProps,
        color: new THREE.Color(0x505050), // Urban gray
        roughness: 0.7,
        metalness: 0.3,
      });
    }
  }, [normalMap, gameState?.currentEra]);

  // Load the terrain data on component mount
  useEffect(() => {
    const fetchAndLoadTerrain = async () => {
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch terrain data: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await loadTerrain(arrayBuffer, settings);
      } catch (err) {
        console.error('Error loading terrain:', err);
      }
    };

    fetchAndLoadTerrain();

    return () => {
      isMounted.current = false;
    };
  }, [dataUrl, loadTerrain, settings]);

  // Generate LOD levels once terrain data is loaded
  useEffect(() => {
    if (!processor || !terrainGeometry || isLoading) return;

    // Calculate LOD distances based on maxLODDistance
    const distances = Array.from({ length: lodLevels }, (_, i) => {
      const level = i + 1;
      const powerFactor = 2; // Exponential distance increase
      return (maxLODDistance * Math.pow(level, powerFactor)) / Math.pow(lodLevels, powerFactor);
    });

    console.log('Generated LOD distances:', distances);
    setLodDistances(distances);

    // Generate geometries for each LOD level
    const geometries = Array.from({ length: lodLevels }, (_, i) => {
      const level = i + 1;
      const segmentReduction = Math.pow(2, level - 1); // Each level halves the number of segments

      try {
        // Adjust segment size based on LOD level (higher level = fewer segments)
        const segmentSize = settings.segmentSize * segmentReduction;

        if (processor) {
          return processor.createTerrainGeometry(segmentSize);
        }
      } catch (err) {
        console.error(`Error generating LOD level ${level}:`, err);
      }

      return null;
    });

    console.log(`Generated ${geometries.filter(Boolean).length} LOD geometry levels`);
    setLodGeometries(geometries);
  }, [processor, terrainGeometry, isLoading, maxLODDistance, lodLevels, settings.segmentSize]);

  // Determine which LOD level to use based on camera distance
  const updateLODLevel = useCallback(() => {
    if (!terrainGroupRef.current || lodDistances.length === 0) return;

    // Get the center position of the terrain
    const terrainCenter = new THREE.Vector3();
    terrainGroupRef.current.getWorldPosition(terrainCenter);

    // Calculate distance from camera to terrain center
    const distance = camera.position.distanceTo(terrainCenter);

    // Determine which LOD level to use
    let newLODLevel = 0; // Default to highest detail (level 0)

    for (let i = 0; i < lodDistances.length; i++) {
      if (distance > lodDistances[i]) {
        newLODLevel = i + 1;
      }
    }

    // Clamp to available LOD levels
    newLODLevel = Math.min(newLODLevel, lodLevels - 1);

    if (newLODLevel !== activeLODLevel) {
      setActiveLODLevel(newLODLevel);
      console.log(`Switched to LOD level ${newLODLevel} at distance ${distance.toFixed(2)}`);
    }
  }, [camera, lodDistances, lodLevels, activeLODLevel]);

  // Monitor camera position for significant changes
  useFrame(() => {
    if (!camera) return;

    // Only update LOD if camera has moved significantly (optimization)
    if (camera.position.distanceTo(lastCameraPosition) > 10) {
      setLastCameraPosition(camera.position.clone());
      updateLODLevel();
    }
  });

  if (error) {
    return (
      <group ref={terrainGroupRef}>
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color='red' wireframe />
        </mesh>
        {/* Error state visualization */}
        <mesh position={[0, 5, 0]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial color='red' />
        </mesh>
      </group>
    );
  }

  // Render loading state or terrain
  return (
    <group ref={terrainGroupRef}>
      {isLoading && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100, 10, 10]} />
          <meshStandardMaterial color='blue' wireframe opacity={0.5} transparent />
        </mesh>
      )}

      {!isLoading && material && (
        <>
          {/* Render active LOD level */}
          {lodGeometries.map(
            (geometry, index) =>
              geometry && (
                <mesh
                  key={`lod-${index}`}
                  rotation={[-Math.PI / 2, 0, 0]}
                  material={material}
                  geometry={geometry}
                  visible={index === activeLODLevel}
                  receiveShadow
                />
              )
          )}

          {/* Fallback to original terrain if no LOD geometries available */}
          {lodGeometries.length === 0 && terrainGeometry && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              material={material}
              geometry={terrainGeometry}
              receiveShadow
            />
          )}
        </>
      )}
    </group>
  );
};

export default TerrainMeshLOD;
