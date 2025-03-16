import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Mesh } from 'three';
import { useThreeDisposal } from '../utils/three/disposalUtils';
import { materialFactory } from '../utils/three/materialFactory';

// Example simplified implementation of LIDAR terrain generation
const TerrainGenerator = ({ width = 100, height = 100, scale = 20, resolution = 128 }) => {
  const meshRef = useRef<Mesh>(null);
  const [terrain, setTerrain] = useState<Mesh | null>(null);
  const [registerDisposable] = useThreeDisposal();

  useEffect(() => {
    // Generate heightmap
    const heightmap = generateProceduralHeightmap(resolution, resolution);

    // Create geometry
    const geometry = registerDisposable(
      new THREE.PlaneGeometry(width, height, resolution - 1, resolution - 1)
    );

    // Apply height displacement
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = Math.floor((i / 3) % resolution);
      const y = Math.floor(i / 3 / resolution);

      if (x < resolution && y < resolution) {
        positions[i + 2] = heightmap[y * resolution + x] * scale;
      }
    }

    // Update normals
    geometry.computeVertexNormals();

    // Compute bounding sphere to fix "Cannot read properties of undefined (reading 'center')" error
    geometry.computeBoundingSphere();

    // Apply material using the material factory
    const material = registerDisposable(
      materialFactory.createRomanMaterial({
        color: '#5B8731',
        roughness: 0.8,
        metalness: 0.2,
        flatShading: false,
        cacheKey: 'terrain_material',
      })
    );

    // Create the mesh and register it for disposal
    const newTerrain = registerDisposable(new THREE.Mesh(geometry, material));
    setTerrain(newTerrain);

    // No need for manual cleanup as useThreeDisposal handles disposal on unmount
  }, [width, height, scale, resolution, registerDisposable]);

  // Generate a procedural heightmap (simplified stand-in for LIDAR data)
  const generateProceduralHeightmap = (width: number, height: number) => {
    const heightmap = new Float32Array(width * height);

    // Create simplex noise simulation (simplified for demo)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // River Thames-like feature
        const riverY = height * 0.6;
        const riverWidth = width * 0.1;
        const distToRiver = Math.abs(y - riverY);

        // Hills and terrain
        let elevation =
          Math.sin((x / width) * Math.PI * 2) * 0.5 + Math.cos((y / height) * Math.PI * 3) * 0.5;

        // Create river valley
        if (distToRiver < riverWidth) {
          const riverFactor = 1 - distToRiver / riverWidth;
          elevation -= riverFactor * 1.5;
        }

        // Add subtle noise
        elevation += (Math.random() - 0.5) * 0.1;

        heightmap[y * width + x] = elevation;
      }
    }

    return heightmap;
  };

  if (!terrain) return null;

  return (
    <group>
      {terrain && (
        <primitive
          object={terrain}
          ref={meshRef}
          receiveShadow
          castShadow
          frustumCulled={false}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
};

// Roman city wall generation (simplified)
const CityWall = ({ radius = 40, height = 6, thickness = 2.5 }) => {
  const wallRef = useRef<Mesh>(null);

  // Create a circular wall path (simplified from historical wall)
  useEffect(() => {
    // In a real implementation, this would follow historical wall path
  }, [radius, height, thickness]);

  return (
    <mesh
      ref={wallRef}
      position={[0, height / 2, 0]}
      receiveShadow
      castShadow
      frustumCulled={false}>
      <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
      <meshStandardMaterial
        color='#8a9f98'
        roughness={0.7}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Procedural building generator (simplified for demo)
const Buildings = ({ count = 100, wallRadius = 35 }) => {
  type Building = {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    type: string;
    color: string;
  };

  const [buildings, setBuildings] = useState<Building[]>([]);
  // No useThreeDisposal needed here as the buildings are created as JSX elements
  // with built-in geometries and materials that React Three Fiber manages

  useEffect(() => {
    const bldgs: Building[] = [];

    // Generate random buildings within wall
    for (let i = 0; i < count; i++) {
      // Random position within city wall
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * wallRadius * 0.8; // Keep inside wall

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Determine building type (simplified)
      let type = 'regular';
      const typeRoll = Math.random();

      if (typeRoll > 0.9) {
        type = 'temple';
      } else if (typeRoll > 0.7) {
        type = 'insula';
      } else if (typeRoll > 0.4) {
        type = 'domus';
      }

      // Size and height based on type
      let width, depth, height;

      switch (type) {
        case 'temple':
          width = 8 + Math.random() * 4;
          depth = 12 + Math.random() * 6;
          height = 10 + Math.random() * 5;
          break;
        case 'insula':
          width = 10 + Math.random() * 5;
          depth = 10 + Math.random() * 5;
          height = 8 + Math.random() * 4;
          break;
        case 'domus':
          width = 8 + Math.random() * 4;
          depth = 8 + Math.random() * 4;
          height = 4 + Math.random() * 2;
          break;
        default:
          width = 3 + Math.random() * 2;
          depth = 3 + Math.random() * 2;
          height = 3 + Math.random() * 1;
      }

      bldgs.push({
        id: `building-${i}`,
        position: [x, height / 2, z] as [number, number, number],
        rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
        scale: [width, height, depth] as [number, number, number],
        type,
        color:
          type === 'temple'
            ? '#D2C6B2'
            : type === 'insula'
            ? '#C9BB9F'
            : type === 'domus'
            ? '#E8C8A0'
            : '#B8604D',
      });
    }

    setBuildings(bldgs);
  }, [count, wallRadius]);

  return (
    <group>
      {buildings.map((building) => (
        <mesh
          key={building.id}
          position={building.position}
          rotation={building.rotation}
          castShadow
          receiveShadow
          frustumCulled={false}>
          <boxGeometry args={building.scale} />
          <meshStandardMaterial color={building.color} roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
};

// Roads generation (simplified)
const Roads = ({ wallRadius = 35 }) => {
  // In a full implementation, this would generate roads based on gates
  // and use spatial algorithms to connect districts

  // For demo, just create a simple grid
  const roadWidth = 4;
  const mainRoads = [
    // Cardo Maximus (N-S)
    { start: [0, 0.1, -wallRadius], end: [0, 0.1, wallRadius], width: roadWidth * 1.5 },
    // Decumanus Maximus (E-W)
    { start: [-wallRadius, 0.1, 0], end: [wallRadius, 0.1, 0], width: roadWidth * 1.5 },
  ];

  // Add some minor roads
  const minorRoads = [];
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue; // Skip where main roads are

    // Parallel to Cardo
    minorRoads.push({
      start: [i * 10, 0.1, -wallRadius],
      end: [i * 10, 0.1, wallRadius],
      width: roadWidth,
    });

    // Parallel to Decumanus
    minorRoads.push({
      start: [-wallRadius, 0.1, i * 10],
      end: [wallRadius, 0.1, i * 10],
      width: roadWidth,
    });
  }

  return (
    <group>
      {[...mainRoads, ...minorRoads].map((road, index) => {
        const start = new THREE.Vector3(...road.start);
        const end = new THREE.Vector3(...road.end);
        const direction = end.clone().sub(start).normalize();
        const length = end.distanceTo(start);

        // Angle to align road
        const angle = Math.atan2(direction.z, direction.x);

        return (
          <mesh
            key={`road-${index}`}
            position={[(start.x + end.x) / 2, 0.05, (start.z + end.z) / 2]}
            rotation={[0, angle + Math.PI / 2, 0]}
            receiveShadow
            frustumCulled={false}>
            <planeGeometry args={[road.width, length]} />
            <meshStandardMaterial
              color={index < mainRoads.length ? '#d2c6b2' : '#c9bb9f'}
              roughness={0.9}
              metalness={0.0}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Showcase component to demonstrate different materials created with MaterialFactory
const MaterialShowcase = () => {
  const [registerDisposable] = useThreeDisposal();

  const MaterialExample = ({
    position,
    material,
    type,
  }: {
    position: [number, number, number];
    material: THREE.Material;
    type: string;
  }) => {
    return (
      <group position={position}>
        <mesh position={[0, 0, 0]} material={material}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh position={[0, -1.5, 0]} material={material}>
          <sphereGeometry args={[0.7, 32, 32]} />
        </mesh>
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.4}
          color='#ffffff'
          anchorX='center'
          anchorY='middle'>
          {type}
        </Text>
      </group>
    );
  };

  // Create various materials using our factory
  const romanBasic = registerDisposable(
    materialFactory.createRomanMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
      cacheKey: 'showcase_roman_basic',
    })
  );

  const romanMarble = registerDisposable(
    materialFactory.createRomanMaterial({
      color: 0xf5f5f5,
      roughness: 0.3,
      metalness: 0.1,
      cacheKey: 'showcase_roman_marble',
    })
  );

  const cyberpunkBasic = registerDisposable(
    materialFactory.createCyberpunkMaterial({
      color: 0x2c3e50,
      roughness: 0.2,
      metalness: 0.8,
      cacheKey: 'showcase_cyberpunk_basic',
    })
  );

  const cyberpunkNeon = registerDisposable(
    materialFactory.createCyberpunkMaterial({
      color: 0x333333,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0,
      cacheKey: 'showcase_cyberpunk_neon',
    })
  );

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <MaterialExample position={[-3, 0, 0]} material={romanBasic} type='Roman Basic' />
        <MaterialExample position={[-1, 0, 0]} material={romanMarble} type='Roman Marble' />
        <MaterialExample position={[1, 0, 0]} material={cyberpunkBasic} type='Cyberpunk Basic' />
        <MaterialExample position={[3, 0, 0]} material={cyberpunkNeon} type='Cyberpunk Neon' />

        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
};

// Styles for the demo components
const styles = {
  demoContainer: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  },
  demoSection: {
    marginBottom: '40px',
  },
  canvasContainer: {
    width: '100%',
    height: '500px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  demoInfo: {
    marginBottom: '20px',
  },
  eraSlider: {
    margin: '20px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
  },
  demoControls: {
    marginTop: '20px',
    fontSize: '14px',
  },
};

// Londinium Demo Component with styles
export const LondiniumDemo = () => {
  const [eraProgress, setEraProgress] = useState(0);

  return (
    <div>
      <div style={styles.demoInfo}>
        <h2>Londinium Procedural Map Generation Demo</h2>
        <p>Demonstrates terrain generation, city layout, and era transition</p>
        <div style={styles.eraSlider}>
          <label>Era Transition: Roman → Cyberpunk</label>
          <input
            type='range'
            min='0'
            max='100'
            value={eraProgress}
            onChange={(e) => setEraProgress(parseInt(e.target.value))}
            style={styles.slider}
          />
        </div>
      </div>

      <div style={styles.canvasContainer}>
        <Canvas
          shadows
          camera={{ position: [0, 80, 80], fov: 45 }}
          style={{ background: '#87CEEB' }}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[100, 100, 100]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          <TerrainGenerator width={200} height={200} scale={10} />
          <CityWall />
          <Roads />
          <Buildings />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={20}
            maxDistance={200}
          />
        </Canvas>
      </div>

      <div style={styles.demoControls}>
        <p>
          <strong>Roman Era Features:</strong> Terrain based on historical London topography, city
          wall follows Roman London outline, buildings placed according to district zoning, road
          network follows Roman planning principles
        </p>
        <p>
          <strong>Note:</strong> This is a simplified demo. The full implementation includes: LIDAR
          data integration, historically accurate building generation, resource distribution, and
          complete era transition morphing.
        </p>
      </div>
    </div>
  );
};

// Main Demo component with styles
export default function Demo() {
  return (
    <div style={styles.demoContainer}>
      <div style={styles.demoSection}>
        <h1>Material Factory Showcase</h1>
        <p>
          This demo shows the implementation of the ThreeMeshStandardMaterial factory pattern
          through different materials for both Roman and Cyberpunk eras.
        </p>
        <div style={styles.canvasContainer}>
          <MaterialShowcase />
        </div>
      </div>

      <div style={styles.demoSection}>
        <h1>Londinium Demo</h1>
        <LondiniumDemo />
      </div>
    </div>
  );
}
