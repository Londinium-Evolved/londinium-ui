import { System } from '../../System';
import { EntityManager } from '../../EntityManager';
import { Component } from '../../types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Define component interfaces
interface PositionComponent extends Component {
  x: number;
  y: number;
  z: number;
}

interface RotationComponent extends Component {
  x: number;
  y: number;
  z: number;
}

interface ScaleComponent extends Component {
  x: number;
  y: number;
  z: number;
}

// Model resource cache to avoid loading the same model multiple times
const modelCache: Record<string, THREE.Group> = {};
const loader = new GLTFLoader();

/**
 * Component that holds GLB/GLTF model data
 */
export interface GlbModelComponent extends Component {
  url: string;
  loaded: boolean;
  visible: boolean;
  model?: THREE.Group;
}

/**
 * System that handles loading and managing GLB models
 */
export class ModelSystem extends System {
  private scene: THREE.Scene;
  private modelComponents: Map<string, GlbModelComponent> = new Map();

  constructor(entityManager: EntityManager, scene: THREE.Scene) {
    super(entityManager);
    this.scene = scene;

    // Define which components this system processes
    this.componentsRequired = ['position', 'glbModel'];
  }

  /**
   * Load a model from URL and cache it
   */
  private loadModel(url: string): Promise<THREE.Group> {
    // Check if the model is already in the cache
    if (modelCache[url]) {
      return Promise.resolve(modelCache[url].clone());
    }

    // If not, load it
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          // Store in cache and return
          modelCache[url] = gltf.scene;
          resolve(gltf.scene.clone());
        },
        undefined,
        (error) => {
          console.error(`Error loading model ${url}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Add a model to an entity
   */
  public addModelToEntity(entityId: string, url: string): void {
    const component: GlbModelComponent = {
      type: 'glbModel',
      url,
      loaded: false,
      visible: true,
    };

    this.modelComponents.set(entityId, component);
    this.entityManager.addComponent(entityId, component);

    // Start loading the model
    this.loadModel(url)
      .then((model) => {
        // Update the component with the loaded model
        component.model = model;
        component.loaded = true;

        // Get the entity's position to place the model
        const position = this.entityManager.getComponent<PositionComponent>(entityId, 'position');
        if (position) {
          model.position.set(position.x, position.y, position.z);
        }

        // Add the model to the scene
        this.scene.add(model);
      })
      .catch((error) => {
        console.error(`Failed to load model for entity ${entityId}:`, error);
      });
  }

  /**
   * Process entities with model components
   */
  public process(entityIds: string[], _deltaTime: number): void {
    void _deltaTime; // Mark parameter as used
    for (const entityId of entityIds) {
      const modelComponent = this.entityManager.getComponent<GlbModelComponent>(
        entityId,
        'glbModel'
      );

      if (!modelComponent || !modelComponent.loaded || !modelComponent.model) {
        continue;
      }

      // Update model visibility
      modelComponent.model.visible = modelComponent.visible;

      // Update model position from position component
      const position = this.entityManager.getComponent<PositionComponent>(entityId, 'position');
      if (position) {
        modelComponent.model.position.set(position.x, position.y, position.z);
      }

      // Update rotation if there's a rotation component
      const rotation = this.entityManager.getComponent<RotationComponent>(entityId, 'rotation');
      if (rotation) {
        modelComponent.model.rotation.set(rotation.x, rotation.y, rotation.z);
      }

      // Update scale if there's a scale component
      const scale = this.entityManager.getComponent<ScaleComponent>(entityId, 'scale');
      if (scale) {
        modelComponent.model.scale.set(scale.x, scale.y, scale.z);
      }
    }
  }

  /**
   * Clean up resources when system is destroyed
   */
  public dispose(): void {
    // Remove all models from the scene and dispose resources
    this.modelComponents.forEach((component) => {
      if (component.model) {
        this.scene.remove(component.model);

        // Dispose geometries and materials
        component.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }

            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    });

    this.modelComponents.clear();
  }
}
