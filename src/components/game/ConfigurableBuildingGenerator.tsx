import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BuildingType } from '../../state/BuildingState';
import { Era } from '../../state/gameState';
import {
  loadBuildingConfigurations,
  getBuildingConfigFromLoader,
} from '../../utils/procedural/configurationLoader';
import { initializeConfigurationSystem } from '../../utils/procedural/buildingGenerator';
import { createSeededGenerator } from '../../utils/random/randomGenerator';

/**
 * Props for the BuildingRenderer component
 */
interface BuildingRendererProps {
  buildingType: BuildingType;
  era: Era;
  position?: [number, number, number];
  rotation?: number;
  seed?: number;
}

/**
 * Component that renders a 3D building based on configuration
 */
const BuildingRenderer: React.FC<BuildingRendererProps> = ({
  buildingType,
  era,
  position = [0, 0, 0],
  rotation = 0,
  seed = 12345, // Use a stable seed by default
}) => {
  const [buildingMesh, setBuildingMesh] = useState<THREE.Mesh | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number; depth: number } | null>(null);

  // Reset dimensions when building type, era, or seed changes
  useEffect(() => {
    dimensionsRef.current = null;
  }, [buildingType, era, seed]);

  useEffect(() => {
    // Get the configuration for this building type and era
    const buildingConfig = getBuildingConfigFromLoader(buildingType, era);

    // Use stored dimensions or generate new ones if they don't exist
    if (!dimensionsRef.current) {
      // Create a seeded random generator
      const rng = createSeededGenerator(seed);

      // Generate the building dimensions
      const width = Math.floor(
        rng.generateFloatBetween(buildingConfig.widthRange[0], buildingConfig.widthRange[1] + 1)
      );
      const depth = Math.floor(
        rng.generateFloatBetween(buildingConfig.depthRange[0], buildingConfig.depthRange[1] + 1)
      );
      const height = Math.floor(
        rng.generateFloatBetween(buildingConfig.heightRange[0], buildingConfig.heightRange[1] + 1)
      );

      // Store the dimensions to keep them stable
      dimensionsRef.current = { width, height, depth };

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `Generated new dimensions for ${buildingType} (${era}): ${width}x${height}x${depth}`
        );
      }
    }

    const { width, height, depth } = dimensionsRef.current;

    // Create the geometry with stable dimensions
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, buildingConfig.material);

    // Apply position and rotation
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.y = rotation;

    setBuildingMesh(mesh);

    return () => {
      // Clean up resources when component unmounts
      if (mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    };
  }, [buildingType, era, position, rotation, seed]);

  if (!buildingMesh) return null;

  return <primitive object={buildingMesh} />;
};

/**
 * Props for the BuildingScene component
 */
interface BuildingSceneProps {
  buildingType: BuildingType;
  era: Era;
  seed: number;
}

/**
 * Component that sets up the 3D scene for a building
 */
const BuildingScene: React.FC<BuildingSceneProps> = ({ buildingType, era, seed }) => {
  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <BuildingRenderer buildingType={buildingType} era={era} seed={seed} />
        <OrbitControls />
        <gridHelper args={[50, 50]} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
};

/**
 * Props for the BuildingControls component
 */
interface BuildingControlsProps {
  buildingType: BuildingType;
  era: Era;
  buildingTypes: BuildingType[];
  eras: Era[];
  onBuildingTypeChange: (type: BuildingType) => void;
  onEraChange: (era: Era) => void;
  onRegenerate: () => void;
}

/**
 * Component for building selection and controls
 */
