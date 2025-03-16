import * as THREE from 'three';
import { System } from '../System';
import { EntityManager } from '../EntityManager';
import { EraTransitionComponent } from '../components/EraTransitionComponent';
import { modelLoader } from '../../utils/three/modelLoader';
import { EntityId } from '../types';

/**
 * Component for models loaded with the ModelLoader
 */
export interface ModelLoaderComponent {
  /** Unique ID for the component */
  readonly type: string;
  /** URL of the Roman era model */
  romanModelUrl: string;
  /** URL of the Cyberpunk era model */
  cyberpunkModelUrl?: string;
  /** Position of the model */
  position?: THREE.Vector3;
  /** Rotation of the model */
  rotation?: THREE.Euler;
  /** Scale of the model */
  scale?: THREE.Vector3;
  /** Whether the model has been loaded */
  loaded: boolean;
  /** Reference to the loaded model */
  model?: THREE.Group;
  /** Whether to automatically apply era transitions */
  autoTransition: boolean;
  /** Whether morph targets are being used for transitions */
  useMorphTargets: boolean;
}

/**
 * System that manages model loading and era transitions
 * Integrates the ModelLoader utility with the ECS architecture
 */
export class ModelLoaderSystem extends System {
  private scene: THREE.Scene;
  private loadingPromises: Map<string, Promise<void>> = new Map();

  /**
   * Create a new ModelLoaderSystem
   * @param entityManager The EntityManager
   * @param scene The THREE.Scene to add models to
   */
  constructor(entityManager: EntityManager, scene: THREE.Scene) {
    super(entityManager);
    this.scene = scene;
    this.componentsRequired = ['modelLoader'];
  }

  /**
   * Process entities with ModelLoaderComponent
   * Implements the abstract method from System
   * @param entityIds The entity IDs to process
   * @param _deltaTime Time since last update in seconds (unused in this implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected process(entityIds: EntityId[], _deltaTime: number): void {
    // Process entities with both ModelLoader and EraTransition components
    const transitionEntityIds = this.entityManager.queryEntities(['modelLoader', 'eraTransition']);

    for (const entityId of transitionEntityIds) {
      const modelComp = this.entityManager.getComponent<ModelLoaderComponent>(
        entityId,
        'modelLoader'
      );
      const eraComp = this.entityManager.getComponent<EraTransitionComponent>(
        entityId,
        'eraTransition'
      );

      if (!modelComp || !eraComp) continue;

      // Skip if the model hasn't been loaded yet
      if (!modelComp.loaded || !modelComp.model) {
        this.loadModelForEntity(entityId, modelComp);
        continue;
      }

      // If the era component is transitioning and model supports auto-transition
      if (eraComp.isTransitioning && modelComp.autoTransition) {
        this.updateModelTransition(modelComp, eraComp.transitionProgress);
      }
    }

    // Process entities that only have ModelLoader component
    for (const entityId of entityIds) {
      // Skip entities that were already processed above
      if (transitionEntityIds.includes(entityId)) continue;

      const modelComp = this.entityManager.getComponent<ModelLoaderComponent>(
        entityId,
        'modelLoader'
      );
      if (!modelComp) continue;

      if (!modelComp.loaded) {
        this.loadModelForEntity(entityId, modelComp);
      }
    }
  }

  /**
   * Load a model for an entity
   * @param entityId The entity ID
   * @param modelComp The ModelLoaderComponent
   */
  private loadModelForEntity(entityId: string, modelComp: ModelLoaderComponent): void {
    // Skip if already loading
    if (this.loadingPromises.has(entityId)) return;

    const loadPromise = this.loadModel(modelComp);
    this.loadingPromises.set(entityId, loadPromise);

    loadPromise.finally(() => {
      this.loadingPromises.delete(entityId);
    });
  }

  /**
   * Load a model for a component
   * @param modelComp The ModelLoaderComponent
   */
  private async loadModel(modelComp: ModelLoaderComponent): Promise<void> {
    try {
      // Determine if we need to load both Roman and Cyberpunk models
      if (modelComp.cyberpunkModelUrl && modelComp.useMorphTargets) {
        // Load both models for morphing
        const { romanModel, cyberpunkModel } = await modelLoader.loadModelPair(
          modelComp.romanModelUrl,
          modelComp.cyberpunkModelUrl,
          { computeNormals: true }
        );

        // Create transitionable model
        const model = modelLoader.createTransitionableModel(romanModel, cyberpunkModel);

        // Setup model properties
        this.setupModel(model, modelComp);

        // Store model reference
        modelComp.model = model;

        // Add to scene
        this.scene.add(model);
      } else {
        // Just load the Roman model
        const model = await modelLoader.loadModel(modelComp.romanModelUrl, {
          computeNormals: true,
        });

        // Setup model properties
        this.setupModel(model, modelComp);

        // Store model reference
        modelComp.model = model;

        // Add to scene
        this.scene.add(model);
      }

      // Mark as loaded
      modelComp.loaded = true;
    } catch (error) {
      console.error(`Error loading model for entity with modelLoader component:`, error);
    }
  }

