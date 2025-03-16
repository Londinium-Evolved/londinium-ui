import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { observer } from 'mobx-react-lite';
import * as THREE from 'three';
import { Era } from '../../state/gameState';
import { useStore } from '../../state/RootStore';
import { Building } from '../../state/BuildingState';
interface GameSceneProps {
  era: Era;
  eraProgress: number;
}

export const GameScene = observer(({ era, eraProgress }: GameSceneProps) => {
  const { buildingState } = useStore();
  const terrainRef = useRef<THREE.Mesh>(null);

  // Use frame for animations or continuous updates
  useFrame((state, delta) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(state, delta);
    }
    if (terrainRef.current) {
      // Example of animating based on era transition
      // This would be more sophisticated in the real implementation
      const terrainMaterial = terrainRef.current.material as THREE.MeshStandardMaterial;

      if (era === 'roman') {
        terrainMaterial.color.set('#5d8b68'); // Green for Roman era
      } else {
        terrainMaterial.color.lerp(new THREE.Color('#203354'), eraProgress); // Bluish for Cyberpunk
      }
    }
  });

  return (
    <group>
      {/* Basic terrain */}
      <mesh ref={terrainRef} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color='#5d8b68' />
      </mesh>

      {/* Grid for development purposes */}
      {process.env.NODE_ENV === 'development' && (
        <gridHelper args={[100, 100, '#666666', '#444444']} />
      )}

      {/* This is where we'll render buildings */}
      <BuildingsContainer
        buildings={Object.values(buildingState.buildings)}
        eraProgress={eraProgress}
      />
    </group>
  );
});

// Placeholder for buildings container component
// This would be expanded significantly in the real implementation
const BuildingsContainer = observer(
  ({ buildings, eraProgress }: { buildings: Building[]; eraProgress: number }) => {
    console.log('buildings', buildings);
    console.log('eraProgress', eraProgress);
    return (
      <group>
        {/* Placeholder for building rendering */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[5, 10, 5]} />
          <meshStandardMaterial color='#964B00' />
        </mesh>

        {/* This is just a placeholder for demo purposes */}
        <mesh position={[15, 0, 15]}>
          <boxGeometry args={[8, 15, 8]} />
          <meshStandardMaterial color='#777777' />
        </mesh>
      </group>
    );
  }
);
