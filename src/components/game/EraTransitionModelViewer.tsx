import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { ModelTransitionLoader, Era } from './ModelTransitionLoader';

interface EraTransitionModelViewerProps {
  romanModelUrl: string;
  cyberpunkModelUrl: string;
  width?: string | number;
  height?: string | number;
  initialEra?: Era;
  transitionSpeed?: number;
  showControls?: boolean;
  environmentPreset?:
    | 'sunset'
    | 'dawn'
    | 'night'
    | 'warehouse'
    | 'forest'
    | 'apartment'
    | 'studio'
    | 'city'
    | 'park'
    | 'lobby';
  cameraPosition?: [number, number, number];
}

/**
 * A component that displays a 3D model with era transition morphing
 */
export const EraTransitionModelViewer: React.FC<EraTransitionModelViewerProps> = ({
  romanModelUrl,
  cyberpunkModelUrl,
  width = '100%',
  height = '500px',
  initialEra = Era.Roman,
  transitionSpeed = 2.0,
  showControls = true,
  environmentPreset = 'city',
  cameraPosition = [5, 5, 5],
}) => {
  // Reference to the model loader for triggering transitions
  const modelRef = React.useRef<{ transitionToEra: (era: Era) => void }>(null);
  const [currentEra, setCurrentEra] = useState<Era>(initialEra);

  // Handle era transition button click
  const handleEraTransition = () => {
    const targetEra = currentEra === Era.Roman ? Era.Cyberpunk : Era.Roman;
    if (modelRef.current) {
      modelRef.current.transitionToEra(targetEra);
      setCurrentEra(targetEra);
    }
  };

  // Handle transition complete event
  const handleTransitionComplete = (era: Era) => {
    console.log(`Transition to ${era} complete`);
    setCurrentEra(era);
  };

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
      {showControls && (
        <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={handleEraTransition}
            style={{
              padding: '8px 16px',
              backgroundColor: currentEra === Era.Roman ? '#8b0000' : '#00008b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}>
            {currentEra === Era.Roman ? 'Transition to Cyberpunk' : 'Transition to Roman'}
          </button>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: cameraPosition, fov: 50 }}>
          {/* Environment and lighting */}
          <Environment preset={environmentPreset} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* The model with transition capabilities */}
          <ModelTransitionLoader
            ref={modelRef}
            romanModelUrl={romanModelUrl}
            cyberpunkModelUrl={cyberpunkModelUrl}
            initialEra={initialEra}
            transitionSpeed={transitionSpeed}
            onTransitionComplete={handleTransitionComplete}
          />

          {/* Camera controls */}
          <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
        </Canvas>
      </div>
    </div>
  );
};

/**
 * Usage example:
 *
 * <EraTransitionModelViewer
 *   romanModelUrl="/assets/models/roman/building.glb"
 *   cyberpunkModelUrl="/assets/models/cyberpunk/building.glb"
 *   width="800px"
 *   height="600px"
 *   initialEra={Era.Roman}
 *   transitionSpeed={1.5}
 * />
 */
