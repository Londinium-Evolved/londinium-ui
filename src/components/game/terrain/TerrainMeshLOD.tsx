import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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
  const { isLoading, error, terrainGeometry, normalMap, processor, processingStatus, loadTerrain } =
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

  // Advanced loading indicator component
  const LoadingIndicator = useMemo(() => {
    if (!isLoading && !processingStatus) return null;

    const progress = processingStatus?.progress || 0;
    const message = processingStatus?.message || 'Loading terrain...';
    const stage = processingStatus?.stage || 'loading';
    const isError = error !== null || stage === 'error';

    return (
      <group position={[0, 10, 0]}>
        {/* Loading ring */}
        <mesh rotation={[0, progress / 50, 0]}>
          <torusGeometry args={[5, 0.5, 16, 50]} />
          <meshStandardMaterial
            color={isError ? '#ff3333' : '#4488ff'}
            wireframe={isError}
            emissive={isError ? '#ff0000' : '#0066ff'}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Progress indicator */}
        <mesh position={[0, 0, 0.5]}>
          <circleGeometry args={[4, 32]} />
          <meshStandardMaterial color='#333333' />
        </mesh>

        <mesh position={[0, 0, 0.6]} rotation={[0, 0, Math.PI * 1.5]}>
          <ringGeometry args={[3, 3.8, 32, 1, 0, Math.PI * 2 * (progress / 100)]} />
          <meshStandardMaterial
            color={isError ? '#ff3333' : '#22aaff'}
            emissive={isError ? '#ff0000' : '#0066ff'}
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Status text */}
        <Text
          position={[0, -6, 0]}
          fontSize={1.2}
          color={isError ? '#ff3333' : '#ffffff'}
          anchorX='center'
          anchorY='middle'>
          {isError ? error || 'Error loading terrain' : message}
        </Text>

        {/* Loading percentage */}
        <Text position={[0, 0, 0.7]} fontSize={2} color='#ffffff' anchorX='center' anchorY='middle'>
          {isError ? 'ERROR' : `${Math.round(progress)}%`}
        </Text>

        {/* Small stage indicator */}
        <Text
          position={[0, -8, 0]}
          fontSize={0.8}
          color='#aaaaaa'
          anchorX='center'
          anchorY='middle'>
          {`Stage: ${stage}`}
        </Text>

        <pointLight intensity={2} distance={20} color={isError ? '#ff3333' : '#4488ff'} />
      </group>
    );
  }, [isLoading, processingStatus, error]);

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
        {/* Display error message */}
        <Text position={[0, 10, 0]} fontSize={2} color='red' anchorX='center' anchorY='middle'>
          {error}
        </Text>
      </group>
    );
  }

  // Render loading state or terrain
  return (
    <group ref={terrainGroupRef}>
      {/* Show loading indicator while loading */}
      {isLoading && LoadingIndicator}

      {/* Basic geometry during loading as a placeholder */}
      {isLoading && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100, 10, 10]} />
          <meshStandardMaterial color='blue' wireframe opacity={0.2} transparent />
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
