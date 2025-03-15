import { System } from '../System';
import { EntityManager } from '../EntityManager';
import * as THREE from 'three';
import { EraTransitionComponent, Era } from '../components/EraTransitionComponent';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TransitionMaterialManager } from '../../shaders/TransitionShader';

// Define interface for materials that support morphing
interface MorphableMaterial extends THREE.Material {
  morphTargets?: boolean;
}

/**
 * Component for GLB models with morphing capability
 */
export interface GlbModelComponent {
  type: string;
  romanModel?: THREE.Group;
  cyberpunkModel?: THREE.Group;
  activeModel?: THREE.Group;
  morphTargets?: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
  romanModelUrl?: string;
  cyberpunkModelUrl?: string;
  isLoaded: boolean;
  transitionProgress?: number;
  useShaderEffect?: boolean;
  shaderManager?: TransitionMaterialManager;
}

/**
 * System that manages era transitions for GLB models
 * This system uses logic consistent with the useModelLoader hook
 */
export class ModelTransitionSystem extends System {
  private scene: THREE.Scene;
  private gltfLoader: GLTFLoader;

  constructor(entityManager: EntityManager, scene: THREE.Scene) {
    super(entityManager);
    this.scene = scene;
    this.componentsRequired = ['eraTransition', 'glbModel'];
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Process entities with era transition components
   * @param entityIds Entity IDs to process
   * @param deltaTime Time elapsed since last update in seconds
   */
  process(entityIds: string[], deltaTime: number): void {
    for (const entityId of entityIds) {
      // Get required components
      const eraTransition = this.entityManager.getComponent<EraTransitionComponent>(
        entityId,
        'eraTransition'
      );

      const modelComponent = this.entityManager.getComponent<GlbModelComponent>(
        entityId,
        'glbModel'
      );

      // Skip if any component is missing or model is not loaded
      if (!eraTransition || !modelComponent || !modelComponent.isLoaded) continue;

      // Update transition progress if transitioning
      if (eraTransition.isTransitioning) {
        // Update the transition progress
        const direction = eraTransition.targetEra === Era.Roman ? -1 : 1;
        let newProgress =
          eraTransition.transitionProgress +
          direction * (deltaTime * eraTransition.transitionSpeed);

        // Clamp progress between 0 and 1
        newProgress = Math.max(0, Math.min(1, newProgress));
        eraTransition.transitionProgress = newProgress;

        // Apply the transition to model morphing
        this.applyTransitionToModel(modelComponent, newProgress);

        // Store progress for external access
        modelComponent.transitionProgress = newProgress;

        // Check if transition is complete
        const isComplete =
          (newProgress <= 0 && eraTransition.targetEra === Era.Roman) ||
          (newProgress >= 1 && eraTransition.targetEra === Era.Cyberpunk);

        // Handle transition completion
        if (isComplete) {
          eraTransition.isTransitioning = false;
          eraTransition.currentEra = eraTransition.targetEra;
        }
      }
    }
  }

  /**
   * Apply transition progress to model morphing
   * @param modelComponent The model component to update
   * @param progress Transition progress from 0 (Roman) to 1 (Cyberpunk)
   */
  private applyTransitionToModel(modelComponent: GlbModelComponent, progress: number): void {
    // In ECS we primarily work with the romanModel as the base
    if (!modelComponent.romanModel) return;

    // Apply morph target influences to each mesh
    modelComponent.romanModel.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.morphTargetInfluences &&
        obj.morphTargetInfluences.length > 0
      ) {
        // Set the morph target influence based on transition progress
        obj.morphTargetInfluences[0] = progress;
      }
    });

    // Apply shader transition effects if enabled
    if (modelComponent.useShaderEffect && modelComponent.shaderManager) {
      modelComponent.shaderManager.updateTransitionProgress(progress);
    }
  }

  /**
   * Load models for an entity
   * @param entityId Entity ID to load models for
   * @param romanUrl URL to Roman era model
   * @param cyberpunkUrl URL to Cyberpunk era model
   * @param options Optional options for loading
   */
  loadModelsForEntity(
    entityId: string,
    romanUrl: string,
    cyberpunkUrl: string,
    options?: { useShaderEffect?: boolean }
  ): void {
    // Entity must have the needed components
    if (
      !this.entityManager.hasComponent(entityId, 'eraTransition') ||
      !this.entityManager.hasComponent(entityId, 'glbModel')
    ) {
      return;
    }

    // Get the GLB model component
    const modelComponent = this.entityManager.getComponent<GlbModelComponent>(entityId, 'glbModel');

    if (!modelComponent) return;

    // Update the component with URLs and options
    modelComponent.romanModelUrl = romanUrl;
    modelComponent.cyberpunkModelUrl = cyberpunkUrl;
    modelComponent.isLoaded = false;
    modelComponent.useShaderEffect = options?.useShaderEffect || false;

    // Get the current era from the transition component
    const eraTransition = this.entityManager.getComponent<EraTransitionComponent>(
      entityId,
      'eraTransition'
    );

    const initialEra = eraTransition?.currentEra || Era.Roman;

    // Load both models
    Promise.all([this.loadGLTFModel(romanUrl), this.loadGLTFModel(cyberpunkUrl)])
      .then(([romanModel, cyberpunkModel]) => {
        // Store the models
        modelComponent.romanModel = romanModel;
        modelComponent.cyberpunkModel = cyberpunkModel;

        // Set visibility based on era
        romanModel.visible = initialEra === Era.Roman;
        cyberpunkModel.visible = initialEra === Era.Cyberpunk;

        // Add the Roman model to the scene (we'll morph this one)
        this.scene.add(romanModel);
        modelComponent.activeModel = romanModel;

        // Set up morph targets
        this.setupModelMorphing(modelComponent);

        // Initialize shader effects if enabled
        if (modelComponent.useShaderEffect) {
          console.log('Initializing shader effects for entity');
          modelComponent.shaderManager = new TransitionMaterialManager();
          modelComponent.shaderManager.applyToModel(romanModel);
        }

        // Mark as loaded
        modelComponent.isLoaded = true;

        // Set initial morphing and shader state if needed
        if (initialEra === Era.Cyberpunk && modelComponent.romanModel) {
          this.applyTransitionToModel(modelComponent, 1);
        }
      })
      .catch((error) => {
        console.error('Failed to load models:', error);
      });
  }

  /**
   * Load a GLTF model using the GLTFLoader
   * @param url URL to the model
   * @returns Promise resolving to the loaded model
   */
  private loadGLTFModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf: { scene: THREE.Group }) => {
          resolve(gltf.scene);
        },
        undefined,
        (event: ErrorEvent) => {
          console.error(`Error loading model from ${url}:`, event);
          reject(new Error(`Failed to load model: ${event.message}`));
        }
      );
    });
  }

  /**
   * Setup morphing between Roman and Cyberpunk models
   * @param modelComponent The model component to setup
   */
  private setupModelMorphing(modelComponent: GlbModelComponent): void {
    if (!modelComponent.romanModel || !modelComponent.cyberpunkModel) return;

    const morphTargets = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

    // Process each mesh in the Roman model to find corresponding meshes in Cyberpunk model
    modelComponent.romanModel.traverse((romanObj) => {
      if (!(romanObj instanceof THREE.Mesh)) return;

      // Find corresponding mesh in cyberpunk model by name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cyberpunkObj: any = null;
      modelComponent.cyberpunkModel?.traverse((obj) => {
        if (obj.name === romanObj.name && obj instanceof THREE.Mesh) {
          cyberpunkObj = obj;
        }
      });

      if (cyberpunkObj && cyberpunkObj instanceof THREE.Mesh) {
        // Create morph targets for this pair of meshes
        const romanGeom = romanObj.geometry;
        const cyberpunkGeom = cyberpunkObj.geometry;

        // Ensure both geometries have position attributes
        if (
          romanGeom.attributes.position &&
          cyberpunkGeom.attributes.position &&
          romanGeom.attributes.position.count === cyberpunkGeom.attributes.position.count
        ) {
          // Store for later morphing
          morphTargets.set(romanGeom, cyberpunkGeom);

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
            romanObj.morphTargetInfluences[0] = 0; // Start at 0 (Roman)
          }

          // Configure material for morphing if it's a standard material
          if (romanObj.material instanceof THREE.Material) {
            const material = romanObj.material as MorphableMaterial;
            if ('morphTargets' in material) {
              material.morphTargets = true;
            }
          }
        } else {
          console.warn(
            `Mesh "${romanObj.name}" has different vertex counts in Roman and Cyberpunk models. ` +
              `Roman: ${romanGeom.attributes.position.count}, Cyberpunk: ${cyberpunkGeom.attributes.position.count}. ` +
              `This mesh will not be morphed.`
          );
        }
      }
    });

    // Store morph targets for later use
    modelComponent.morphTargets = morphTargets;
  }
}
