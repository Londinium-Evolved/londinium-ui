import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Observer } from 'mobx-react-lite';
import { Building } from '../../state/BuildingState';
import {
  generateBuildingGeometry,
  getBuildingConfig,
} from '../../utils/procedural/buildingGenerator';
import { useContext } from 'react';
import { StoreContext } from '../../state/RootStore';

interface BuildingRendererProps {
  building: Building;
}

const BuildingRenderer: React.FC<BuildingRendererProps> = ({ building }) => {
  const rootStore = useContext(StoreContext);
  const gameState = rootStore?.gameState;

  const meshRef = useRef<THREE.Mesh>(null);

  // Generate building geometry based on building type, era, and era progress
  const { geometry, materials } = useMemo(() => {
    if (!gameState) {
      return {
        geometry: new THREE.BoxGeometry(1, 1, 1),
        materials: [new THREE.MeshBasicMaterial()],
      };
    }

    return generateBuildingGeometry({
      position: building.position,
      rotation: building.rotation,
      scale: building.scale,
      type: building.type,
      era: gameState.currentEra,
      seed: parseInt(building.id, 36), // Convert id to a numeric seed
    });
  }, [
    building.position,
    building.rotation,
    building.scale,
    building.type,
    building.id,
    gameState?.currentEra,
  ]);

  // Apply era transition when eraProgress changes
  useFrame(() => {
    if (meshRef.current && gameState && gameState.eraProgress > 0) {
      // Get config for current era with progress
      const config = getBuildingConfig(building.type, gameState.currentEra, gameState.eraProgress);

      // If the material has been updated due to era progress, apply it
      if (materials[0] !== meshRef.current.material) {
        meshRef.current.material = materials[0];
      }

      // We could do more sophisticated transitions here, like morphing geometry
      // such as adjusting the size based on config's dimensions
      if (meshRef.current.geometry instanceof THREE.BoxGeometry) {
        // Create a new geometry with interpolated dimensions
        const [minWidth, maxWidth] = config.widthRange;
        const [minDepth, maxDepth] = config.depthRange;
        const [minHeight, maxHeight] = config.heightRange;

        // Use average values for simplicity
        const width = (minWidth + maxWidth) / 2;
        const depth = (minDepth + maxDepth) / 2;
        const height = (minHeight + maxHeight) / 2;

        // Only update if dimensions are significantly different
        const currentGeom = meshRef.current.geometry as THREE.BoxGeometry;
        const sizeDiff =
          Math.abs(currentGeom.parameters.width - width) +
          Math.abs(currentGeom.parameters.height - height) +
          Math.abs(currentGeom.parameters.depth - depth);

        if (sizeDiff > 1.0) {
          meshRef.current.geometry.dispose();
          meshRef.current.geometry = new THREE.BoxGeometry(width, height, depth);
        }
      }
    }
  });

  return (
    <Observer>
      {() => (
        <mesh
          ref={meshRef}
          position={new THREE.Vector3(...building.position)}
          rotation={new THREE.Euler(0, building.rotation, 0)}
          scale={new THREE.Vector3(...building.scale)}>
          <primitive object={geometry} attach='geometry' />
          <primitive object={materials[0]} attach='material' />
        </mesh>
      )}
    </Observer>
  );
};

export default BuildingRenderer;
