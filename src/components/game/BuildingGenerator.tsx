import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { BuildingType } from '../../state/BuildingState';
import { Era } from '../../state/gameState';
import {
  generateBuildingGeometry,
  loadBuildingConfigurationsFromJSON,
  initializeConfigurationSystem,
} from '../../utils/procedural/buildingGenerator';

interface BuildingGeneratorProps {
  position?: [number, number, number];
  rotation?: number;
  scale?: [number, number, number];
  type?: BuildingType;
  era?: Era;
  seed?: number;
}

/**
 * Component that generates and displays a procedural building
 * using the configuration-based building generation system
 */
export const BuildingGenerator: React.FC<BuildingGeneratorProps> = ({
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1],
  type = 'domus',
  era = 'roman',
  seed = Math.floor(Math.random() * 10000),
}) => {
  const { scene } = useThree();
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load configurations on component mount
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        // Initialize the configuration system
        initializeConfigurationSystem();

        // Load configurations from JSON
        await loadBuildingConfigurationsFromJSON();

        setConfigLoaded(true);
      } catch (error) {
        console.error('Failed to load building configurations:', error);
        // Still set configLoaded to true to fall back to default configs
        setConfigLoaded(true);
      }
    };

    loadConfigurations();
  }, []);

  // Generate building when configurations are loaded
  useEffect(() => {
    if (!configLoaded) return;

    // Generate the building geometry
    const buildingData = generateBuildingGeometry({
      position,
      rotation,
      scale,
      type,
      era,
      seed,
    });

    // Create a mesh with the generated geometry and materials
    const buildingMesh = new THREE.Mesh(
      buildingData.geometry,
      buildingData.materials.length === 1 ? buildingData.materials[0] : buildingData.materials
    );

    // Set position, rotation, and scale
    buildingMesh.position.set(...position);
    buildingMesh.rotation.y = rotation;
    buildingMesh.scale.set(...scale);

    // Add to scene
    scene.add(buildingMesh);

    // Clean up on unmount
    return () => {
      if (buildingMesh) {
        scene.remove(buildingMesh);
        buildingMesh.geometry.dispose();
        if (Array.isArray(buildingMesh.material)) {
          buildingMesh.material.forEach((material) => material.dispose());
        } else {
          buildingMesh.material.dispose();
        }
      }
    };
  }, [configLoaded, position, rotation, scale, type, era, seed, scene]);

  return null; // This component doesn't render anything directly
};

/**
 * Component that displays a grid of buildings with different configurations
 */
export const BuildingShowcase: React.FC = () => {
  const buildingTypes: BuildingType[] = ['domus', 'insula', 'forum', 'temple', 'bath'];
  const eras: Era[] = ['roman', 'cyberpunk'];

  return (
    <>
      {buildingTypes.map((type, typeIndex) =>
        eras.map((era, eraIndex) => (
          <BuildingGenerator
            key={`${type}-${era}`}
            position={[typeIndex * 15, 0, eraIndex * 15]}
            type={type}
            era={era}
            seed={typeIndex * 1000 + eraIndex * 100}
          />
        ))
      )}
    </>
  );
};

export default BuildingShowcase;
