import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import {
  isDisposable,
  disposeObject,
  disposeThreeObject,
  useDisposer,
  useThreeDisposal,
  Disposable,
} from '../disposalUtils';

// Mock implementations
jest.mock('three', () => {
  // Create mock classes for THREE.js objects
  class MockObject3D {
    isObject3D = true;
    children: MockObject3D[] = [];
    add(child: MockObject3D) {
      this.children.push(child);
      return this;
    }
    remove(child: MockObject3D) {
      this.children = this.children.filter((c) => c !== child);
      return this;
    }
  }

  class MockMesh extends MockObject3D {
    geometry: { dispose: jest.Mock } | null = null;
    material: { dispose: jest.Mock } | { dispose: jest.Mock }[] | null = null;
  }

  class MockGeometry {
    dispose = jest.fn();
    computeBoundingSphere = jest.fn();
    computeVertexNormals = jest.fn();
  }

  class MockMaterial {
    dispose = jest.fn();
    map = null;
  }

  class MockTexture {
    isTexture = true;
    dispose = jest.fn();
  }

  return {
    Object3D: MockObject3D,
    Mesh: MockMesh,
    BoxGeometry: MockGeometry,
    PlaneGeometry: MockGeometry,
    MeshBasicMaterial: MockMaterial,
    MeshStandardMaterial: MockMaterial,
    Texture: MockTexture,
    WebGLRenderTarget: class {
      dispose = jest.fn();
    },
  };
});

describe('Disposal Utilities', () => {
  // Test isDisposable function
  describe('isDisposable', () => {
    it('should return true for objects with a dispose method', () => {
      const disposableObject = { dispose: () => {} };
      expect(isDisposable(disposableObject)).toBe(true);
    });

    it('should return false for objects without a dispose method', () => {
      const nonDisposableObject = { foo: 'bar' };
      expect(isDisposable(nonDisposableObject)).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isDisposable(null)).toBe(false);
      expect(isDisposable(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isDisposable(5)).toBe(false);
      expect(isDisposable('string')).toBe(false);
      expect(isDisposable(true)).toBe(false);
    });
  });

  // Test disposeObject function
  describe('disposeObject', () => {
    it('should dispose a mesh with geometry and material', () => {
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh();

      // Setup the mesh with geometry and material
      mesh.geometry = geometry;
      mesh.material = material;

      // Dispose the mesh
      disposeObject(mesh);

      // Verify that geometry and material were disposed
      expect(geometry.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });

    it('should handle null objects gracefully', () => {
      // This should not throw an error
      expect(() => disposeObject(null)).not.toThrow();
    });

    it('should dispose materials with textures', () => {
      const texture = new THREE.Texture();
      const material = new THREE.MeshBasicMaterial();
      (material as { map: typeof texture }).map = texture;

      const mesh = new THREE.Mesh();
      mesh.material = material;

      disposeObject(mesh);
      expect(material.dispose).toHaveBeenCalled();
      expect(texture.dispose).toHaveBeenCalled();
    });

    it('should handle an array of materials', () => {
      const material1 = new THREE.MeshBasicMaterial();
      const material2 = new THREE.MeshBasicMaterial();

      const mesh = new THREE.Mesh();
      mesh.material = [material1, material2];

      disposeObject(mesh);
      expect(material1.dispose).toHaveBeenCalled();
      expect(material2.dispose).toHaveBeenCalled();
    });

    it('should recursively dispose children', () => {
      const parentMesh = new THREE.Mesh();
      const childMesh1 = new THREE.Mesh();
      const childMesh2 = new THREE.Mesh();

      childMesh1.geometry = new THREE.BoxGeometry();
      childMesh2.geometry = new THREE.BoxGeometry();

      parentMesh.add(childMesh1);
      parentMesh.add(childMesh2);

      disposeObject(parentMesh);

      expect(childMesh1.geometry.dispose).toHaveBeenCalled();
      expect(childMesh2.geometry.dispose).toHaveBeenCalled();
    });
  });

  // Test disposeThreeObject function
  describe('disposeThreeObject', () => {
    it('should call disposeObject for THREE.Object3D instances', () => {
      const mesh = new THREE.Mesh();
      mesh.geometry = new THREE.BoxGeometry();

      disposeThreeObject(mesh);
      expect(mesh.geometry.dispose).toHaveBeenCalled();
    });

    it('should call dispose() for non-Object3D disposable objects', () => {
      const geometry = new THREE.BoxGeometry();
      disposeThreeObject(geometry);
      expect(geometry.dispose).toHaveBeenCalled();
    });

    it('should handle non-disposable objects gracefully', () => {
      const nonDisposable = { foo: 'bar' };
      expect(() => disposeThreeObject(nonDisposable)).not.toThrow();
    });

    it('should handle null and undefined gracefully', () => {
      expect(() => disposeThreeObject(null)).not.toThrow();
      expect(() => disposeThreeObject(undefined)).not.toThrow();
    });
  });

  // Test useDisposer hook
  describe('useDisposer', () => {
    it('should register objects for disposal', () => {
      const { result } = renderHook(() => useDisposer());

      const mesh = new THREE.Mesh();
      mesh.geometry = new THREE.BoxGeometry();

      act(() => {
        result.current.registerForDisposal(mesh);
      });

      act(() => {
        result.current.disposeAll();
      });

      expect(mesh.geometry.dispose).toHaveBeenCalled();
    });
  });

  // Test useThreeDisposal hook
  describe('useThreeDisposal', () => {
    it('should register and dispose objects on unmount', () => {
      const { result, unmount } = renderHook(() => useThreeDisposal());

      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial();

      act(() => {
        result.current[0](geometry);
        result.current[0](material);
      });

      // Simulate component unmount
      unmount();

      expect(geometry.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });

    it('should allow manual disposal', () => {
      const { result } = renderHook(() => useThreeDisposal());

      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial();

      act(() => {
        result.current[0](geometry);
        result.current[0](material);
      });

      // Manually dispose objects
      act(() => {
        result.current[1]();
      });

      expect(geometry.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });

    it('should expose the set of disposables for debugging', () => {
      const { result } = renderHook(() => useThreeDisposal());

      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial();

      act(() => {
        result.current[0](geometry);
        result.current[0](material);
      });

      // Check that the disposables set contains our objects
      expect(result.current[2].has(geometry)).toBe(true);
      expect(result.current[2].has(material)).toBe(true);
    });

    it('should return the registered object for chaining', () => {
      const { result } = renderHook(() => useThreeDisposal());

      const geometry = new THREE.BoxGeometry();

      let returnedGeometry;
      act(() => {
        returnedGeometry = result.current[0](geometry);
      });

      expect(returnedGeometry).toBe(geometry);
    });

    it('should handle registering the same object multiple times', () => {
      const { result } = renderHook(() => useThreeDisposal());

      const geometry = new THREE.BoxGeometry();

      act(() => {
        result.current[0](geometry);
        result.current[0](geometry); // Register again
      });

      // The object should only be in the set once
      expect(result.current[2].size).toBe(1);

      // Manually dispose
      act(() => {
        result.current[1]();
      });

      // The dispose method should be called only once
      expect(geometry.dispose).toHaveBeenCalledTimes(1);
    });

    it('should handle custom disposable objects', () => {
      const { result, unmount } = renderHook(() => useThreeDisposal());

      const customDisposable: Disposable = {
        dispose: jest.fn(),
      };

      act(() => {
        result.current[0](customDisposable);
      });

      unmount();

      expect(customDisposable.dispose).toHaveBeenCalled();
    });
  });
});
