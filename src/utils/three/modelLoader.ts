import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { materialFactory } from './materialFactory';
import { Era } from '../../ecs/components/EraTransitionComponent';

/**
 * Options for model loading
 */
export interface ModelLoaderOptions {
  /** Use Draco compression for faster loading */
  useDraco?: boolean;
  /** Path to Draco decoder */
  dracoPath?: string;
  /** Cache loaded models */
  cacheModels?: boolean;
  /** Apply default material on load */
  applyDefaultMaterial?: boolean;
  /** Default era for material application */
  defaultEra?: Era;
}

/**
 * Options for model processing
 */
export interface ModelProcessOptions {
  /** Calculate vertex normals */
  computeNormals?: boolean;
  /** Create morph targets for geometry */
  createMorphTargets?: boolean;
  /** Apply specific era materials */
  applyEraMaterials?: boolean;
  /** Era to apply materials for */
  era?: Era;
  /** Custom material processor function */
  materialProcessor?: (material: THREE.Material, mesh: THREE.Mesh) => THREE.Material;
}

/**
 * Model info for tracking loaded models
 */
interface ModelInfo {
  model: THREE.Group;
  url: string;
  loadTime: number;
  vertexCount: number;
  materials: THREE.Material[];
  era?: Era;
}

// Define an interface for material properties
interface MaterialProperties {
  color: THREE.Color;
  roughness: number;
  metalness: number;
  emissive: THREE.Color;
  emissiveIntensity: number;
}

// Define a type for THREE.Group with morphTargets
type MorphableGroup = THREE.Group & {
  morphTargets?: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
};

/**
 * A highly-optimized utility for streaming GLB/GLTF assets with
 * dynamic era-specific material transition support.
 *
 * Features:
 * - Efficient model loading with caching
 * - Integration with MaterialFactory for era-specific materials
 * - Support for Draco compression
 * - Dynamic material transition support
 * - Performance metrics tracking
 */
export class ModelLoader {
  private static instance: ModelLoader;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader | null = null;
  private modelCache: Map<string, ModelInfo> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();
  private loadingStartTimes: Map<string, number> = new Map();

  // Default options
  private defaultOptions: ModelLoaderOptions = {
    useDraco: true,
    dracoPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/',
    cacheModels: true,
    applyDefaultMaterial: true,
    defaultEra: Era.Roman,
  };

  /**
   * Private constructor for singleton pattern
   */
  private constructor(options?: ModelLoaderOptions) {
    const opts = { ...this.defaultOptions, ...options };

    this.gltfLoader = new GLTFLoader();

    // Setup Draco compression if enabled
    if (opts.useDraco) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(opts.dracoPath || this.defaultOptions.dracoPath!);
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
  }

