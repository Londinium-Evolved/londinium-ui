import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { disposeObject } from '../../utils/three/disposalUtils';

// Define Era enum here for this component
export enum Era {
  Roman = 'roman',
  Transitional = 'transitional',
  Cyberpunk = 'cyberpunk',
}

// Define types for era transition
interface MorphTarget {
  name: string;
  vertices: THREE.Vector3[];
  normals?: THREE.Vector3[];
}

interface ModelTransitionState {
  currentEra: Era;
  targetEra: Era;
  transitionProgress: number; // 0 to 1
  transitionSpeed: number; // units per second
  isTransitioning: boolean;
}

interface EraModelPair {
  romanModel: THREE.Group;
  cyberpunkModel: THREE.Group;
  morphTargets?: MorphTarget[];
  morphedGeometries?: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
}

interface ModelTransitionLoaderProps {
  romanModelUrl: string;
  cyberpunkModelUrl: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  initialEra?: Era;
  transitionSpeed?: number; // Transition speed in seconds
  onTransitionComplete?: (era: Era) => void;
}

/**
 * A component that loads GLB models and supports morphing transitions between Roman and Cyberpunk eras
 */
export const ModelTransitionLoader = forwardRef<
  { transitionToEra: (era: Era) => void },
  ModelTransitionLoaderProps
>(
  (
    {
      romanModelUrl,
      cyberpunkModelUrl,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = [1, 1, 1],
      initialEra = Era.Roman,
      transitionSpeed = 2.0,
      onTransitionComplete,
    },
    ref
  ) => {
    // Refs and state
    const groupRef = useRef<THREE.Group>(null);
    const [modelState, setModelState] = useState<EraModelPair | null>(null);
    const [transitionState, setTransitionState] = useState<ModelTransitionState>({
      currentEra: initialEra,
      targetEra: initialEra,
      transitionProgress: 0,
      transitionSpeed,
      isTransitioning: false,
    });

    // Load models
    const { scene: romanScene } = useGLTF(romanModelUrl);
    const { scene: cyberpunkScene } = useGLTF(cyberpunkModelUrl);

    // Prepare the models for morphing
    const prepareModels = useCallback(() => {
      if (!romanScene || !cyberpunkScene) return null;

      // Clone the models to avoid modifying the cached versions
      const romanModel = romanScene.clone();
      const cyberpunkModel = cyberpunkScene.clone();

      // Hide the cyberpunk model initially if we're starting in Roman era
      cyberpunkModel.visible = initialEra === Era.Cyberpunk;
      romanModel.visible = initialEra === Era.Roman;

      // Generate morph targets for each matching mesh
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
      if (!groupRef.current) return;

      const models = prepareModels();
      if (!models) return;

      // Add the models to the scene
      groupRef.current.add(models.romanModel);
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
      groupRef.current.scale.set(...scale);

      setModelState(models);

      // Clean up
      return () => {
        if (groupRef.current) {
          disposeObject(groupRef.current);
        }
      };
    }, [prepareModels, position, rotation, scale]);

    // Public method to trigger a transition to a specific era
    const transitionToEra = useCallback((era: Era) => {
      setTransitionState((prev) => ({
        ...prev,
        targetEra: era,
        isTransitioning: prev.currentEra !== era,
      }));
    }, []);

    // Expose the transition method to parent components
    useImperativeHandle(
      ref,
      () => ({
        transitionToEra,
      }),
      [transitionToEra]
    );

    // Update the model on each frame
    useFrame((_, delta) => {
      if (!groupRef.current || !modelState) return;

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

        // Capture a stable reference to targetEra before updating state
        const stableTargetEra = transitionState.targetEra;

        // Update transition state
        setTransitionState((prev) => ({
          ...prev,
          transitionProgress: newProgress,
          isTransitioning: !isComplete,
          currentEra: isComplete ? prev.targetEra : prev.currentEra,
        }));

        // Notify when transition completes using the captured stable value
        if (isComplete && onTransitionComplete) {
          onTransitionComplete(stableTargetEra);
        }
      }
    });

    return <group ref={groupRef} />;
  }
);

// Preload all models for better performance
useGLTF.preload('/assets/models/roman/mvp_Insulae_v1.glb');
useGLTF.preload('/assets/models/cyberpunk/default_building.glb');
