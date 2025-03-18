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
- `RomanBuildingShowcase`: A component that showcases historically accurate Roman buildings

## Roman Building Generator

The Roman building generator (`romanBuildingGenerator.ts`) creates historically accurate Roman buildings based on archaeological evidence and historical references. It implements the following building types:

### Supported Roman Building Types

1. **Domus** - Roman elite houses

   - Features central atrium with compluvium (roof opening)
   - Peristyle garden courtyard with columns
   - Historically accurate proportions based on archaeological findings
   - Reference: Wallace-Hadrill, A. (1994). Houses and Society in Pompeii and Herculaneum

2. **Insula** - Apartment buildings for common people

   - Multi-story structures (3-6 floors)
   - Ground floor shops (tabernae)
   - Small windows arranged realistically
   - Reference: Storey, G. (2004). The Meaning of Insula in Roman Residential Context

3. **Temple** - Religious structures

   - Podium (raised platform) with steps
   - Cella (inner chamber)
   - Columns around the exterior (peripteral or prostyle)
   - Triangular pediment
   - Reference: MacDonald, W. (1982). The Architecture of the Roman Empire

4. **Bath** - Public bathing facilities
   - Multiple sections: caldarium, tepidarium, frigidarium
   - Domed structures
   - Columns supporting public spaces
   - Thicker floors for hypocaust (underfloor heating) systems
   - Reference: Yegül, F. (1992). Baths and Bathing in Classical Antiquity

### Usage

```typescript
import { generateRomanBuilding } from './utils/procedural/romanBuildingGenerator';
import { BuildingConfig } from './utils/procedural/buildingGenerator';

// Create a building configuration
const config: BuildingConfig = {
  widthRange: [5, 7] as [number, number],
  depthRange: [7, 10] as [number, number],
  heightRange: [3, 4] as [number, number],
  material: new THREE.MeshStandardMaterial({ color: '#c9b18f' }),
  // ... other configuration options
};

// Generate a Roman building
const buildingData = generateRomanBuilding('domus', config, 12345); // type, config, seed

// Use the resulting geometry and materials
const { geometry, materials } = buildingData;
```

### Historical Accuracy

The generator implements features based on archaeological evidence and historical studies:

- **Proportions** - Building dimensions follow historical guidelines
- **Architectural Elements** - Includes atria, peristyles, columns, and other period-appropriate features
- **Materials** - Material appearances match Roman construction techniques
- **Variations** - Procedurally generates variations while maintaining historical plausibility

### Performance

The generator is optimized for real-time applications:

- Deterministic generation based on seed values
- LOD (Level of Detail) support via the building generator pipeline
- Efficient geometry generation with vertex sharing
- Cached results for repeated building types

### Showcase Component

A showcase component is available at `/roman-buildings` to demonstrate the different building types and their historical features.

## Architecture

The system consists of several key modules:

- `buildingGenerator.ts`: Main generation logic and API
- `buildingCSG.ts`: Constructive solid geometry utilities
- `configurationLoader.ts`: Configuration loading and management
- `buildingLOD.ts`: Level of detail generation
- `romanBuildingGenerator.ts`: Historically accurate Roman building generation

## Future Enhancements

- Support for more building types and eras
- Advanced material configuration with textures
- Procedural interior generation
- Runtime configuration editing
- Performance profiling and optimization
