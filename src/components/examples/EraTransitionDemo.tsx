import React, { useState } from 'react';
import { EraTransitionModelViewer } from '../game/EraTransitionModelViewer';
import { Era } from '../game/ModelTransitionLoader';

// Define environment preset type
type EnvironmentPreset =
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

/**
 * Demo component that showcases the era transition system
 */
export const EraTransitionDemo: React.FC = () => {
  const [transitionSpeed, setTransitionSpeed] = useState(2.0);
  const [currentPreset, setCurrentPreset] = useState<string>('city');

  // List of environment presets
  const environmentPresets = [
    'sunset',
    'dawn',
    'night',
    'warehouse',
    'forest',
    'apartment',
    'studio',
    'city',
    'park',
    'lobby',
  ];

  // Sample building models
  const buildingModels = [
    {
      name: 'Roman Domus',
      romanUrl: '/assets/models/roman/domus.glb',
      cyberpunkUrl: '/assets/models/cyberpunk/domus.glb',
    },
    {
      name: 'Temple',
      romanUrl: '/assets/models/roman/temple.glb',
      cyberpunkUrl: '/assets/models/cyberpunk/temple.glb',
    },
  ];

  return (
    <div className='era-transition-demo'>
      <h1>Era Transition System Demo</h1>
      <p>
        This demo showcases the era transition system that morphs models between Roman and Cyberpunk
        eras. Click the transition button to see the morphing effect in action.
      </p>

      <div className='controls' style={{ marginBottom: '20px' }}>
        <div>
          <label htmlFor='transition-speed'>Transition Speed: {transitionSpeed.toFixed(1)}</label>
          <input
            id='transition-speed'
            type='range'
            min='0.5'
            max='5'
            step='0.1'
            value={transitionSpeed}
            onChange={(e) => setTransitionSpeed(parseFloat(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <label htmlFor='environment-preset'>Environment: </label>
          <select
            id='environment-preset'
            value={currentPreset}
            onChange={(e) => setCurrentPreset(e.target.value)}
            style={{ marginLeft: '10px' }}>
            {environmentPresets.map((preset) => (
              <option key={preset} value={preset}>
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='models-container' style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {buildingModels.map((model, index) => (
          <div key={index} style={{ width: 'calc(50% - 10px)', minWidth: '300px' }}>
            <h3>{model.name}</h3>
            <EraTransitionModelViewer
              romanModelUrl={model.romanUrl}
              cyberpunkModelUrl={model.cyberpunkUrl}
              height='400px'
              initialEra={Era.Roman}
              transitionSpeed={transitionSpeed}
              environmentPreset={currentPreset as EnvironmentPreset}
              showControls={true}
            />
          </div>
        ))}
      </div>

      <div className='info-section' style={{ marginTop: '30px' }}>
        <h2>How It Works</h2>
        <p>
          The era transition system uses Three.js morph targets to smoothly transform between Roman
          and Cyberpunk models. The system requires models with matching topology and vertex counts
          to create a seamless morphing effect.
        </p>

        <h3>Key Features:</h3>
        <ul>
          <li>Smooth geometry morphing between eras</li>
          <li>Material transitions for visual effects</li>
          <li>Configurable transition speed</li>
          <li>Integration with the Entity Component System (ECS)</li>
          <li>Support for different environment lighting</li>
        </ul>

        <p>
          <strong>Note:</strong> For this demo to work properly, you need to have the sample GLB
          models in the correct paths. If you don't see the models, check the console for errors and
          ensure the model paths are correct.
        </p>
      </div>
    </div>
  );
};

export default EraTransitionDemo;
