import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { ModelLoader } from './ModelLoader';

interface GlbModelViewerProps {
  modelUrl: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  backgroundColor?: string;
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
}

/**
 * GlbModelViewer - A component to display 3D models from GLB files using the ECS system
 *
 * This component creates a viewing environment for 3D models with camera controls,
 * lighting, and environment maps. It uses the ModelLoader component which integrates
 * with our Entity Component System.
 *
 * @example
 * <GlbModelViewer
 *   modelUrl="/assets/models/roman_building.glb"
 *   position={[0, 0, 0]}
 *   rotation={[0, 0, 0]}
 *   scale={[1, 1, 1]}
 *   environmentPreset="sunset"
 * />
 */
export const GlbModelViewer: React.FC<GlbModelViewerProps> = ({
  modelUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  backgroundColor = '#f0f0f0',
  environmentPreset = 'city',
}) => {
  return (
    <div style={{ width: '100%', height: '500px', background: backgroundColor }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        {/* Environment and lighting */}
        <Environment preset={environmentPreset} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* The 3D model */}
        <ModelLoader url={modelUrl} position={position} rotation={rotation} scale={scale} />

        {/* Camera controls */}
        <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
};

/**
 * Usage example with the glb file:
 *
 * import { GlbModelViewer } from './components/game/GlbModelViewer';
 *
 * function App() {
 *   return (
 *     <div className="App">
 *       <h1>My 3D Model Viewer</h1>
 *       <GlbModelViewer
 *         modelUrl="/path/to/your/model.glb"
 *         position={[0, 0, 0]}
 *         scale={[1, 1, 1]}
 *       />
 *     </div>
 *   );
 * }
 */