  /**
   * Update a model's transition based on progress
   * @param modelComp The ModelLoaderComponent
   * @param progress The transition progress (0-1)
   */
  private updateModelTransition(modelComp: ModelLoaderComponent, progress: number): void {
    if (!modelComp.model) return;

    if (modelComp.useMorphTargets) {
      // Use morphing for geometry transition
      modelLoader.updateModelTransition(modelComp.model, progress);
    } else {
      // Just update materials
      this.updateMaterialTransition(modelComp.model, progress);
    }
  }

  /**
   * Update materials for a model based on transition progress
   * @param model The model to update
   * @param progress The transition progress (0-1)
   */
  private updateMaterialTransition(model: THREE.Group, progress: number): void {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      if (Array.isArray(object.material)) {
        // Handle multi-material objects
        object.material.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            this.interpolateMaterial(material, progress);
          }
        });
      } else if (object.material instanceof THREE.MeshStandardMaterial) {
        this.interpolateMaterial(object.material, progress);
      }
    });
  }

  /**
   * Interpolate between Roman and Cyberpunk materials
   * @param material The material to update
   * @param progress The transition progress (0-1)
   */
  private interpolateMaterial(material: THREE.MeshStandardMaterial, progress: number): void {
    // Get or create transition properties
    if (!material.userData.transitionData) {
      // Create initial reference properties
      material.userData.transitionData = {
        roman: {
          color: material.color.clone(),
          roughness: material.roughness,
          metalness: material.metalness,
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity,
        },
        cyberpunk: {
          color: new THREE.Color(0x2c3e50),
          roughness: 0.2,
          metalness: 0.8,
          emissive: new THREE.Color(0x00ffff),
          emissiveIntensity: 0.5,
        },
      };
    }

    const { roman, cyberpunk } = material.userData.transitionData;

    // Interpolate properties
    material.color.copy(roman.color).lerp(cyberpunk.color, progress);
    material.roughness = roman.roughness * (1 - progress) + cyberpunk.roughness * progress;
    material.metalness = roman.metalness * (1 - progress) + cyberpunk.metalness * progress;
    material.emissive.copy(roman.emissive).lerp(cyberpunk.emissive, progress);
    material.emissiveIntensity =
      roman.emissiveIntensity * (1 - progress) + cyberpunk.emissiveIntensity * progress;
  }

  /**
   * Setup model properties from component data
   * @param model The model to setup
   * @param modelComp The component data
   */
  private setupModel(model: THREE.Group, modelComp: ModelLoaderComponent): void {
    // Apply position, rotation, scale
    if (modelComp.position) {
      model.position.copy(modelComp.position);
    }

    if (modelComp.rotation) {
      model.rotation.copy(modelComp.rotation);
    }

    if (modelComp.scale) {
      model.scale.copy(modelComp.scale);
    }
  }

  /**
   * Create a ModelLoaderComponent
   * @param params Parameters for the component
   * @returns ModelLoaderComponent
   */
  static createComponent(params: {
    romanModelUrl: string;
    cyberpunkModelUrl?: string;
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
    autoTransition?: boolean;
    useMorphTargets?: boolean;
  }): ModelLoaderComponent {
    return {
      type: 'modelLoader',
      romanModelUrl: params.romanModelUrl,
      cyberpunkModelUrl: params.cyberpunkModelUrl,
      position: params.position,
      rotation: params.rotation,
      scale: params.scale,
      loaded: false,
      autoTransition: params.autoTransition ?? true,
      useMorphTargets: params.useMorphTargets ?? true,
    };
  }

  /**
   * Initialize the system with the scene
   * @param entityManager EntityManager
   * @param scene THREE.Scene
   */
  static createWithScene(entityManager: EntityManager, scene: THREE.Scene): ModelLoaderSystem {
    return new ModelLoaderSystem(entityManager, scene);
  }
}
