import * as THREE from 'three';
import { BuildingConfig } from './buildingGenerator';
import { BuildingType } from '../../state/BuildingState';
import { Era } from '../../state/gameState';
import { materialFactory } from '../three/materialFactory';

/**
 * Interface for JSON-serializable building configuration
 * This doesn't include THREE.js objects which need to be instantiated
 */
export interface SerializableBuildingConfig {
  widthRange: [number, number];
  depthRange: [number, number];
  heightRange: [number, number];
  material: {
    color: string;
    roughness?: number;
    metalness?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  features?: {
    windows?: {
      enabled: boolean;
      density: number;
      size: [number, number];
      style: 'roman' | 'cyberpunk' | 'modern';
    };
    doors?: {
      width: number;
      height: number;
      position: 'center' | 'offset';
      style: 'roman' | 'cyberpunk' | 'modern';
    };
    roof?: {
      style: 'flat' | 'peaked' | 'domed';
      height: number;
      overhang: number;
    };
    decoration?: {
      level: number;
      style: 'roman' | 'cyberpunk' | 'modern';
    };
  };
  variations?: {
    wallThickness?: number;
    floorThickness?: number;
    columnDensity?: number;
    roomDivisions?: number;
  };
  performance?: {
    detailLevel?: number;
    maxVertices?: number;
    textureResolution?: 'low' | 'medium' | 'high';
  };
}

/**
 * Type for the building configurations JSON file
 */
export interface BuildingConfigurationsFile {
  buildingTypes: Record<
    BuildingType,
    {
      roman: SerializableBuildingConfig;
      cyberpunk: SerializableBuildingConfig;
    }
  >;
  version: string;
  lastUpdated: string;
}

/**
 * Class responsible for loading and managing building configurations
 */
export class ConfigurationLoader {
  private static instance: ConfigurationLoader;
  private configs: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }> =
    {} as Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>;
  private defaultConfigs: Record<
    BuildingType,
    { roman: BuildingConfig; cyberpunk: BuildingConfig }
  >;

  private constructor(
    defaultConfigs: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>
  ) {
    this.defaultConfigs = defaultConfigs;
    this.configs = JSON.parse(JSON.stringify(defaultConfigs));
    this.convertMaterialsFromJSON(this.configs);
  }

  /**
   * Get the singleton instance of the configuration loader
   */
  public static getInstance(
    defaultConfigs?: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>
  ): ConfigurationLoader {
    if (!ConfigurationLoader.instance) {
      if (!defaultConfigs) {
        throw new Error('Default configs must be provided when initializing ConfigurationLoader');
      }
      ConfigurationLoader.instance = new ConfigurationLoader(defaultConfigs);
    }
    return ConfigurationLoader.instance;
  }

  /**
   * Load configurations from a JSON file
   */
  public async loadConfigurationsFromJSON(jsonFilePath: string): Promise<void> {
    try {
      const response = await fetch(jsonFilePath);
      const configurationsFile: BuildingConfigurationsFile = await response.json();

      // Validate the configurations file
      this.validateConfigurationsFile(configurationsFile);

      // Convert the serializable configs to BuildingConfig objects
      const newConfigs = configurationsFile.buildingTypes;
      this.configs = this.convertConfigurationsFromJSON(newConfigs);

      console.log(`Successfully loaded building configurations from ${jsonFilePath}`);
    } catch (error) {
      console.error(`Failed to load configurations from ${jsonFilePath}:`, error);
      // Fall back to default configurations
      this.resetToDefaultConfigurations();
    }
  }

  /**
   * Reset to the default configurations
   */
  public resetToDefaultConfigurations(): void {
    this.configs = JSON.parse(JSON.stringify(this.defaultConfigs));
    this.convertMaterialsFromJSON(this.configs);
    console.log('Reset to default building configurations');
  }

  /**
   * Get the configuration for a specific building type and era
   */
  public getConfiguration(type: BuildingType, era: Era): BuildingConfig {
    if (!this.configs[type] || !this.configs[type][era]) {
      console.warn(
        `No configuration found for building type ${type} and era ${era}, using default`
      );
      return this.defaultConfigs[type][era];
    }
    return this.configs[type][era];
  }

