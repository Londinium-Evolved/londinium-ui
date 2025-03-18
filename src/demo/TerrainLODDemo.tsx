import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats, Text } from '@react-three/drei';
import * as THREE from 'three';
import TerrainMeshLOD from '../components/game/terrain/TerrainMeshLOD';
import { TerrainSettings } from '../utils/terrain/types';
import { Era } from '../state/types';

// Example LIDAR data URL - replace with actual data in production
const DEMO_LIDAR_DATA_URL = '/sample_lidar_data.tiff';

// Camera debug helper to show distance information
const CameraDebugHelper = () => {
  const [cameraInfo, setCameraInfo] = useState({
    position: new THREE.Vector3(),
    distance: 0,
  });

  useEffect(() => {
    // Update camera info on animation frame
    const interval = setInterval(() => {
      const terrainCenter = new THREE.Vector3(0, 0, 0);
      const distance = new THREE.Vector3(0, 100, 200).distanceTo(terrainCenter);

      setCameraInfo({
        position: new THREE.Vector3(0, 100, 200),
        distance,
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Display camera information */}
      <Text
        position={[0, 20, 0]}
        fontSize={5}
        color='white'
        anchorX='center'
        anchorY='middle'
        renderOrder={1000}>
        {`Camera Dist: ${cameraInfo.distance.toFixed(2)}m | Pos: ${cameraInfo.position.x.toFixed(
          1
        )}, ${cameraInfo.position.y.toFixed(1)}, ${cameraInfo.position.z.toFixed(1)}`}
      </Text>
    </>
  );
};

// LOD Levels Debug Visualization
const LODDebugVisualizer = ({ activeLODLevel }: { activeLODLevel: number }) => {
  const levels = ['High Detail', 'Medium Detail', 'Low Detail', 'Very Low Detail'];

  return (
    <group position={[50, 20, 50]}>
      {levels.map((label, index) => (
        <Text
          key={`lod-level-${index}`}
          position={[0, -index * 5, 0]}
          fontSize={4}
          color={index === activeLODLevel ? '#00ff00' : '#aaaaaa'}
          anchorX='left'
          anchorY='middle'>
          {`LOD ${index}: ${label} ${index === activeLODLevel ? '(ACTIVE)' : ''}`}
        </Text>
      ))}
    </group>
  );
};

export const TerrainLODDemo: React.FC = () => {
  const [activeLODLevel, setActiveLODLevel] = useState(0);
  const [currentEra, setCurrentEra] = useState<Era>('roman');

  // Define terrain settings
  const terrainSettings: TerrainSettings = {
    resolution: { width: 1024, height: 1024 }, // These values will be overridden by actual LIDAR data
    segmentSize: 10, // Base segment size for highest detail level
    heightScale: 1.0, // Scale factor for height values
    era: currentEra, // Required property
  };

  return (
    <div className='w-full h-screen'>
      <Canvas
        shadows
        camera={{ position: [0, 100, 200], fov: 45, far: 10000 }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#1a1a2e'));
        }}>
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[200, 200, 200]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Grid helper for reference */}
        <gridHelper args={[2000, 200, '#666666', '#444444']} />

        {/* Debug helpers */}
        <CameraDebugHelper />
        <LODDebugVisualizer activeLODLevel={activeLODLevel} />

        {/* Terrain with LOD */}
        <TerrainMeshLOD
          dataUrl={DEMO_LIDAR_DATA_URL}
          settings={terrainSettings}
          maxLODDistance={2000}
          lodLevels={4}
        />

        {/* Controls and Stats */}
        <OrbitControls
          maxDistance={5000}
          minDistance={10}
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below ground level
          onChange={() => {
            // This would ideally come from the TerrainMeshLOD component
            // For demo purposes, we'll simulate LOD changes based on camera distance
            const cameraDistance = new THREE.Vector3(0, 100, 200).distanceTo(new THREE.Vector3());
            if (cameraDistance > 1500) setActiveLODLevel(3);
            else if (cameraDistance > 1000) setActiveLODLevel(2);
            else if (cameraDistance > 500) setActiveLODLevel(1);
            else setActiveLODLevel(0);
          }}
        />
        <Stats />
      </Canvas>

      <div className='absolute top-4 left-4 text-white bg-black bg-opacity-50 p-4 rounded'>
        <h2 className='text-xl font-bold'>Terrain LOD Demo</h2>
        <p>Orbit the camera to see LOD levels change based on distance</p>
        <p>Current LOD Level: {activeLODLevel}</p>
        <div className='mt-2'>
          <button
            className={`px-3 py-1 mr-2 rounded ${
              currentEra === 'roman' ? 'bg-green-700' : 'bg-gray-700'
            }`}
            onClick={() => setCurrentEra('roman')}>
            Roman Era
          </button>
          <button
            className={`px-3 py-1 rounded ${
              currentEra === 'cyberpunk' ? 'bg-blue-700' : 'bg-gray-700'
            }`}
            onClick={() => setCurrentEra('cyberpunk')}>
            Cyberpunk Era
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerrainLODDemo;
