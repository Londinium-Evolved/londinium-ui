import * as THREE from 'three';
import { MaterialUpdateConfig } from './types';
import { updateMaterial } from './materialUpdater';

/**
 * A comprehensive system for updating materials dynamically
 * Addresses the review comment to enhance material update capabilities
 */
export class MaterialUpdateSystem {
  /**
   * Updates a material with new properties
   * This uses the existing updateMaterial function for direct property updates
   * 
   * @param material The material to update
   * @param properties New properties to apply
   * @returns The updated material
   */
  public static updateMaterialProperties(
    material: THREE.MeshStandardMaterial,
    properties: MaterialUpdateConfig
  ): THREE.MeshStandardMaterial {
    return updateMaterial(material, properties);
  }

  /**
   * Updates a group of materials sharing similar properties
   * Useful for batch updates to materials with common characteristics
   * 
   * @param materials Array of materials to update
   * @param properties New properties to apply to all materials
   * @returns Array of updated materials
   */
  public static batchUpdateMaterials(
    materials: THREE.MeshStandardMaterial[],
    properties: MaterialUpdateConfig
  ): THREE.MeshStandardMaterial[] {
    return materials.map(material => updateMaterial(material, properties));
  }

  /**
   * Updates materials on a mesh or mesh hierarchy
   * This is useful for updating all materials on a complex model
   * 
   * @param root The root object to traverse for materials
   * @param properties New properties to apply
   * @param filter Optional filter function to select which materials to update
   */
  public static updateMeshMaterials(
    root: THREE.Object3D,
    properties: MaterialUpdateConfig,
    filter?: (material: THREE.Material) => boolean
  ): void {
    // Traverse the object hierarchy
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      
      // Handle both single materials and material arrays
      const materials = Array.isArray(object.material) 
        ? object.material 
        : [object.material];
      
      // Update each material that passes the filter
      materials.forEach((material, index) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          // Apply filter if provided
          if (!filter || filter(material)) {
            if (Array.isArray(object.material)) {
              // Update material in the array
              object.material[index] = updateMaterial(material, properties);
            } else {
              // Update single material
              object.material = updateMaterial(material, properties);
            }
          }
        }
      });
    });
  }
  
  /**
   * Interpolates between two different material states
   * Useful for smooth transitions between visual states
   * 
   * @param material The material to update
   * @param startProps Starting material properties
   * @param endProps Target material properties
   * @param progress Interpolation factor (0-1)
   * @returns The updated material
   */
  public static interpolateMaterial(
    material: THREE.MeshStandardMaterial,
    startProps: MaterialUpdateConfig,
    endProps: MaterialUpdateConfig,
    progress: number
  ): THREE.MeshStandardMaterial {
    // Ensure progress is within bounds
    const t = Math.max(0, Math.min(1, progress));
    
    // Create interpolated properties
    const interpolatedProps: MaterialUpdateConfig = {};
    
    // Collect all unique property keys
    const allKeys = new Set([
      ...Object.keys(startProps),
      ...Object.keys(endProps)
    ]);
    
    // Process each property
    allKeys.forEach(key => {
      const startValue = (startProps as any)[key];
      const endValue = (endProps as any)[key];
      
      // Skip if property doesn't exist in both objects
      if (startValue === undefined || endValue === undefined) {
        // Use the available value
        if (startValue !== undefined) interpolatedProps[key] = startValue;
        if (endValue !== undefined) interpolatedProps[key] = endValue;
        return;
      }
      
      // Handle different property types
      if (startValue instanceof THREE.Color && endValue instanceof THREE.Color) {
        // Interpolate colors
        const color = startValue.clone().lerp(endValue, t);
        interpolatedProps[key] = color;
      } else if (typeof startValue === 'number' && typeof endValue === 'number') {
        // Interpolate numbers
        interpolatedProps[key] = startValue * (1 - t) + endValue * t;
      } else if (startValue instanceof THREE.Vector2 && endValue instanceof THREE.Vector2) {
        // Interpolate Vector2
        const vec = startValue.clone().lerp(endValue, t);
        interpolatedProps[key] = vec;
      } else if (startValue instanceof THREE.Vector3 && endValue instanceof THREE.Vector3) {
        // Interpolate Vector3
        const vec = startValue.clone().lerp(endValue, t);
        interpolatedProps[key] = vec;
      } else {
        // Default to endValue for non-interpolatable properties
        interpolatedProps[key] = t < 0.5 ? startValue : endValue;
      }
    });
    
    // Apply the interpolated properties
    return updateMaterial(material, interpolatedProps);
  }
}