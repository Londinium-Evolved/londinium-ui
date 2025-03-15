declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { Group, LoadingManager } from 'three';

  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: { scene: Group }) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: { scene: Group }) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}
