import * as THREE from 'three';
import { ModelLoaderComponent } from '../components/ModelLoaderComponent';
import { materialFactory } from '../../utils/three/materialFactory';

/**
 * Service responsible for handling era transitions between Roman and Cyberpunk styles
 * Extracts this responsibility from the ModelLoaderSystem for better separation of concerns
 */
export class TransitionService {
  /**
   * Updates a model's transition based on the current era progress
   * Handles material interpolation and morph target weights
   * 
   * @param modelComp The component containing model and transition configuration
   * @param eraProgress Current transition progress (0 = Roman, 1 = Cyberpunk)
   */
  public updateModelTransition(modelComp: ModelLoaderComponent, eraProgress: number): void {
    if (!modelComp.model || !modelComp.loaded) {
      return;
    }

    // Ensure progress is within valid range
    const progress = Math.max(0, Math.min(1, eraProgress));
    
    // Update morph targets if available
    if (modelComp.useMorphTargets) {
      this.updateMorphTargets(modelComp.model, progress);
    }
    
    // Update materials
    this.updateMaterials(modelComp.model, progress);
  }

  /**
   * Updates morph target weights based on era transition progress
   * 
   * @param model The model containing meshes with morph targets
   * @param progress Transition progress (0-1)
   */
  private updateMorphTargets(model: THREE.Group, progress: number): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.morphTargetInfluences?.length) {
        // Typically in a morphed model, influence[0] controls the transition
        object.morphTargetInfluences[0] = progress;
      }
    });
  }

  /**
   * Updates materials on a model based on era transition progress
   * Interpolates between Roman and Cyberpunk material properties
   * 
   * @param model The model containing meshes with materials
   * @param progress Transition progress (0-1)
   */
  private updateMaterials(model: THREE.Group, progress: number): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        // Handle both single materials and material arrays
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material];

        materials.forEach(material => {
          if (material instanceof THREE.MeshStandardMaterial) {
            // Interpolate key material properties
            this.interpolateMaterialProperties(material, progress);
          }
        });
      }
    });
  }

  /**
   * Interpolates material properties between Roman and Cyberpunk visual styles
   * 
   * @param material The material to update
   * @param progress Transition progress (0-1)
   */
  private interpolateMaterialProperties(material: THREE.MeshStandardMaterial, progress: number): void {
    // Skip materials explicitly marked to not transition
    if (material.userData?.skipTransition) {
      return;
    }

    // Store original Roman properties if not already stored
    if (!material.userData.romanProperties) {
      material.userData.romanProperties = {
        color: material.color.clone(),
        roughness: material.roughness,
        metalness: material.metalness,
        emissive: material.emissive.clone(),
        emissiveIntensity: material.emissiveIntensity
      };
    }

    // Create cyberpunk properties if not already defined
    if (!material.userData.cyberpunkProperties) {
      // Derive cyberpunk properties based on original properties
      // This is a simplification - in a real implementation, you might
      // have more specific rules based on material types
      material.userData.cyberpunkProperties = {
        color: new THREE.Color(
          material.userData.romanProperties.color.r * 0.7,
          material.userData.romanProperties.color.g * 0.8,
          material.userData.romanProperties.color.b * 1.2
        ),
        roughness: Math.max(0.1, material.userData.romanProperties.roughness - 0.4),
        metalness: Math.min(0.9, material.userData.romanProperties.metalness + 0.5),
        emissive: new THREE.Color(0, 0.5, 1), // Cyberpunk blue glow
        emissiveIntensity: 0.5
      };
    }

    // Get the stored properties
    const romanProps = material.userData.romanProperties;
    const cyberpunkProps = material.userData.cyberpunkProperties;

    // Interpolate color
    material.color.r = THREE.MathUtils.lerp(romanProps.color.r, cyberpunkProps.color.r, progress);
    material.color.g = THREE.MathUtils.lerp(romanProps.color.g, cyberpunkProps.color.g, progress);
    material.color.b = THREE.MathUtils.lerp(romanProps.color.b, cyberpunkProps.color.b, progress);

    // Interpolate other properties
    material.roughness = THREE.MathUtils.lerp(romanProps.roughness, cyberpunkProps.roughness, progress);
    material.metalness = THREE.MathUtils.lerp(romanProps.metalness, cyberpunkProps.metalness, progress);
    
    // Interpolate emissive properties - only visible in cyberpunk mode
    material.emissive.r = THREE.MathUtils.lerp(0, cyberpunkProps.emissive.r, progress);
    material.emissive.g = THREE.MathUtils.lerp(0, cyberpunkProps.emissive.g, progress);
    material.emissive.b = THREE.MathUtils.lerp(0, cyberpunkProps.emissive.b, progress);
    material.emissiveIntensity = THREE.MathUtils.lerp(0, cyberpunkProps.emissiveIntensity, progress);

    // Ensure material update flag is set
    material.needsUpdate = true;
  }
}

// Export singleton instance
export const transitionService = new TransitionService();