  /**
   * Save current configurations to a JSON file (for development and testing)
   */
  public serializeConfigurations(): BuildingConfigurationsFile {
    const serializableConfigs: Record<
      BuildingType,
      {
        roman: SerializableBuildingConfig;
        cyberpunk: SerializableBuildingConfig;
      }
    > = {} as Record<
      BuildingType,
      { roman: SerializableBuildingConfig; cyberpunk: SerializableBuildingConfig }
    >;

    for (const [type, eras] of Object.entries(this.configs)) {
      serializableConfigs[type as BuildingType] = {
        roman: this.convertConfigurationToSerializable(eras.roman),
        cyberpunk: this.convertConfigurationToSerializable(eras.cyberpunk),
      };
    }

    return {
      buildingTypes: serializableConfigs,
      version: '1.0',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Convert a BuildingConfig to a serializable format
   */
  private convertConfigurationToSerializable(config: BuildingConfig): SerializableBuildingConfig {
    const result: SerializableBuildingConfig = {
      widthRange: config.widthRange,
      depthRange: config.depthRange,
      heightRange: config.heightRange,
      material: {
        color: config.material.color
          ? '#' + (config.material.color as THREE.Color).getHexString()
          : '#ffffff',
        roughness: config.material.roughness,
        metalness: config.material.metalness,
        emissive: config.material.emissive
          ? '#' + (config.material.emissive as THREE.Color).getHexString()
          : undefined,
        emissiveIntensity: config.material.emissiveIntensity,
      },
    };

    if (config.features) result.features = config.features;
    if (config.variations) result.variations = config.variations;
    if (config.performance) result.performance = config.performance;

    return result;
  }

  /**
   * Validate the configurations file
   */
  private validateConfigurationsFile(configurationsFile: BuildingConfigurationsFile): void {
    if (!configurationsFile.buildingTypes) {
      throw new Error('Invalid configurations file: missing buildingTypes');
    }

    // Check if all required building types are present
    for (const type of Object.keys(this.defaultConfigs)) {
      if (!configurationsFile.buildingTypes[type as BuildingType]) {
        throw new Error(
          `Invalid configurations file: missing configuration for building type ${type}`
        );
      }

      // Check if both eras are present for each building type
      if (!configurationsFile.buildingTypes[type as BuildingType].roman) {
        throw new Error(
          `Invalid configurations file: missing Roman era configuration for building type ${type}`
        );
      }
      if (!configurationsFile.buildingTypes[type as BuildingType].cyberpunk) {
        throw new Error(
          `Invalid configurations file: missing Cyberpunk era configuration for building type ${type}`
        );
      }
    }
  }

  /**
   * Convert serializable configurations to BuildingConfig objects
   */
  private convertConfigurationsFromJSON(
    configs: Record<
      BuildingType,
      { roman: SerializableBuildingConfig; cyberpunk: SerializableBuildingConfig }
    >
  ): Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }> {
    const result: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }> =
      {} as Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>;

    for (const [type, eras] of Object.entries(configs)) {
      result[type as BuildingType] = {
        roman: this.convertSerializableToConfiguration(eras.roman),
        cyberpunk: this.convertSerializableToConfiguration(eras.cyberpunk),
      };
    }

    return result;
  }

  /**
   * Convert a serializable configuration to a BuildingConfig
   */
  private convertSerializableToConfiguration(config: SerializableBuildingConfig): BuildingConfig {
    const material = new THREE.MeshStandardMaterial({
      color: config.material.color,
      roughness: config.material.roughness,
      metalness: config.material.metalness,
    });

    if (config.material.emissive) {
      material.emissive = new THREE.Color(config.material.emissive);
      material.emissiveIntensity = config.material.emissiveIntensity || 0;
    }

    const result: BuildingConfig = {
      widthRange: config.widthRange,
      depthRange: config.depthRange,
      heightRange: config.heightRange,
      material,
    };

    if (config.features) result.features = config.features;
    if (config.variations) result.variations = config.variations;
    if (config.performance) result.performance = config.performance;

    return result;
  }

  /**
   * Convert materials in place from JSON representation to THREE.js materials
   */
  private convertMaterialsFromJSON(
    configs: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>
  ): void {
    for (const eras of Object.values(configs)) {
      for (const [eraType, era] of Object.entries(eras)) {
        const material = era.material;
        // If the material isn't a proper THREE.js material yet, convert it
        if (!(material instanceof THREE.Material) && typeof material === 'object') {
          const matConfig = material as unknown as {
            color: THREE.ColorRepresentation;
            roughness?: number;
            metalness?: number;
            emissive?: THREE.ColorRepresentation;
            emissiveIntensity?: number;
          };

          // Use our factory based on the era
          if (eraType === 'roman') {
            era.material = materialFactory.createRomanMaterial({
              color: matConfig.color,
              roughness: matConfig.roughness,
              metalness: matConfig.metalness,
              emissive: matConfig.emissive,
              emissiveIntensity: matConfig.emissiveIntensity,
              cacheKey: `config_roman_${JSON.stringify(matConfig.color)}`,
            });
          } else {
            era.material = materialFactory.createCyberpunkMaterial({
              color: matConfig.color,
              roughness: matConfig.roughness,
              metalness: matConfig.metalness,
              emissive: matConfig.emissive,
              emissiveIntensity: matConfig.emissiveIntensity,
              cacheKey: `config_cyberpunk_${JSON.stringify(matConfig.color)}`,
            });
          }
        }
      }
    }
  }
}

/**
 * Helper function to initialize the configuration loader with default configs
 */
export function initializeConfigurationLoader(
  defaultConfigs: Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>
): ConfigurationLoader {
  return ConfigurationLoader.getInstance(defaultConfigs);
}

/**
 * Helper function to load building configurations from a JSON file
 */
export async function loadBuildingConfigurations(jsonFilePath: string): Promise<void> {
  const loader = ConfigurationLoader.getInstance();
  await loader.loadConfigurationsFromJSON(jsonFilePath);
}

/**
 * Helper function to get a building configuration
 */
export function getBuildingConfigFromLoader(type: BuildingType, era: Era): BuildingConfig {
  const loader = ConfigurationLoader.getInstance();
  return loader.getConfiguration(type, era);
}
