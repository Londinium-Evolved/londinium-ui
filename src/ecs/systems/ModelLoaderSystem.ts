import * as THREE from 'three';
import { System } from '../core/System';
import { ModelLoaderComponent } from '../components/ModelLoaderComponent';
import { modelLoaderService } from '../services/ModelLoaderService';
import { transitionService } from '../services/TransitionService';

/**
 * System that manages model loading and era transitions
 */
export class ModelLoaderSystem extends System {
  private scene: THREE.Scene;
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private eraProgress: number = 0;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.setRequiredComponents(['modelLoader']);
  }

  /**
   * Initialize the system with the current era state
   */
  public initialize(initialEraProgress: number = 0): void {
    this.eraProgress = initialEraProgress;
  }

  /**
   * Main update method called each frame
   * Processes model loading and transition updates
   */
  public update(deltaTime: number): void {
    void deltaTime;
    const entities = this.getEntitiesWithComponent('modelLoader');

    for (const entity of entities) {
      const modelComp = entity.getComponent<ModelLoaderComponent>('modelLoader');

      if (!modelComp) continue;

      // Skip if the component is disabled
      if (!modelComp.enabled) continue;

      // Load model if not already loaded or loading
      if (!modelComp.loaded && !this.loadingPromises.has(entity.id)) {
        this.loadModelForEntity(entity.id, modelComp);
      }

      // Update transition state if model is loaded
      if (modelComp.loaded && modelComp.model) {
        transitionService.updateModelTransition(modelComp, this.eraProgress);
      }
    }
  }

  /**
   * Update the current era transition progress
   */
  public setEraProgress(progress: number): void {
    this.eraProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Handles model loading for an entity
   */
  private loadModelForEntity(entityId: string, modelComp: ModelLoaderComponent): void {
    // If already loading, don't start a new load
    if (this.loadingPromises.has(entityId)) return;

    // Create a loading promise and track it
    const loadPromise = modelLoaderService
      .loadModelForComponent(modelComp, this.scene)
      .then((model) => {
        modelComp.model = model;
        modelComp.loaded = true;

        // Do an initial transition update
        transitionService.updateModelTransition(modelComp, this.eraProgress);
      })
      .catch((error) => {
        console.error(`Error loading model for entity ${entityId}:`, error);
      });

    // Track the loading promise and clean it up when done
    this.loadingPromises.set(entityId, loadPromise);
    loadPromise.finally(() => this.loadingPromises.delete(entityId));
  }

  /**
   * Clean up resources when the system is destroyed
   */
  public destroy(): void {
    // Clear all loading promises
    this.loadingPromises.clear();
  }
}
