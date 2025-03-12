import * as THREE from 'three';
import { useEffect, useRef, useCallback } from 'react';

/**
 * Interface for objects with a dispose method
 */
export interface Disposable {
  dispose: () => void;
}

/**
 * Type definition for disposable THREE.js objects
 */
export type ThreeDisposable =
  | THREE.Object3D
  | THREE.BufferGeometry
  | THREE.Material
  | THREE.Texture
  | THREE.WebGLRenderTarget
  | Disposable;

/**
 * Check if an object is disposable
 */
export const isDisposable = (obj: unknown): obj is Disposable => {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    'dispose' in obj &&
    typeof (obj as Disposable).dispose === 'function'
  );
};

/**
 * Properly disposes THREE.js objects to prevent memory leaks
 * Should be used in useEffect cleanup functions
 */
export const disposeObject = (obj: THREE.Object3D | null) => {
  if (!obj) return; // Early return if object is null

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
 * Generic disposal function for any THREE.js disposable object
 */
export const disposeThreeObject = (obj: unknown): void => {
  if (!obj) return;

  // First call the object's own dispose method if it exists
  if (isDisposable(obj)) {
    obj.dispose();
  }

  // Then, for Object3D instances, also do recursive disposal
  // to ensure all children, geometries, and materials are properly cleaned up
  if (obj instanceof THREE.Object3D) {
    disposeObject(obj);
  }
};

/**
 * React hook for safely disposing THREE.js objects
 * @deprecated useDisposer is deprecated. Please migrate to useThreeDisposal by replacing all useDisposer references with useThreeDisposal and updating your disposal registration accordingly. Refer to the migration guide for additional details.
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

/**
 * Enhanced React hook for managing THREE.js object disposal
 *
 * This hook tracks disposable THREE.js objects and ensures they are
 * properly disposed of when the component unmounts or when manually triggered.
 *
 * @returns [registerDisposable, manuallyDispose, disposables]
 * - registerDisposable: Function to register objects for disposal
 * - manuallyDispose: Function to manually trigger disposal of all tracked objects
 * - disposables: Set of all currently tracked disposable objects (for debugging)
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [registerDisposable, manuallyDispose] = useThreeDisposal();
 *
 *   useEffect(() => {
 *     const geometry = new THREE.BoxGeometry(1, 1, 1);
 *     const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
 *
 *     // Register for automatic disposal
 *     registerDisposable(geometry);
 *     registerDisposable(material);
 *
 *     // ... use geometry and material ...
 *
 *     // No need to manually dispose in cleanup
 *   }, [registerDisposable]);
 *
 *   return <mesh />;
 * };
 * ```
 */
export const useThreeDisposal = (): [
  <T extends ThreeDisposable>(obj: T) => T,
  () => void,
  Set<ThreeDisposable>
] => {
  const disposablesRef = useRef<Set<ThreeDisposable>>(new Set());

  // Function to register an object for disposal
  const registerDisposable = useCallback(<T extends ThreeDisposable>(obj: T): T => {
    if (obj) {
      disposablesRef.current.add(obj);
    }
    return obj;
  }, []);

  // Function to manually trigger disposal
  const manuallyDispose = useCallback(() => {
    disposablesRef.current.forEach(disposeThreeObject);
    disposablesRef.current.clear();
  }, []);

  // Auto-dispose on unmount
  useEffect(() => {
    return () => {
      manuallyDispose();
    };
  }, [manuallyDispose]);

  return [registerDisposable, manuallyDispose, disposablesRef.current];
};