const BuildingControls: React.FC<BuildingControlsProps> = ({
  buildingType,
  era,
  buildingTypes,
  eras,
  onBuildingTypeChange,
  onEraChange,
  onRegenerate,
}) => {
  return (
    <div className='space-y-4'>
      <div className='flex gap-4 mb-4'>
        <div>
          <label className='block mb-2'>Building Type:</label>
          <select
            className='p-2 border rounded'
            value={buildingType}
            onChange={(e) => onBuildingTypeChange(e.target.value as BuildingType)}>
            {buildingTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className='block mb-2'>Era:</label>
          <select
            className='p-2 border rounded'
            value={era}
            onChange={(e) => onEraChange(e.target.value as Era)}>
            {eras.map((era) => (
              <option key={era} value={era}>
                {era.charAt(0).toUpperCase() + era.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onRegenerate}
        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
        Regenerate Building
      </button>
    </div>
  );
};

/**
 * Props for the BuildingConfigDisplay component
 */
interface BuildingConfigDisplayProps {
  buildingType: BuildingType;
  era: Era;
}

/**
 * Component to display configuration details
 */
const BuildingConfigDisplay: React.FC<BuildingConfigDisplayProps> = ({ buildingType, era }) => {
  return (
    <div className='mt-4'>
      <h3 className='text-xl font-semibold mb-2'>Configuration Details</h3>
      <pre className='bg-gray-100 p-4 rounded overflow-auto max-h-60'>
        {JSON.stringify(
          getBuildingConfigFromLoader(buildingType, era),
          (key, value) => {
            // Handle THREE.js objects for display
            if (value instanceof THREE.Material) {
              const material = value as THREE.MeshStandardMaterial;
              return {
                type: material.type,
                color: material.color ? '#' + material.color.getHexString() : undefined,
                emissive: material.emissive ? '#' + material.emissive.getHexString() : undefined,
                roughness: material.roughness,
                metalness: material.metalness,
                emissiveIntensity: material.emissiveIntensity,
              };
            }
            return value;
          },
          2
        )}
      </pre>
    </div>
  );
};

/**
 * Main component that allows selecting and generating buildings from configurations
 */
const ConfigurableBuildingGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<BuildingType>('domus');
  const [selectedEra, setSelectedEra] = useState<Era>('roman');
  const [seed, setSeed] = useState<number>(12345);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        setIsLoading(true);
        // Initialize the configuration system first
        initializeConfigurationSystem();
        // Then load configurations from JSON
        await loadBuildingConfigurations('./assets/configs/buildingConfigurations.json');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load building configurations:', err);
        setError('Failed to load building configurations. Using default settings.');
        setIsLoading(false);
      }
    };

    loadConfigurations();
  }, []);

  const buildingTypes: BuildingType[] = [
    'domus',
    'insula',
    'forum',
    'temple',
    'bath',
    'megacorp-tower',
    'residential-stack',
    'amphitheater',
    'nano-fabricator',
    'data-center',
    'entertainment-hub',
  ];

  const eras: Era[] = ['roman', 'cyberpunk'];

  const handleBuildingTypeChange = (type: BuildingType) => {
    setSelectedType(type);
  };

  const handleEraChange = (era: Era) => {
    setSelectedEra(era);
  };

  const handleRegenerate = () => {
    setSeed(Math.floor(Math.random() * 100000));
  };

  if (isLoading) {
    return <div>Loading building configurations...</div>;
  }

  if (error) {
    return (
      <div>
        <p className='text-red-500'>{error}</p>
        <BuildingScene buildingType={selectedType} era={selectedEra} seed={seed} />
      </div>
    );
  }

  return (
    <div className='p-4'>
      <h2 className='text-2xl font-bold mb-4'>Configurable Building Generator</h2>

      <BuildingControls
        buildingType={selectedType}
        era={selectedEra}
        buildingTypes={buildingTypes}
        eras={eras}
        onBuildingTypeChange={handleBuildingTypeChange}
        onEraChange={handleEraChange}
        onRegenerate={handleRegenerate}
      />

      <BuildingScene buildingType={selectedType} era={selectedEra} seed={seed} />

      <BuildingConfigDisplay buildingType={selectedType} era={selectedEra} />
    </div>
  );
};

export default ConfigurableBuildingGenerator;
