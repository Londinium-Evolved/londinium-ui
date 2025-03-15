import React, { useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { disposeObject } from '../../utils/three/disposalUtils';
import { EntityManager } from '../../ecs';
import { SystemManager } from '../../ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  ModelComponent,
} from '../../ecs/examples/components';
import { Era, useModelLoader } from '../../hooks/useModelLoader';

interface ModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  entityId?: string; // Optional entity ID if connected to an existing entity
}

/**
 * Component that loads and renders a GLB/GLTF model
 * Integrates with the ECS system by creating entities with appropriate components
 */
export const ModelLoader: React.FC<ModelLoaderProps> = ({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  entityId,
}) => {
  const [modelEntity, setModelEntity] = useState<string | null>(null);
  const [entityManager] = useState(() => new EntityManager());
  const [systemManager] = useState(() => new SystemManager(entityManager));

  // Load the GLB model
  const { scene: modelScene } = useGLTF(url);

  // Create a clone of the model to avoid modifying the cached original
  const modelRef = React.useRef<THREE.Group>(null);

  // Initialize the model entity
  const initializeEntity = useCallback(() => {
    // Create or use the provided entity ID
    const id = entityId || entityManager.createEntity();

    // Add components to the entity
    entityManager.addComponent(id, new PositionComponent(...position));
    entityManager.addComponent(id, new RotationComponent(...rotation));
    entityManager.addComponent(id, new ScaleComponent(...scale));
    entityManager.addComponent(id, new ModelComponent(url, true));

    // Store the entity ID for later use
    setModelEntity(id);

    return id;
  }, [entityId, entityManager, position, rotation, scale, url]);

  // Initialize the entity and load the model
  useEffect(() => {
    if (!modelRef.current) return;

    // Create an entity for the model
    const entity = initializeEntity();

    // Clone the model and add it to the scene
    const modelClone = modelScene.clone();
    modelRef.current.add(modelClone);

    // Get the position component from the entity
    const posComponent = entityManager.getComponent<PositionComponent>(entity, 'position');

    // Set the model position from the component
    if (posComponent) {
      modelRef.current.position.set(posComponent.x, posComponent.y, posComponent.z);
    }

    // Apply rotation and scale similarly...
    const rotComponent = entityManager.getComponent<RotationComponent>(entity, 'rotation');
    if (rotComponent) {
      modelRef.current.rotation.set(rotComponent.x, rotComponent.y, rotComponent.z);
    }

    const scaleComponent = entityManager.getComponent<ScaleComponent>(entity, 'scale');
    if (scaleComponent) {
      modelRef.current.scale.set(scaleComponent.x, scaleComponent.y, scaleComponent.z);
    }

    // Clean up when component unmounts
    return () => {
      if (modelRef.current) {
        disposeObject(modelRef.current);
      }

      // Remove the entity if it was created by this component
      if (!entityId && modelEntity) {
        entityManager.removeEntity(modelEntity);
      }
    };
  }, [entityManager, initializeEntity, modelEntity, modelScene, entityId]);

  // Update model transforms based on entity components on each frame
  useFrame(() => {
    if (!modelRef.current || !modelEntity) return;

    // Update systems first
    systemManager.update(0.016); // Assuming ~60fps

    // Get the latest component values
    const posComponent = entityManager.getComponent<PositionComponent>(modelEntity, 'position');
    if (posComponent) {
      modelRef.current.position.set(posComponent.x, posComponent.y, posComponent.z);
    }

    const rotComponent = entityManager.getComponent<RotationComponent>(modelEntity, 'rotation');
    if (rotComponent) {
      modelRef.current.rotation.set(rotComponent.x, rotComponent.y, rotComponent.z);
    }

    const scaleComponent = entityManager.getComponent<ScaleComponent>(modelEntity, 'scale');
    if (scaleComponent) {
      modelRef.current.scale.set(scaleComponent.x, scaleComponent.y, scaleComponent.z);
    }

    // Check if the model should be visible
    const modelComponent = entityManager.getComponent<ModelComponent>(modelEntity, 'model');
    if (modelComponent) {
      modelRef.current.visible = modelComponent.visible;
    }
  });

  return <group ref={modelRef} />;
};

// Preload the model to improve performance
useGLTF.preload('/path/to/your/model.glb');

// Props for standard GLB model without transitions
interface StandardModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

// Props for era transition model loader
interface EraModelLoaderProps {
  romanModelUrl: string;
  cyberpunkModelUrl: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  initialEra?: Era;
  transitionSpeed?: number;
  onTransitionComplete?: (era: Era) => void;
  useShaderEffect?: boolean; // Whether to use custom shader for visual effects
}

/**
 * Component that loads and renders a standard GLB/GLTF model
 */
export const StandardModelLoader: React.FC<StandardModelLoaderProps> = ({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) => {
  // Load the GLB model
  const { scene } = useGLTF(url);
  const modelRef = React.useRef<THREE.Group>(null);

  // Clone and add the model to the scene
  React.useEffect(() => {
    if (!modelRef.current) return;

    // Clone the model to avoid modifying the cached version
    const modelClone = scene.clone();
    modelRef.current.add(modelClone);

    // Apply transformations
    modelRef.current.position.set(...position);
    modelRef.current.rotation.set(...rotation);
    modelRef.current.scale.set(...scale);

    // Clean up when component unmounts
    return () => {
      if (modelRef.current) {
        while (modelRef.current.children.length) {
          const child = modelRef.current.children[0];
          modelRef.current.remove(child);
        }
      }
    };
  }, [scene, position, rotation, scale]);

  return <group ref={modelRef} />;
};

/**
 * Component that loads and renders models with era transition capabilities
 * This component uses the useModelLoader hook to handle transitions between
 * Roman and Cyberpunk era models.
 */
export const EraModelLoader: React.FC<
  EraModelLoaderProps & {
    // Additional props to expose hook functionality if needed
    onRef?: (ref: { transitionToEra: (era: Era) => void; currentEra: Era }) => void;
  }
> = ({
  romanModelUrl,
  cyberpunkModelUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  initialEra = Era.Roman,
  transitionSpeed = 2.0,
  onTransitionComplete,
  onRef,
  useShaderEffect = false,
}) => {
  // Use our custom hook to handle model loading and transitions
  const { modelRef, currentEra, transitionToEra } = useModelLoader({
    romanModelUrl,
    cyberpunkModelUrl,
    initialEra,
    transitionSpeed,
    onTransitionComplete,
    useShaderEffect,
  });

  // Expose hook functions to parent component via callback
  React.useEffect(() => {
    if (onRef) {
      onRef({ transitionToEra, currentEra });
    }
  }, [onRef, transitionToEra, currentEra]);

  // Apply transformations
  React.useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.position.set(...position);
    modelRef.current.rotation.set(...rotation);
    modelRef.current.scale.set(...scale);
  }, [position, rotation, scale]);

  return <group ref={modelRef} />;
};

// Preload common models to improve performance
useGLTF.preload('/assets/models/roman/default_building.glb');
useGLTF.preload('/assets/models/cyberpunk/default_building.glb');
