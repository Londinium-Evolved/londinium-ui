import { System } from '../System';
import { EntityManager } from '../EntityManager';
import * as THREE from 'three';
import { EraTransitionComponent, Era } from '../components/EraTransitionComponent';

// Define interface for materials that support morphing
interface MorphableMaterial extends THREE.Material {
  morphTargets?: boolean;
}

// Component for GLB models with morphing capability
interface GlbModelComponent {
  type: string;
  romanModel?: THREE.Group;
  cyberpunkModel?: THREE.Group;
  activeModel?: THREE.Group;
  morphTargets?: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
  romanModelUrl?: string;
  cyberpunkModelUrl?: string;
  isLoaded: boolean;
}

/**
 * System that manages era transitions for GLB models
 */
export class ModelTransitionSystem extends System {
  private scene: THREE.Scene;

  constructor(entityManager: EntityManager, scene: THREE.Scene) {
    super(entityManager);
    this.scene = scene;
    this.componentsRequired = ['eraTransition', 'glbModel'];
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
        const isComplete = eraTransition.updateTransition(deltaTime);

        // Apply the transition to model morphing
        this.applyTransitionToModel(modelComponent, eraTransition.transitionProgress);

        // Handle transition completion
        if (isComplete) {
          this.handleTransitionComplete(modelComponent, eraTransition.currentEra);
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
    if (!modelComponent.activeModel) return;

    // Apply morph influence to each mesh in the model
    modelComponent.activeModel.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.morphTargetInfluences &&
        obj.morphTargetInfluences.length > 0
      ) {
        // Set the morph target influence based on transition progress
        obj.morphTargetInfluences[0] = progress;
      }
    });

    // Additional transition effects could be applied here:
    // - Material transitions
    // - Color shifts
    // - Emission intensity
  }

  /**
   * Handle the completion of a transition
   * @param modelComponent The model component
   * @param era The current era after transition
   */
  private handleTransitionComplete(modelComponent: GlbModelComponent, era: Era): void {
    // Switch active model if needed
    if (era === Era.Cyberpunk && modelComponent.cyberpunkModel) {
      // If we have a separate cyberpunk model, we might want to switch to it
      if (modelComponent.activeModel !== modelComponent.cyberpunkModel) {
        if (modelComponent.activeModel) {
          this.scene.remove(modelComponent.activeModel);
        }
        this.scene.add(modelComponent.cyberpunkModel);
        modelComponent.activeModel = modelComponent.cyberpunkModel;
      }
    } else if (era === Era.Roman && modelComponent.romanModel && modelComponent.activeModel !== modelComponent.romanModel) {
                 if (modelComponent.activeModel) {
                   this.scene.remove(modelComponent.activeModel);
                 }
                 this.scene.add(modelComponent.romanModel);
                 modelComponent.activeModel = modelComponent.romanModel;
           }


    // Additional post-transition cleanup or effects
  }

  /**
   * Load models for an entity
   * @param entityId Entity ID to load models for
   * @param romanUrl URL to Roman era model
   * @param cyberpunkUrl URL to Cyberpunk era model
   */
  loadModelsForEntity(entityId: string, romanUrl: string, cyberpunkUrl: string): void {
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

    // Update the component with URLs
    modelComponent.romanModelUrl = romanUrl;
    modelComponent.cyberpunkModelUrl = cyberpunkUrl;
    modelComponent.isLoaded = false;

    // Start loading models
    // Note: In a real implementation, you'd use THREE.GLTFLoader
    // This is a placeholder for the actual loading logic
    Promise.all([this.loadModel(romanUrl), this.loadModel(cyberpunkUrl)])
      .then(([romanModel, cyberpunkModel]) => {
        modelComponent.romanModel = romanModel;
        modelComponent.cyberpunkModel = cyberpunkModel;

        // Set the active model based on current era
        const eraTransition = this.entityManager.getComponent<EraTransitionComponent>(
          entityId,
          'eraTransition'
        );

        if (eraTransition) {
          const activeModel = eraTransition.currentEra === Era.Roman ? romanModel : cyberpunkModel;
          modelComponent.activeModel = activeModel;

          // Add the active model to the scene
          this.scene.add(activeModel);
        }

        // Setup morphing between models
        this.setupModelMorphing(modelComponent);

        // Mark as loaded
        modelComponent.isLoaded = true;
      })
      .catch((error) => {
        console.error('Failed to load models:', error);
      });
  }

  /**
   * Load a single GLB model
   * @param url URL to the model
   * @returns Promise resolving to the loaded model
   */
  private loadModel(url: string): Promise<THREE.Group> {
    void url; // Mark parameter as used
    // This is a placeholder for the actual loading logic
    // In a real implementation, you'd use THREE.GLTFLoader
    return Promise.resolve(new THREE.Group());
  }

  /**
   * Setup morphing between Roman and Cyberpunk models
   * @param modelComponent The model component to setup
   */
  private setupModelMorphing(modelComponent: GlbModelComponent): void {
    if (!modelComponent.romanModel || !modelComponent.cyberpunkModel) return;

    const morphTargets = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

    // Setup morphing for matching meshes
    modelComponent.romanModel.traverse((romanObj) => {
      if (!(romanObj instanceof THREE.Mesh)) return;

      // Find corresponding mesh in cyberpunk model by name
      let cyberpunkObj: THREE.Object3D | null = null;
      modelComponent.cyberpunkModel?.traverse((obj) => {
        if (obj.name === romanObj.name && obj instanceof THREE.Mesh) {
          cyberpunkObj = obj;
        }
      });

      if (cyberpunkObj && (cyberpunkObj as object) instanceof THREE.Mesh) {
        this.setupMeshMorphing(romanObj, cyberpunkObj as THREE.Mesh);
        morphTargets.set(romanObj.geometry, (cyberpunkObj as THREE.Mesh).geometry);
      }
    });

    // Store morph targets for later use
    modelComponent.morphTargets = morphTargets;
  }

  /**
   * Setup morphing between two meshes
   * @param baseMesh Base mesh (Roman)
   * @param targetMesh Target mesh (Cyberpunk)
   */
  private setupMeshMorphing(baseMesh: THREE.Mesh, targetMesh: THREE.Mesh): void {
    const baseGeom = baseMesh.geometry;
    const targetGeom = targetMesh.geometry;

    // Only process geometries with the same vertex count
    if (baseGeom.attributes.position.count !== targetGeom.attributes.position.count) {
      return;
    }

    // Initialize morph attributes if needed
    if (!baseGeom.morphAttributes.position) {
      baseGeom.morphAttributes.position = [];
    }

    // Create morph target
    const positionAttribute = targetGeom.attributes.position;
    const morphPositions = new Float32Array(positionAttribute.array.length);

    // Calculate position differences for morphing
    for (let i = 0; i < positionAttribute.count; i++) {
      const basePos = new THREE.Vector3();
      const targetPos = new THREE.Vector3();

      // Get vertex positions
      basePos.fromBufferAttribute(baseGeom.attributes.position, i);
      targetPos.fromBufferAttribute(positionAttribute, i);

      // Calculate deltas
      const idx = i * 3;
      morphPositions[idx] = targetPos.x - basePos.x;
      morphPositions[idx + 1] = targetPos.y - basePos.y;
      morphPositions[idx + 2] = targetPos.z - basePos.z;
    }

    // Add morph target to base geometry
    baseGeom.morphAttributes.position.push(new THREE.BufferAttribute(morphPositions, 3));

    // Enable morphing on the mesh
    if (!baseMesh.morphTargetInfluences) {
      baseMesh.morphTargetInfluences = [0];
    } else {
      baseMesh.morphTargetInfluences[0] = 0;
    }

    // Enable morphing in the material
    if (baseMesh.material instanceof THREE.Material) {
      // Cast to custom interface to enable morphTargets
      (baseMesh.material as MorphableMaterial).morphTargets = true;
    }
  }
}
