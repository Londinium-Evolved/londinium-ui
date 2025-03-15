import * as THREE from 'three';

/**
 * Custom shader for era transition effects
 * This shader combines:
 * 1. Material properties transition between Roman and Cyberpunk
 * 2. Edge glow effect during transition
 * 3. Rippling energy wave effect
 */

// Vertex shader
const vertexShader = `
  // Common variables
  uniform float transitionProgress;

  // Original position attributes
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  // Material color transition uniforms
  uniform vec3 romanColor;
  uniform vec3 cyberpunkColor;
  uniform float romanMetalness;
  uniform float cyberpunkMetalness;
  uniform float romanRoughness;
  uniform float cyberpunkRoughness;

  // Transition effect uniforms
  uniform float glowIntensity;
  uniform float waveFrequency;
  uniform float waveAmplitude;

  // Variables to pass to fragment shader
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vTransitionFactor;

  void main() {
    // Pass data to fragment shader
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vTransitionFactor = transitionProgress;

    // Calculate transition wave effect
    // This creates a rippling effect emanating from the center during transition
    float distance = length(position.xy);
    float wave = sin(distance * waveFrequency - transitionProgress * 10.0) * waveAmplitude;

    // Only apply wave effect during transition (not at start or end states)
    float waveIntensity = 4.0 * transitionProgress * (1.0 - transitionProgress);
    vec3 newPosition = position;

    // Add wave effect along normal direction
    if (transitionProgress > 0.0 && transitionProgress < 1.0) {
      newPosition += normal * wave * waveIntensity;
    }

    // Set the final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader
const fragmentShader = `
  // Common variables
  uniform float transitionProgress;

  // Material properties
  uniform vec3 romanColor;
  uniform vec3 cyberpunkColor;
  uniform float romanMetalness;
  uniform float cyberpunkMetalness;
  uniform float romanRoughness;
  uniform float cyberpunkRoughness;
  uniform sampler2D romanTexture;
  uniform sampler2D cyberpunkTexture;
  uniform bool hasRomanTexture;
  uniform bool hasCyberpunkTexture;

  // Lighting properties
  uniform vec3 romanEmissive;
  uniform vec3 cyberpunkEmissive;
  uniform float romanEmissiveIntensity;
  uniform float cyberpunkEmissiveIntensity;

  // Transition effect properties
  uniform float glowIntensity;
  uniform vec3 glowColor;

  // Values from vertex shader
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vTransitionFactor;

  void main() {
    // Calculate transition-based effects
    float t = vTransitionFactor;

    // Transition between material colors
    vec3 baseColor;

    // Handle texture blending if textures are provided
    if (hasRomanTexture && hasCyberpunkTexture) {
      vec4 romanTexColor = texture2D(romanTexture, vUv);
      vec4 cyberpunkTexColor = texture2D(cyberpunkTexture, vUv);
      baseColor = mix(romanTexColor.rgb, cyberpunkTexColor.rgb, t);
    } else {
      // Otherwise blend between solid colors
      baseColor = mix(romanColor, cyberpunkColor, t);
    }

    // Calculate edge glow effect
    // This highlights edges during transition
    float edgeFactor = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float glowFactor = edgeFactor * glowIntensity * 4.0 * t * (1.0 - t);
    vec3 glowEffect = glowColor * glowFactor;

    // Calculate emissive contribution
    vec3 emissiveColor = mix(romanEmissive * romanEmissiveIntensity,
                           cyberpunkEmissive * cyberpunkEmissiveIntensity,
                           t);

    // During transition peak, add extra emissive power
    float transitionPeak = 4.0 * t * (1.0 - t);
    emissiveColor += glowColor * transitionPeak * 0.5;

    // Combine all effects for final color
    vec3 finalColor = baseColor + glowEffect + emissiveColor;

    // Output the final color
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Creates a shader material for era transition effects
 * @param options Parameters for the transition shader
 * @returns A ShaderMaterial with transition effects
 */
export function createTransitionMaterial(options?: {
  romanColor?: THREE.Color;
  cyberpunkColor?: THREE.Color;
  romanMetalness?: number;
  cyberpunkMetalness?: number;
  romanRoughness?: number;
  cyberpunkRoughness?: number;
  romanEmissive?: THREE.Color;
  cyberpunkEmissive?: THREE.Color;
  romanEmissiveIntensity?: number;
  cyberpunkEmissiveIntensity?: number;
  glowColor?: THREE.Color;
  glowIntensity?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  romanTexture?: THREE.Texture;
  cyberpunkTexture?: THREE.Texture;
}) {
  // Default options
  const defaults = {
    romanColor: new THREE.Color(0x8b7355), // Terracotta/stone color
    cyberpunkColor: new THREE.Color(0x00ffff), // Cyan
    romanMetalness: 0.1,
    cyberpunkMetalness: 0.8,
    romanRoughness: 0.8,
    cyberpunkRoughness: 0.2,
    romanEmissive: new THREE.Color(0x000000), // No emission
    cyberpunkEmissive: new THREE.Color(0x00ffff), // Cyan glow
    romanEmissiveIntensity: 0.0,
    cyberpunkEmissiveIntensity: 0.5,
    glowColor: new THREE.Color(0x00ffff), // Cyan glow
    glowIntensity: 0.5,
    waveFrequency: 5.0,
    waveAmplitude: 0.02,
    romanTexture: undefined,
    cyberpunkTexture: undefined,
  };

  // Merge provided options with defaults
  const params = { ...defaults, ...options };

  // Create shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      transitionProgress: { value: 0.0 },
      romanColor: { value: params.romanColor },
      cyberpunkColor: { value: params.cyberpunkColor },
      romanMetalness: { value: params.romanMetalness },
      cyberpunkMetalness: { value: params.cyberpunkMetalness },
      romanRoughness: { value: params.romanRoughness },
      cyberpunkRoughness: { value: params.cyberpunkRoughness },
      romanEmissive: { value: params.romanEmissive },
      cyberpunkEmissive: { value: params.cyberpunkEmissive },
      romanEmissiveIntensity: { value: params.romanEmissiveIntensity },
      cyberpunkEmissiveIntensity: { value: params.cyberpunkEmissiveIntensity },
      glowColor: { value: params.glowColor },
      glowIntensity: { value: params.glowIntensity },
      waveFrequency: { value: params.waveFrequency },
      waveAmplitude: { value: params.waveAmplitude },
      romanTexture: { value: params.romanTexture },
      cyberpunkTexture: { value: params.cyberpunkTexture },
      hasRomanTexture: { value: params.romanTexture !== null },
      hasCyberpunkTexture: { value: params.cyberpunkTexture !== null },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  // Set custom renderer features for advanced shader features
  // TypeScript doesn't know about these THREE.js shader material extensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (material as any).extensions = {
    derivatives: true, // For better normal handling
    fragDepth: false,
    drawBuffers: false,
    shaderTextureLOD: false,
  };

  return material;
}

