import * as THREE from 'three';

/**
 * Component for models loaded with the ModelLoader
 * Handles model loading configuration and caching
 */
export interface ModelLoaderComponent {
  /** Unique identifier for the component type */
  readonly type: string;
  
  /** URL of the Roman era model */
  romanModelUrl: string;
  
  /** Optional URL of the Cyberpunk era model for transitions */
  cyberpunkModelUrl?: string;
  
  /** Position of the model in 3D space */
  position?: THREE.Vector3;
  
  /** Rotation of the model */
  rotation?: THREE.Euler;
  
  /** Scale of the model */
  scale?: THREE.Vector3;
  
  /** Whether the component is enabled and should be processed */
  enabled: boolean;
  
  /** Whether the model has been loaded successfully */
  loaded: boolean;
  
  /** Reference to the loaded THREE.js model/group */
  model?: THREE.Group;
  
  /** Whether to use morph targets for geometry transitions */
  useMorphTargets: boolean;
  
  /** Visibility state of the model */
  visible?: boolean;
  
  /** Custom user data to attach to the model */
  userData?: Record<string, unknown>;
}

/**
 * Creates a new ModelLoaderComponent with the provided parameters
 */
export function createModelLoaderComponent(params: {
  romanModelUrl: string;
  cyberpunkModelUrl?: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  enabled?: boolean;
  visible?: boolean;
  useMorphTargets?: boolean;
  userData?: Record<string, unknown>;
}): ModelLoaderComponent {
  return {
    type: 'modelLoader',
    romanModelUrl: params.romanModelUrl,
    cyberpunkModelUrl: params.cyberpunkModelUrl,
    position: params.position,
    rotation: params.rotation,
    scale: params.scale,
    enabled: params.enabled ?? true,
    loaded: false,
    useMorphTargets: params.useMorphTargets ?? true,
    visible: params.visible ?? true,
    userData: params.userData,
  };
}