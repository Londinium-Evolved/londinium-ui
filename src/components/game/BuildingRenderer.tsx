import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Observer } from 'mobx-react-lite';
import { Building } from '../../state/BuildingState';
import {
  generateBuildingGeometry,
  getBuildingConfig,
  BuildingConfig,
} from '../../utils/procedural/buildingGenerator';
import { useContext } from 'react';
import { StoreContext } from '../../state/RootStore';

/**
 * Updates the geometry of a mesh based on building configuration dimensions
 * Extracts complex geometry update logic from the frame loop for better readability and testability
 */
const updateMeshGeometry = (mesh: THREE.Mesh, config: BuildingConfig): void => {
  if (!(mesh.geometry instanceof THREE.BoxGeometry)) return;

  const [minWidth, maxWidth] = config.widthRange;
  const [minDepth, maxDepth] = config.depthRange;
  const [minHeight, maxHeight] = config.heightRange;

  // Use average values for simplicity
  const width = (minWidth + maxWidth) / 2;
  const depth = (minDepth + maxDepth) / 2;
  const height = (minHeight + maxHeight) / 2;

  // Only update if dimensions are significantly different
  const currentGeom = mesh.geometry as THREE.BoxGeometry;
  const sizeDiff =
    Math.abs(currentGeom.parameters.width - width) +
    Math.abs(currentGeom.parameters.height - height) +
    Math.abs(currentGeom.parameters.depth - depth);

  if (sizeDiff > 1.0) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(width, height, depth);
  }
};

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
      position: [building.position.x, building.position.y, building.position.z],
      rotation: building.rotation.y,
      scale: [building.scale.x, building.scale.y, building.scale.z],
      type: building.type,
      era: gameState.currentEra,
      seed: parseInt(building.id, 36), // Convert id to a numeric seed
    });
  }, [gameState, building.position, building.rotation, building.scale, building.type, building.id]);

  // Apply era transition when eraProgress changes
  useFrame(() => {
    if (!meshRef.current || !gameState || gameState.eraProgress <= 0) return;

    // Get config for current era with progress
    const config = getBuildingConfig(building.type, gameState.currentEra, gameState.eraProgress);

    // If the material has been updated due to era progress, apply it
    if (materials[0] !== meshRef.current.material) {
      meshRef.current.material = materials[0];
    }

    // Update geometry based on config dimensions
    updateMeshGeometry(meshRef.current, config);
  });

  return (
    <Observer>
      {() => (
        <mesh
          ref={meshRef}
          position={
            new THREE.Vector3(building.position.x, building.position.y, building.position.z)
          }
          rotation={new THREE.Euler(building.rotation.x, building.rotation.y, building.rotation.z)}
          scale={new THREE.Vector3(building.scale.x, building.scale.y, building.scale.z)}>
          <primitive object={geometry} attach='geometry' />
          <primitive object={materials[0]} attach='material' />
        </mesh>
      )}
    </Observer>
  );
};

export default BuildingRenderer;
