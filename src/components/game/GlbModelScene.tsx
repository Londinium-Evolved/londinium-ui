import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { EntityManager } from '../../ecs';
import { SystemManager } from '../../ecs';
import { System } from '../../ecs';

// Create a simple version of position and rotation components for this demo
interface PositionComponent {
  type: string;
  x: number;
  y: number;
  z: number;
}

interface RotationComponent {
  type: string;
  x: number;
  y: number;
  z: number;
}

// A simplified GLB model component
interface ModelComponent {
  type: string;
  url: string;
  visible: boolean;
}

/**
 * Props for the GlbModelWithECS component
 */
interface GlbModelSceneProps {
  modelUrl: string;
  width?: string | number;
  height?: string | number;
  backgroundColor?: string;
}

/**
 * A scene component that renders a GLB model using ECS principles
 */
const ModelEntity: React.FC<{ entityId: string; entityManager: EntityManager; url: string }> = ({
  entityId,
  entityManager,
  url,
}) => {
  const { scene: modelScene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  // Initialize the model
  useEffect(() => {
    if (!modelRef.current) return;

    // Clone the model to avoid modifying the cached version
    const modelClone = modelScene.clone();
    modelRef.current.add(modelClone);

    // Clean up
    return () => {
      if (modelRef.current) {
        // Remove and dispose the model
        while (modelRef.current.children.length > 0) {
          const child = modelRef.current.children[0];
          modelRef.current.remove(child);
        }
      }
    };
  }, [modelScene]);

  // Update model transform from entity components on each frame
  useFrame(() => {
    if (!modelRef.current) return;

    // Get position component
    const position = entityManager.getComponent<PositionComponent>(entityId, 'position');
    if (position) {
      modelRef.current.position.set(position.x, position.y, position.z);
    }

    // Get rotation component
    const rotation = entityManager.getComponent<RotationComponent>(entityId, 'rotation');
    if (rotation) {
      modelRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    // Check visibility
    const model = entityManager.getComponent<ModelComponent>(entityId, 'model');
    if (model) {
      modelRef.current.visible = model.visible;
    }
  });

  return <group ref={modelRef} />;
};

/**
 * System processor that handles entities in the scene
 */
const SystemProcessor: React.FC<{ systemManager: SystemManager }> = ({ systemManager }) => {
  // Process systems every frame
  useFrame((_, delta) => {
    systemManager.update(delta);
  });

  return null;
};

/**
 * Main component that sets up the scene with ECS
 */
export const GlbModelScene: React.FC<GlbModelSceneProps> = ({
  modelUrl,
  width = '100%',
  height = '500px',
  backgroundColor = '#f0f0f0',
}) => {
  // Create entity and system managers
  const [entityManager] = useState(() => new EntityManager());
  const [systemManager] = useState(() => new SystemManager(entityManager));
  const [entityId] = useState(() => entityManager.createEntity());

  // Setup entity components
  useEffect(() => {
    // Add components to the entity
    entityManager.addComponent(entityId, {
      type: 'position',
      x: 0,
      y: 0,
      z: 0,
    });

    entityManager.addComponent(entityId, {
      type: 'rotation',
      x: 0,
      y: 0,
      z: 0,
    });

    entityManager.addComponent(entityId, {
      type: 'model',
      url: modelUrl,
      visible: true,
    });

    // Create a simple rotation system for demonstration
    const rotationSystem = new (class RotationSystem extends System {
      constructor(entityManager: EntityManager) {
        super(entityManager);
        this.componentsRequired = ['rotation'];
      }

      process(entities: string[], deltaTime: number): void {
        entities.forEach((id) => {
          const rotation = entityManager.getComponent<RotationComponent>(id, 'rotation');
          if (rotation) {
            // Simple continuous rotation on Y axis
            rotation.y += deltaTime * 0.5;
          }
        });
      }
    })(entityManager);

    // Register the system
    systemManager.registerSystem(rotationSystem);

    // Cleanup on unmount
    return () => {
      entityManager.removeEntity(entityId);
    };
  }, [entityId, entityManager, modelUrl, systemManager]);

  return (
    <div style={{ width, height, background: backgroundColor }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        {/* Setup environment and lighting */}
        <Environment preset='city' />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* The model entity */}
        <ModelEntity entityId={entityId} entityManager={entityManager} url={modelUrl} />

        {/* Process systems */}
        <SystemProcessor systemManager={systemManager} />

        {/* Camera controls */}
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
};

/**
 * Usage example:
 *
 * <GlbModelScene
 *   modelUrl="/path/to/your/model.glb"
 *   width="800px"
 *   height="600px"
 * />
 */

// Preload the model to improve performance
useGLTF.preload('/path/to/model.glb');
