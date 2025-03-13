# Configuration-Based Procedural Building Generation

This module provides a flexible, configuration-driven system for procedurally generating buildings in the Londinium project. It supports different building types, eras, and detailed customization through JSON configuration files.

## Key Features

- **Configuration-Driven Generation**: Buildings are generated based on detailed configuration objects
- **JSON Configuration Loading**: Load building configurations from external JSON files
- **Era-Specific Configurations**: Different configurations for Roman and Cyberpunk eras
- **Transition Support**: Smooth interpolation between era configurations
- **Performance Optimization**: Configurable level of detail (LOD) generation

## Usage

### Basic Usage

```typescript
import { generateBuildingGeometry, initializeConfigurationSystem } from './buildingGenerator';

// Initialize the configuration system
initializeConfigurationSystem();

// Generate a building
const buildingData = generateBuildingGeometry({
  position: [0, 0, 0],
  rotation: 0,
  scale: [1, 1, 1],
  type: 'domus',
  era: 'roman',
  seed: 12345,
});

// Create a mesh with the generated geometry
const buildingMesh = new THREE.Mesh(buildingData.geometry, buildingData.materials);
```

### Loading Custom Configurations

```typescript
import { loadBuildingConfigurationsFromJSON } from './buildingGenerator';

// Load configurations from a JSON file
await loadBuildingConfigurationsFromJSON('/assets/configs/buildings.json');
```

## Configuration Schema

Building configurations follow this structure:

```typescript
interface BuildingConfig {
  // Basic dimensions
  widthRange: [number, number];
  depthRange: [number, number];
  heightRange: [number, number];
  material: THREE.MeshStandardMaterial;

  // Enhanced features
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

  // Structural variations
  variations?: {
    wallThickness?: number;
    floorThickness?: number;
    columnDensity?: number;
    roomDivisions?: number;
  };

  // Performance settings
  performance?: {
    detailLevel?: number;
    maxVertices?: number;
    textureResolution?: 'low' | 'medium' | 'high';
  };
}
```

## JSON Configuration Format

JSON configuration files should follow this structure:

```json
{
  "buildingTypes": {
    "domus": {
      "roman": {
        "widthRange": [5, 7],
        "depthRange": [7, 10],
        "heightRange": [3, 4],
        "material": {
          "color": "#c9b18f",
          "roughness": 0.6,
          "metalness": 0.1
        },
        "features": {
          "windows": {
            "enabled": true,
            "density": 0.3,
            "size": [0.5, 0.8],
            "style": "roman"
          }
          // ... other features
        }
        // ... other configuration properties
      },
      "cyberpunk": {
        // ... cyberpunk era configuration
      }
    }
    // ... other building types
  },
  "version": "1.0.0",
  "lastUpdated": "2025-03-12T12:00:00Z"
}
```

## Components

The system includes React components for easy integration:

- `BuildingGenerator`: A component that generates a single building
- `BuildingShowcase`: A component that displays a grid of buildings with different configurations

## Architecture

The system consists of several key modules:

- `buildingGenerator.ts`: Main generation logic and API
- `buildingCSG.ts`: Constructive solid geometry utilities
- `configurationLoader.ts`: Configuration loading and management
- `buildingLOD.ts`: Level of detail generation

## Future Enhancements

- Support for more building types and eras
- Advanced material configuration with textures
- Procedural interior generation
- Runtime configuration editing
- Performance profiling and optimization
