import { useEffect, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { disposeObject } from '../utils/three/disposalUtils';

/**
 * Enum representing the different eras in the game
 */
export enum Era {
  Roman = 'roman',
  Transitional = 'transitional',
  Cyberpunk = 'cyberpunk',
}

/**
 * Interface for morph target definition
 */
export interface MorphTarget {
  name: string;
  vertices: THREE.Vector3[];
  normals?: THREE.Vector3[];
}

/**
 * Interface for model transition state
 */
export interface ModelTransitionState {
  currentEra: Era;
  targetEra: Era;
  transitionProgress: number; // 0 to 1
  transitionSpeed: number; // units per second
  isTransitioning: boolean;
}

/**
 * Interface for era model pair
 */
export interface EraModelPair {
  romanModel: THREE.Group;
  cyberpunkModel: THREE.Group;
  morphTargets?: MorphTarget[];
  morphedGeometries?: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
}

/**
 * Interface for useModelLoader hook parameters
 */
export interface UseModelLoaderParams {
  romanModelUrl: string;
  cyberpunkModelUrl: string;
  initialEra?: Era;
  transitionSpeed?: number; // Transition speed in seconds
  onTransitionComplete?: (era: Era) => void;
}

/**
 * Interface for useModelLoader hook return value
 */
export interface UseModelLoaderResult {
  modelRef: React.RefObject<THREE.Group | null>;
  currentEra: Era;
  isTransitioning: boolean;
  transitionProgress: number;
  transitionToEra: (era: Era) => void;
  models: EraModelPair | null;
}

/**
 * A custom hook for loading and transitioning between Roman and Cyberpunk models
 *
 * This hook provides functionality to:
 * - Load Roman and Cyberpunk GLB models
 * - Generate morph targets between models with matching geometry
 * - Handle smooth transitions between eras with proper morph target influences
 * - Manage model lifecycle and cleanup
 *
 * @param params Parameters for model loading and configuration
 * @returns Object containing model reference and transition controls
 */
export function useModelLoader({
  romanModelUrl,
  cyberpunkModelUrl,
  initialEra = Era.Roman,
  transitionSpeed = 2.0,
  onTransitionComplete,
}: UseModelLoaderParams): UseModelLoaderResult {
  // Model and transition state
  const modelRef = useRef<THREE.Group>(null);
  const [modelState, setModelState] = useState<EraModelPair | null>(null);
  const [transitionState, setTransitionState] = useState<ModelTransitionState>({
    currentEra: initialEra,
    targetEra: initialEra,
    transitionProgress: 0,
    transitionSpeed,
    isTransitioning: false,
  });

  // Load models using drei's useGLTF
  const { scene: romanScene } = useGLTF(romanModelUrl);
  const { scene: cyberpunkScene } = useGLTF(cyberpunkModelUrl);

  /**
   * Prepare models for morphing by generating morph targets
   */
  const prepareModels = useCallback(() => {
    if (!romanScene || !cyberpunkScene) return null;

    // Clone the models to avoid modifying the cached versions
    const romanModel = romanScene.clone();
    const cyberpunkModel = cyberpunkScene.clone();

    // Set initial visibility based on starting era
    cyberpunkModel.visible = initialEra === Era.Cyberpunk;
    romanModel.visible = initialEra === Era.Roman;

    // Map to store morphed geometries
    const morphedGeometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

    // Process each mesh in the Roman model to find corresponding meshes in Cyberpunk model
    romanModel.traverse((romanObj) => {
      if (!(romanObj instanceof THREE.Mesh)) return;

      // Find corresponding mesh in cyberpunk model by name
      let cyberpunkObj: THREE.Object3D | null = null;
      cyberpunkModel.traverse((obj) => {
        if (obj.name === romanObj.name && obj instanceof THREE.Mesh) {
          cyberpunkObj = obj;
        }
      });

      if (cyberpunkObj && (cyberpunkObj as THREE.Object3D) instanceof THREE.Mesh) {
        // Create morph targets for this pair of meshes
        const romanGeom = romanObj.geometry;
        const cyberpunkGeom = (cyberpunkObj as THREE.Mesh).geometry;

        // Only process geometries with the same number of vertices
        if (romanGeom.attributes.position.count === cyberpunkGeom.attributes.position.count) {
          // Store for later morphing
          morphedGeometries.set(romanGeom, cyberpunkGeom);

          // Prepare morphing attributes
          if (!romanGeom.morphAttributes.position) {
            romanGeom.morphAttributes.position = [];
          }

          // Create a morph target from the cyberpunk geometry
          const positionAttribute = cyberpunkGeom.attributes.position;
          const morphPositions = new Float32Array(positionAttribute.array.length);

          // Calculate the position differences for morphing
          for (let i = 0; i < positionAttribute.count; i++) {
            const romanPos = new THREE.Vector3();
            const cyberpunkPos = new THREE.Vector3();

            // Get positions from both geometries
            romanPos.fromBufferAttribute(romanGeom.attributes.position, i);
            cyberpunkPos.fromBufferAttribute(positionAttribute, i);

            // Calculate the delta (target - base)
            const idx = i * 3;
            morphPositions[idx] = cyberpunkPos.x - romanPos.x;
            morphPositions[idx + 1] = cyberpunkPos.y - romanPos.y;
            morphPositions[idx + 2] = cyberpunkPos.z - romanPos.z;
          }

          // Add the morph target
          romanGeom.morphAttributes.position.push(new THREE.BufferAttribute(morphPositions, 3));

          // Enable morphing on the mesh
          if (romanObj.morphTargetInfluences) {
            romanObj.morphTargetInfluences[0] = initialEra === Era.Roman ? 0 : 1;
          }

          // Configure material for morphing if it's a standard material
          if (romanObj.material instanceof THREE.Material) {
            const material = romanObj.material as THREE.MeshStandardMaterial;
            if ('morphTargets' in material) {
              material.morphTargets = true;
            }
          }
        }
      }
    });

    return {
      romanModel,
      cyberpunkModel,
      morphedGeometries,
    };
  }, [romanScene, cyberpunkScene, initialEra]);

  // Initialize the models
  useEffect(() => {
    if (!modelRef.current) return;

    const models = prepareModels();
    if (!models) return;

    // Add the models to the scene
    modelRef.current.add(models.romanModel);

    setModelState(models);

    // Clean up
    return () => {
      if (modelRef.current) {
        disposeObject(modelRef.current);
      }
    };
  }, [prepareModels]);

  /**
   * Transition to a specific era
   */
  const transitionToEra = useCallback((era: Era) => {
    setTransitionState((prev) => ({
      ...prev,
      targetEra: era,
      isTransitioning: prev.currentEra !== era,
    }));
  }, []);

  // Process the transition on each frame
  useFrame((_, delta) => {
    if (!modelRef.current || !modelState) return;

    // Process transition if needed
    if (transitionState.isTransitioning) {
      // Calculate new transition progress
      let newProgress = transitionState.transitionProgress;
      const direction = transitionState.targetEra === Era.Roman ? -1 : 1;
      newProgress += direction * (delta * transitionState.transitionSpeed);

      // Clamp progress between 0 and 1
      newProgress = Math.max(0, Math.min(1, newProgress));

      // Apply morph target influences to each morphable mesh
      modelState.romanModel.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.morphTargetInfluences &&
          obj.morphTargetInfluences.length > 0
        ) {
          obj.morphTargetInfluences[0] = newProgress;
        }
      });

      // Check if transition is complete
      const isComplete =
        (newProgress <= 0 && transitionState.targetEra === Era.Roman) ||
        (newProgress >= 1 && transitionState.targetEra === Era.Cyberpunk);

      // Update transition state
      setTransitionState((prev) => ({
        ...prev,
        transitionProgress: newProgress,
        isTransitioning: !isComplete,
        currentEra: isComplete ? prev.targetEra : prev.currentEra,
      }));

      // Notify when transition completes
      if (isComplete && onTransitionComplete) {
        onTransitionComplete(transitionState.targetEra);
      }
    }
  });

  // Preload the models to improve performance
  useEffect(() => {
    useGLTF.preload(romanModelUrl);
    useGLTF.preload(cyberpunkModelUrl);

    return () => {
      // Attempt to clear preloaded models from cache when hook is unmounted
      // Note: drei's useGLTF doesn't expose a clear method, so this might not fully cleanup
    };
  }, [romanModelUrl, cyberpunkModelUrl]);

  return {
    modelRef,
    currentEra: transitionState.currentEra,
    isTransitioning: transitionState.isTransitioning,
    transitionProgress: transitionState.transitionProgress,
    transitionToEra,
    models: modelState,
  };
}