  /**
   * Get the singleton instance of ModelLoader
   */
  public static getInstance(options?: ModelLoaderOptions): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader(options);
    }
    return ModelLoader.instance;
  }

  /**
   * Load a model from URL
   * @param url Model URL
   * @param options Processing options
   * @returns Promise resolving to the loaded model
   */
  public async loadModel(url: string, options: ModelProcessOptions = {}): Promise<THREE.Group> {
    // Return cached model if available
    if (this.modelCache.has(url) && this.defaultOptions.cacheModels) {
      const cached = this.modelCache.get(url)!;
      // Create a clone to avoid modifying the cached model
      const clone = this.cloneModel(cached.model);

      // Apply era-specific materials if requested
      if (options.applyEraMaterials && options.era) {
        this.applyEraMaterials(clone, options.era);
      }

      return clone;
    }

    // Check if there's already a loading promise for this URL
    if (this.loadingPromises.has(url)) {
      return await this.loadingPromises.get(url)!;
    }

    // Start loading model
    this.loadingStartTimes.set(url, performance.now());
    const loadPromise = this.loadGLTFModel(url, options);
    this.loadingPromises.set(url, loadPromise);

    try {
      const model = await loadPromise;

      // Track performance metrics
      const loadTime = performance.now() - this.loadingStartTimes.get(url)!;
      const vertexCount = this.countVertices(model);

      // Cache the model if caching is enabled
      if (this.defaultOptions.cacheModels) {
        const materials = this.collectMaterials(model);
        this.modelCache.set(url, {
          model,
          url,
          loadTime,
          vertexCount,
          materials,
          era: options.era,
        });
      }

      // Clean up loading state
      this.loadingPromises.delete(url);
      this.loadingStartTimes.delete(url);

      return model;
    } catch (error) {
      // Clean up on error
      this.loadingPromises.delete(url);
      this.loadingStartTimes.delete(url);
      console.error(`Error loading model from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Load a GLTF model from a URL
   * @param url Model URL
   * @param options Processing options
   * @returns Promise resolving to the loaded model
   */
  private loadGLTFModel(url: string, options: ModelProcessOptions): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Apply processing options
          this.processModel(model, options);

          resolve(model);
        },
        () => {
          // Loading progress - could be exposed via a callback in a future version
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Process a loaded model according to specified options
   * @param model The model to process
   * @param options Processing options
   */
  private processModel(model: THREE.Group, options: ModelProcessOptions): void {
    // Compute normals if requested
    if (options.computeNormals) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.computeVertexNormals();
        }
      });
    }

    // Apply era-specific materials
    if (options.applyEraMaterials && options.era) {
      this.applyEraMaterials(model, options.era);
    } else if (this.defaultOptions.applyDefaultMaterial) {
      // Apply default era materials
      this.applyEraMaterials(model, this.defaultOptions.defaultEra!);
    }

    // Apply custom material processor if provided
    if (options.materialProcessor) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => options.materialProcessor!(mat, child));
          } else {
            child.material = options.materialProcessor!(child.material, child);
          }
        }
      });
    }
  }

  /**
   * Apply era-specific materials to a model
   * @param model The model to process
   * @param era The era to apply materials for
   */
  public applyEraMaterials(model: THREE.Group, era: Era): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          // Handle multi-material objects
          child.material = child.material.map((mat, index) => {
            // Skip non-standard materials
            if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;

            return this.createEraMaterial(mat, era, `${child.name}_${index}`);
          });
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          // Replace standard materials with era-specific versions
          child.material = this.createEraMaterial(
            child.material,
            era,
            child.name || `mesh_${child.id}`
          );
        }
      }
    });
  }

  /**
   * Create an era-specific material based on an existing material
   * @param sourceMaterial The source material to base on
   * @param era The era to create material for
   * @param objectName Name to use for material cache key
   * @returns Era-specific material
   */
  private createEraMaterial(
    sourceMaterial: THREE.MeshStandardMaterial,
    era: Era,
    objectName: string
  ): THREE.MeshStandardMaterial {
    // Extract relevant properties from the source material
    const config = {
      color: sourceMaterial.color,
      roughness: sourceMaterial.roughness,
      metalness: sourceMaterial.metalness,
      map: sourceMaterial.map || undefined,
      normalMap: sourceMaterial.normalMap || undefined,
      emissive: sourceMaterial.emissive,
      emissiveIntensity: sourceMaterial.emissiveIntensity,
      cacheKey: `model_${era}_${objectName}`,
    };

    // Create era-specific material
    if (era === Era.Roman) {
      return materialFactory.createRomanMaterial(config);
    } else if (era === Era.Cyberpunk) {
      return materialFactory.createCyberpunkMaterial(config);
    } else {
      // For transitional era, use custom material with properties in between
      return materialFactory.createCustomMaterial(config);
    }
  }

  /**
   * Load a model pair for era transition
   * @param romanUrl URL for Roman era model
   * @param cyberpunkUrl URL for Cyberpunk era model
   * @param options Processing options
   * @returns Promise resolving to loaded model pair
   */
  public async loadModelPair(
    romanUrl: string,
    cyberpunkUrl: string,
    options: ModelProcessOptions = {}
  ): Promise<{ romanModel: THREE.Group; cyberpunkModel: THREE.Group }> {
    // Load both models in parallel
    const [romanModel, cyberpunkModel] = await Promise.all([
      this.loadModel(romanUrl, { ...options, era: Era.Roman }),
      this.loadModel(cyberpunkUrl, { ...options, era: Era.Cyberpunk }),
    ]);

    return { romanModel, cyberpunkModel };
  }

  /**
   * Create a model that can transition between eras
   * This sets up the model with the necessary properties for morphing
   * @param romanModel Roman era model
   * @param cyberpunkModel Cyberpunk era model
   * @returns A model prepared for era transition
   */
  public createTransitionableModel(
    romanModel: THREE.Group,
    cyberpunkModel: THREE.Group
  ): MorphableGroup {
    // Create a container for the models
    const container = new THREE.Group() as MorphableGroup;

    // We'll use the Roman model as the base
    container.add(romanModel);

    // Store cyberpunk model reference
    container.userData.cyberpunkModel = cyberpunkModel;

    // Setup morphing data
    this.setupModelMorphing(container, romanModel, cyberpunkModel);

    return container;
  }

  /**
   * Setup morphing between two models
   * This creates the morph targets needed for smooth transitions
   * @param container The container group
   * @param romanModel Roman era model
   * @param cyberpunkModel Cyberpunk era model
   */
  private setupModelMorphing(
    container: MorphableGroup,
    romanModel: THREE.Group,
    cyberpunkModel: THREE.Group
  ): void {
    // Store morph targets map on the container
    container.morphTargets = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

    // Traverse Roman model and find matching meshes in Cyberpunk model
    romanModel.traverse((romanObj) => {
      if (!(romanObj instanceof THREE.Mesh)) return;

      // Find corresponding mesh in cyberpunk model by name
      let cyberpunkObj: THREE.Mesh | undefined;
      cyberpunkModel.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name === romanObj.name) {
          cyberpunkObj = obj;
        }
      });

      if (cyberpunkObj) {
        const romanGeom = romanObj.geometry;
        const cyberpunkGeom = cyberpunkObj.geometry;

        // Only setup morphing if vertices match
        if (romanGeom.attributes.position.count === cyberpunkGeom.attributes.position.count) {
          // Store reference to target geometry for morphing
          container.morphTargets?.set(romanGeom, cyberpunkGeom);

          // Enable morphing on the material if supported
          if (romanObj.material instanceof THREE.Material) {
            const material = romanObj.material as { morphTargets?: boolean };
            if ('morphTargets' in material) {
              material.morphTargets = true;
            }
          }
        }
      }
    });
  }

  /**
   * Update model transition based on progress
   * @param model The model to update
   * @param progress Transition progress (0 = Roman, 1 = Cyberpunk)
   */
  public updateModelTransition(model: THREE.Group, progress: number): void {
    // Get morph targets
    const morphableModel = model as MorphableGroup;
    const { morphTargets } = morphableModel;
    if (!morphTargets) {
      return;
    }

    // Apply transition to all morphable meshes
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const { geometry } = obj;
      if (morphTargets.has(geometry)) {
        // Get target geometry
        const targetGeometry = morphTargets.get(geometry)!;

        // Get position attributes
        const sourcePositions = geometry.attributes.position.array;
        const targetPositions = targetGeometry.attributes.position.array;

        // Create morphed positions by interpolating
        const morphedPositions = new Float32Array(sourcePositions.length);
        for (let i = 0; i < sourcePositions.length; i++) {
          morphedPositions[i] = (1 - progress) * sourcePositions[i] + progress * targetPositions[i];
        }

        // Update geometry
        geometry.setAttribute('position', new THREE.BufferAttribute(morphedPositions, 3));

        // Update normals
        geometry.computeVertexNormals();

        // Mark for update
        geometry.attributes.position.needsUpdate = true;
      }

      // Also transition materials
      if (obj.material) {
        this.updateMaterialTransition(obj, progress);
      }
    });
  }

  /**
   * Update material transition based on progress
   * @param object The object to update
   * @param progress Transition progress (0 = Roman, 1 = Cyberpunk)
   */
  private updateMaterialTransition(object: THREE.Object3D, progress: number): void {
    if (!(object instanceof THREE.Mesh)) return;

    if (Array.isArray(object.material)) {
      // Handle multi-material objects
      object.material.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          this.interpolateMaterialProperties(material, progress);
        }
      });
    } else if (object.material instanceof THREE.MeshStandardMaterial) {
      this.interpolateMaterialProperties(object.material, progress);
    }
  }

  /**
   * Interpolate material properties for transition
   * @param material The material to update
   * @param progress Transition progress (0 = Roman, 1 = Cyberpunk)
   */
  private interpolateMaterialProperties(
    material: THREE.MeshStandardMaterial,
    progress: number
  ): void {
    // Use the user data to store original properties if not already set
    if (!material.userData.originalProperties) {
      material.userData.originalProperties = {
        color: material.color.clone(),
        roughness: material.roughness,
        metalness: material.metalness,
        emissive: material.emissive.clone(),
        emissiveIntensity: material.emissiveIntensity,
      } as MaterialProperties;
    }

    // Get Roman properties (from original material)
    const romanProps = material.userData.originalProperties as MaterialProperties;

    // Get Cyberpunk properties (default values if not specified)
    const defaultProps = {
      color: new THREE.Color(0x2c3e50),
      roughness: 0.2,
      metalness: 0.8,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 0.5,
    };

    const cyberpunkProps =
      (material.userData.cyberpunkProperties as MaterialProperties) || defaultProps;

    // Interpolate properties
    material.color.copy(romanProps.color).lerp(cyberpunkProps.color, progress);
    material.roughness =
      romanProps.roughness * (1 - progress) + cyberpunkProps.roughness * progress;
    material.metalness =
      romanProps.metalness * (1 - progress) + cyberpunkProps.metalness * progress;
    material.emissive.copy(romanProps.emissive).lerp(cyberpunkProps.emissive, progress);
    material.emissiveIntensity =
      romanProps.emissiveIntensity * (1 - progress) + cyberpunkProps.emissiveIntensity * progress;
  }

  /**
   * Count vertices in a model
   * @param model The model to count vertices in
   * @returns Total number of vertices
   */
  private countVertices(model: THREE.Group): number {
    let vertexCount = 0;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        vertexCount += child.geometry.attributes.position.count;
      }
    });
    return vertexCount;
  }

  /**
   * Collect all materials from a model
   * @param model The model to collect materials from
   * @returns Array of materials
   */
  private collectMaterials(model: THREE.Group): THREE.Material[] {
    const materials: THREE.Material[] = [];
    const materialMap = new Map<string, THREE.Material>();

    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (!materialMap.has(mat.uuid)) {
              materialMap.set(mat.uuid, mat);
              materials.push(mat);
            }
          });
        } else if (!materialMap.has(child.material.uuid)) {
          materialMap.set(child.material.uuid, child.material);
          materials.push(child.material);
        }
      }
    });

    return materials;
  }

  /**
   * Clone a model
   * @param model The model to clone
   * @returns Clone of the model
   */
  private cloneModel(model: THREE.Group): THREE.Group {
    return model.clone(true);
  }

  /**
   * Clear the model cache
   */
  public clearCache(): void {
    // Dispose of all cached models
    this.modelCache.forEach((modelInfo) => {
      modelInfo.materials.forEach((mat) => mat.dispose());
      this.disposeModel(modelInfo.model);
    });

    this.modelCache.clear();
  }

  /**
   * Dispose of a model and free memory
   * @param model The model to dispose
   */
  private disposeModel(model: THREE.Group): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  /**
   * Get performance metrics for loaded models
   * @returns Object with performance metrics
   */
  public getPerformanceMetrics(): {
    modelCount: number;
    averageLoadTime: number;
    totalVertices: number;
    materialCount: number;
  } {
    const models = Array.from(this.modelCache.values());
    const modelCount = models.length;
    const totalLoadTime = models.reduce((sum, info) => sum + info.loadTime, 0);
    const totalVertices = models.reduce((sum, info) => sum + info.vertexCount, 0);

    // Count unique materials
    const uniqueMaterials = new Set<string>();
    models.forEach((info) => {
      info.materials.forEach((mat) => uniqueMaterials.add(mat.uuid));
    });

    return {
      modelCount,
      averageLoadTime: modelCount > 0 ? totalLoadTime / modelCount : 0,
      totalVertices,
      materialCount: uniqueMaterials.size,
    };
  }
}

// Export a singleton instance for easy use
export const modelLoader = ModelLoader.getInstance();
