import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { observer } from 'mobx-react-lite';
import { GameScene } from './GameScene';
import { useStore } from '../../state/RootStore';

export const GameWorld = observer(() => {
  const { gameState } = useStore();

  return (
    <Canvas
      shadows
      camera={{ position: [50, 50, 50], fov: 45 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1a2e');
      }}>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 100, 100]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <GameScene era={gameState.currentEra} eraProgress={gameState.eraProgress} />
      <OrbitControls />
      {process.env.NODE_ENV === 'development' && <Stats />}
    </Canvas>
  );
});
