import * as THREE from 'three';
import { modelLoader } from '../../utils/three/modelLoader';
import { ModelLoaderComponent } from '../components/ModelLoaderComponent';

/**
 * Service responsible for loading models and handling their initial setup
 * Extracts this responsibility from the ModelLoaderSystem for better separation of concerns
 */
export class ModelLoaderService {
  /**
   * Loads a model based on the configuration in a ModelLoaderComponent
   * Handles both single models and transitional model pairs
   * 
   * @param modelComp The component containing model configuration
   * @param scene The THREE.js scene to add the model to
   * @returns Promise resolving to the loaded model
   */
  public async loadModelForComponent(
    modelComp: ModelLoaderComponent,
    scene: THREE.Scene
  ): Promise<THREE.Group> {
    let model: THREE.Group;

    // Handle transitional models (with morph targets) vs. single models
    if (modelComp.cyberpunkModelUrl && modelComp.useMorphTargets) {
      const { romanModel, cyberpunkModel } = await modelLoader.loadModelPair(
        modelComp.romanModelUrl,
        modelComp.cyberpunkModelUrl,
        { computeNormals: true }
      );
      model = modelLoader.createTransitionableModel(romanModel, cyberpunkModel);
    } else {
      model = await modelLoader.loadModel(modelComp.romanModelUrl, {
        computeNormals: true,
      });
    }

    // Apply component properties to the loaded model
    this.setupModelProperties(model, modelComp);
    
    // Add to scene if specified
    if (scene) {
      scene.add(model);
    }
    
    return model;
  }

  /**
   * Sets up the initial properties of a model based on component values
   * 
   * @param model The THREE.js group/model to configure
   * @param modelComp The component containing configuration values
   */
  private setupModelProperties(model: THREE.Group, modelComp: ModelLoaderComponent): void {
    // Apply transform properties if specified
    if (modelComp.position) model.position.copy(modelComp.position);
    if (modelComp.rotation) model.rotation.copy(modelComp.rotation);
    if (modelComp.scale) model.scale.copy(modelComp.scale);
    
    // Apply visibility
    if (modelComp.visible !== undefined) model.visible = modelComp.visible;
    
    // Apply custom properties if available
    if (modelComp.userData) {
      model.userData = { ...model.userData, ...modelComp.userData };
    }
  }
}

// Export singleton instance
export const modelLoaderService = new ModelLoaderService();