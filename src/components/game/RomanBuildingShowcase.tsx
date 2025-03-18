import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingType } from '../../state/types';
import { generateRomanBuilding } from '../../utils/procedural/romanBuildingGenerator';
import { BuildingConfig } from '../../utils/procedural/buildingGenerator';

// Component to display a single Roman building
const RomanBuildingMesh: React.FC<{
  type: BuildingType;
  position: [number, number, number];
  rotation?: [number, number, number];
  seed?: number;
}> = ({ type, position, rotation = [0, 0, 0], seed = Math.floor(Math.random() * 10000) }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create a config for the building
  const config: BuildingConfig = {
    widthRange: [5, 7] as [number, number],
    depthRange: [7, 10] as [number, number],
    heightRange: [3, 4] as [number, number],
    material: new THREE.MeshStandardMaterial({ color: '#c9b18f' }),
    features: {
      windows: {
        enabled: true,
        density: 0.3,
        size: [0.5, 0.8] as [number, number],
        style: 'roman' as const,
      },
      doors: {
        width: 1.2,
        height: 2.2,
        position: 'center' as const,
        style: 'roman' as const,
      },
      roof: {
        style: 'peaked' as const,
        height: 0.3,
        overhang: 0.4,
      },
      decoration: {
        level: 0.7,
        style: 'roman' as const,
      },
    },
    variations: {
      wallThickness: 0.2,
      floorThickness: 0.2,
      columnDensity: 0.8,
      roomDivisions: 5,
    },
    performance: {
      detailLevel: 0.8,
      textureResolution: 'medium' as const,
    },
  };

  // Generate the building once
  const buildingData = React.useMemo(() => {
    console.log(`Generating Roman ${type} with seed ${seed}`);
    return generateRomanBuilding(type, config, seed);
  }, [type, seed]);

  // Add a simple rotation animation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[rotation[0], rotation[1], rotation[2]]}
      castShadow
      receiveShadow>
      <primitive object={buildingData.geometry} attach='geometry' />
      {buildingData.materials.map((material, index) => (
        <primitive key={index} object={material} attach={`material-${index}`} />
      ))}
    </mesh>
  );
};

// Main showcase component
const RomanBuildingShowcase: React.FC = () => {
  const [selectedType, setSelectedType] = useState<BuildingType>('domus');
  const [seed, setSeed] = useState<number>(12345);

  const romanBuildingTypes: BuildingType[] = ['domus', 'insula', 'temple', 'bath'];

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(event.target.value as BuildingType);
  };

  const handleSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSeed(parseInt(event.target.value, 10) || 0);
  };

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 100000));
  };

  return (
    <div className='w-full h-screen flex flex-col'>
      <div className='p-4 bg-gray-100 dark:bg-gray-800 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Historically Accurate Roman Building Generator</h1>
        <div className='flex space-x-4'>
          <div className='flex items-center'>
            <label htmlFor='buildingType' className='mr-2'>
              Building Type:
            </label>
            <select
              id='buildingType'
              value={selectedType}
              onChange={handleTypeChange}
              className='border p-2 rounded'>
              {romanBuildingTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className='flex items-center'>
            <label htmlFor='seed' className='mr-2'>
              Seed:
            </label>
            <input
              id='seed'
              type='number'
              value={seed}
              onChange={handleSeedChange}
              className='border p-2 rounded w-24'
            />
          </div>
          <button
            onClick={generateRandomSeed}
            className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded'>
            Random Seed
          </button>
        </div>
      </div>

      <div className='flex-grow'>
        <Canvas shadows camera={{ position: [15, 15, 15], fov: 50 }}>
          <color attach='background' args={['#87CEEB']} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          <RomanBuildingMesh type={selectedType} position={[0, 0, 0]} seed={seed} />

          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color='#8B4513' />
          </mesh>

          <OrbitControls enableZoom enablePan enableRotate />
          <Environment preset='sunset' />
          <Stats />
        </Canvas>
      </div>

      <div className='p-4 bg-gray-100 dark:bg-gray-800'>
        <h2 className='text-lg font-bold mb-2'>Historical Accuracy Features:</h2>
        <ul className='list-disc pl-5'>
          {selectedType === 'domus' && (
            <>
              <li>Central atrium with compluvium (roof opening) and impluvium (water basin)</li>
              <li>Peristyle garden courtyard with columns</li>
              <li>Historically accurate roof proportions and design</li>
              <li>Room layout matching archaeological findings from Pompeii and Herculaneum</li>
            </>
          )}
          {selectedType === 'insula' && (
            <>
              <li>Multi-story apartment building (3-6 floors)</li>
              <li>Ground floor shops (tabernae) with different window layout</li>
              <li>Simple, functional architecture matching Roman urban housing</li>
              <li>Flat roof design typical of insulae in Roman cities</li>
            </>
          )}
          {selectedType === 'temple' && (
            <>
              <li>Podium (raised platform) with frontal steps</li>
              <li>Cella (inner chamber) surrounded by columns</li>
              <li>Peripteral or prostyle columnar arrangement</li>
              <li>Triangular pediment at front facing</li>
            </>
          )}
          {selectedType === 'bath' && (
            <>
              <li>
                Multiple sections: caldarium (hot bath), tepidarium (warm area), frigidarium (cold
                bath)
              </li>
              <li>Domed structure over the caldarium</li>
              <li>Columns supporting public spaces</li>
              <li>Thicker floors for hypocaust heating system</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default RomanBuildingShowcase;
