# Procedural Generation Architecture

This directory contains the core procedural generation algorithms for Londinium UI. These algorithms are responsible for creating historically accurate buildings, urban layouts, and citizens that can transform between Roman and Cyberpunk eras.

## Design Principles

1. **Deterministic Generation**: All procedural generation is seed-based to ensure reproducibility.
2. **Era Parameterization**: Generation functions accept era parameters to produce appropriate outputs.
3. **Performance Optimization**: Algorithms are designed for efficiency and can be offloaded to Web Workers.
4. **Historical Accuracy**: Roman-era generation follows archaeological evidence, while Cyberpunk generation follows established genre conventions.
5. **Configuration-Driven Architecture**: Building generation uses configuration objects to decouple parameters from generation logic.

## Building Generation

The building generation system creates structures appropriate to each era using a configuration-driven approach:

### Configuration-Driven Architecture

The building generator now uses a configuration-driven approach that decouples building parameters from generation logic. This enables:

- **Enhanced Era Transitions**: Smooth interpolation between Roman and Cyberpunk building parameters
- **Improved Maintainability**: Single source of truth for building parameters
- **Reduced Code Duplication**: Generic generation functions that work with any building type
- **Simplified Extension**: New building types only require configuration, not new functions

Building configurations are defined as:

```typescript
interface BuildingConfig {
  widthRange: [number, number];
  depthRange: [number, number];
  heightRange: [number, number];
  material: THREE.MeshStandardMaterial;
}

// Example configuration for a Roman domus
const domusConfig: BuildingConfig = {
  widthRange: [5, 7],
  depthRange: [7, 10],
  heightRange: [3, 4],
  material: new THREE.MeshStandardMaterial({ color: '#c9b18f' }),
};
```

### Roman Era Buildings

- **Domus**: Roman houses with atrium, peristyle, and compluvium

  - Parameters: width range, depth range, height range, material
  - Based on archaeological floor plans from Pompeii and Herculaneum

- **Insula**: Multi-story apartment buildings
  - Parameters: width range, depth range, height range, material
  - Structural deterioration varies based on distance from city center

### Cyberpunk Era Buildings

- **Megacorp Tower**: Corporate headquarters

  - Parameters: width range, depth range, height range, material with emissive properties
  - Inspired by classic cyberpunk visual media

- **Residential Stack**: High-density housing
  - Parameters: width range, depth range, height range, material with emissive properties
  - Based on cyberpunk literary descriptions

## Urban Layout Generation

The urban layout system determines the placement of buildings and streets:

### Roman Era Layout

- Grid pattern streets (cardines and decumani)
- Public buildings positioned according to Roman city planning principles
- Centuriation grid patterns for settlement layouts

### Cyberpunk Era Layout

- Corporate structures dominate central urban areas
- Residential zones pushed to periphery
- Pronounced vertical social stratification
- Neo-brutalist architectural influence

## Era Transition System

The transition system morphs buildings and urban layouts between eras:

- **Configuration Interpolation**: Linear interpolation between Roman and Cyberpunk configurations
- **Parameter Blending**: Smooth transitions for width, depth, height, and other parameters
- **Material Transitions**: Switching between era-appropriate materials based on progress
- Geometry morphing with vertex interpolation
- Resource system evolution (Roman: Food, Wood, Stone, Metal → Cyberpunk: Energy, Cybernetic Components, Data)
- Building functionality preservation with technology evolution

## Usage

```typescript
import { generateBuildingGeometry, getBuildingConfig } from './buildingGenerator';

// Generate a Roman-era building
const romanBuilding = generateBuildingGeometry({
  position: [0, 0, 0],
  rotation: 0,
  scale: [1, 1, 1],
  type: 'domus',
  era: 'roman',
  seed: 12345,
});

// Generate a Cyberpunk-era building
const cyberpunkBuilding = generateBuildingGeometry({
  position: [0, 0, 0],
  rotation: 0,
  scale: [1, 1, 1],
  type: 'megacorp-tower',
  era: 'cyberpunk',
  seed: 12345,
});

// Get a configuration for a transitional building (50% between eras)
const transitionalConfig = getBuildingConfig('insula', 'roman', 0.5);
```

## Era Transition Testing

You can test the era transition system using the provided demo functions:

```typescript
import { testBuildingTransition } from './buildingTransitionDemo';

// Test the transition for a specific building type
testBuildingTransition('domus');

// This will output the dimensions and materials for buildings at different
// era transition progress points from 0 (Roman) to 1 (Cyberpunk)
```

## Worker Integration

For complex generation tasks, use the Web Worker system:

```

```
