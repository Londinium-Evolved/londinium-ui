import * as THREE from 'three';

/**
 * Properly disposes THREE.js objects to prevent memory leaks
 * Should be used in useEffect cleanup functions
 */
export const disposeObject = (obj: THREE.Object3D | null) => {
  if (!obj) return;

  // Handle children recursively
  if (obj.children) {
    // Create a copy of children array since disposal might modify it
    const children = [...obj.children];
    for (const child of children) {
      disposeObject(child);
    }
  }

  // Handle geometries
  if ((obj as THREE.Mesh).geometry) {
    (obj as THREE.Mesh).geometry.dispose();
  }

  // Handle materials
  if ((obj as THREE.Mesh).material) {
    const { material } = obj as THREE.Mesh;

    // Convert to array for consistent handling and ensure it's properly typed
    const materials = Array.isArray(material) ? material : [material];

    // Now iterate through the array of materials
    materials.forEach((mat) => {
      // Dispose textures
      Object.keys(mat).forEach((prop) => {
        const property = (mat as unknown as Record<string, unknown>)[prop];
        if (property && typeof property === 'object' && 'isTexture' in property) {
          (property as THREE.Texture).dispose();
        }
      });

      // Dispose material
      mat.dispose();
    });
  }
};

/**
 * React hook for safely disposing THREE.js objects
 */
export const useDisposer = () => {
  const objectsToDispose = new Set<THREE.Object3D>();

  const registerForDisposal = (obj: THREE.Object3D) => {
    objectsToDispose.add(obj);
    return obj;
  };

  const disposeAll = () => {
    objectsToDispose.forEach((obj) => {
      disposeObject(obj);
    });
    objectsToDispose.clear();
  };

  return { registerForDisposal, disposeAll };
};