/**
 * Class for managing transition effects between Roman and Cyberpunk eras
 */
export class TransitionMaterialManager {
  private materials: THREE.ShaderMaterial[] = [];
  private transitionProgress: number = 0;

  /**
   * Apply transition shader to a model
   * @param model The model to apply transition effect to
   * @param romanColors Optional map of mesh names to roman colors
   * @param cyberpunkColors Optional map of mesh names to cyberpunk colors
   */
  applyToModel(
    model: THREE.Object3D,
    romanColors?: Map<string, THREE.Color>,
    cyberpunkColors?: Map<string, THREE.Color>
  ): void {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      // Store original material for potential restoration
      if (!object.userData.originalMaterial) {
        object.userData.originalMaterial = object.material;
      }

      // Create custom colors based on the mesh name if provided
      const romanColor = romanColors?.get(object.name) || new THREE.Color(0x8b7355);
      const cyberpunkColor = cyberpunkColors?.get(object.name) || new THREE.Color(0x00ffff);

      // Create and apply transition material
      const material = createTransitionMaterial({
        romanColor,
        cyberpunkColor,
        // We can extract textures from original material if it has them
        romanTexture: this.extractTexture(object.userData.originalMaterial),
      });

      // Replace the object's material and store reference between material and object
      object.material = material;
      material.userData = { ...material.userData, attachedObject: object };

      // Store for later updates
      this.materials.push(material);
    });
  }

  /**
   * Extract the main texture from a material if present
   */
  private extractTexture(material: THREE.Material): THREE.Texture | undefined {
    if (material instanceof THREE.MeshStandardMaterial && material.map) {
      return material.map;
    }
    return undefined;
  }

  /**
   * Update the transition progress for all managed materials
   * @param progress Transition progress from 0 (Roman) to 1 (Cyberpunk)
   */
  updateTransitionProgress(progress: number): void {
    this.transitionProgress = progress;

    // Update all shader materials
    for (const material of this.materials) {
      material.uniforms.transitionProgress.value = progress;
    }
  }

  /**
   * Restore original materials to all affected objects
   */
  restoreOriginalMaterials(): void {
    for (const material of this.materials) {
      const attachedObject = material.userData?.attachedObject as THREE.Mesh;
      if (attachedObject && attachedObject.userData.originalMaterial) {
        attachedObject.material = attachedObject.userData.originalMaterial;
      }
    }

    // Clear the materials array
    this.materials = [];
  }

  /**
   * Dispose of all managed materials
   */
  dispose(): void {
    for (const material of this.materials) {
      material.dispose();
    }
    this.materials = [];
  }
}
