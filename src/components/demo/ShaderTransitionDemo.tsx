import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EraModelLoader } from '../game/ModelLoader';
import { Era } from '../../hooks/useModelLoader';

/**
 * Demo component to showcase the shader transition effect
 */
export const ShaderTransitionDemo: React.FC = () => {
  const [currentEra, setCurrentEra] = useState<Era>(Era.Roman);
  const [useShaderEffect, setUseShaderEffect] = useState<boolean>(true);
  const modelRef = useRef<{ transitionToEra: (era: Era) => void; currentEra: Era } | null>(null);

  // Replace with your actual model URLs
  const romanModelUrl = '/models/roman_building.glb';
  const cyberpunkModelUrl = '/models/cyberpunk_building.glb';

  const handleTransition = (era: Era) => {
    if (modelRef.current) {
      modelRef.current.transitionToEra(era);
    }
    setCurrentEra(era);
  };

  return (
    <div className='w-full h-screen bg-gray-900 relative'>
      <div className='absolute top-5 left-5 bg-black/70 p-5 rounded-lg text-white z-10'>
        <h2 className='text-xl font-bold mb-4'>Model Transition Demo</h2>
        <div className='flex gap-2 mb-4'>
          <button
            onClick={() => handleTransition(Era.Roman)}
            disabled={currentEra === Era.Roman}
            className={`px-4 py-2 rounded ${
              currentEra === Era.Roman
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}>
            Roman Era
          </button>
          <button
            onClick={() => handleTransition(Era.Cyberpunk)}
            disabled={currentEra === Era.Cyberpunk}
            className={`px-4 py-2 rounded ${
              currentEra === Era.Cyberpunk
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}>
            Cyberpunk Era
          </button>
        </div>
        <div className='flex items-center mb-4'>
          <input
            type='checkbox'
            checked={useShaderEffect}
            onChange={(e) => setUseShaderEffect(e.target.checked)}
            id='shader-effect'
            className='mr-2'
          />
          <label htmlFor='shader-effect'>Use Shader Effect</label>
        </div>
        <p className='mb-2'>Current Era: {currentEra}</p>
        <p className='text-sm text-gray-300'>
          This demo showcases the transition between Roman and Cyberpunk models using custom shader
          effects for enhanced visual transitions.
        </p>
      </div>

      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <EraModelLoader
          romanModelUrl={romanModelUrl}
          cyberpunkModelUrl={cyberpunkModelUrl}
          initialEra={Era.Roman}
          transitionSpeed={1.0}
          useShaderEffect={useShaderEffect}
          onTransitionComplete={(era) => console.log(`Transition complete to ${era}`)}
          onRef={(ref) => (modelRef.current = ref)}
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
};
