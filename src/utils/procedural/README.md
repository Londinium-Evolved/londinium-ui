# Procedural Generation Architecture

This directory contains the core procedural generation algorithms for Londinium UI. These algorithms are responsible for creating historically accurate buildings, urban layouts, and citizens that can transform between Roman and Cyberpunk eras.

## Design Principles

1. **Deterministic Generation**: All procedural generation is seed-based to ensure reproducibility.
2. **Era Parameterization**: Generation functions accept era parameters to produce appropriate outputs.
3. **Performance Optimization**: Algorithms are designed for efficiency and can be offloaded to Web Workers.
4. **Historical Accuracy**: Roman-era generation follows archaeological evidence, while Cyberpunk generation follows established genre conventions.

## Building Generation

The building generation system creates structures appropriate to each era:

### Roman Era Buildings

- **Domus**: Roman houses with atrium, peristyle, and compluvium

  - Parameters: atrium size, peristyle columns, compluvium ratio
  - Based on archaeological floor plans from Pompeii and Herculaneum

- **Insula**: Multi-story apartment buildings
  - Parameters: height (stories), apartment subdivision, ground-floor commercial probability
  - Structural deterioration varies based on distance from city center

### Cyberpunk Era Buildings

- **Megacorp Tower**: Corporate headquarters

  - Parameters: height ratio, neon density, antenna clusters, skywalk connections
  - Inspired by classic cyberpunk visual media

- **Residential Stack**: High-density housing
  - Parameters: unit density, exterior walkways, satellite dish density, ad billboard ratio
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

- Geometry morphing with vertex interpolation
- Resource system evolution (Roman: Food, Wood, Stone, Metal → Cyberpunk: Energy, Cybernetic Components, Data)
- Building functionality preservation with technology evolution

## Usage

```typescript
import { generateBuildingGeometry } from './buildingGenerator';

// Generate a Roman-era building
const romanBuilding = generateBuildingGeometry({
  width: 10,
  height: 5,
  depth: 8,
  floors: 2,
  seed: 12345,
  era: 'roman',
});

// Generate a Cyberpunk-era building
const cyberpunkBuilding = generateBuildingGeometry({
  width: 10,
  height: 30,
  depth: 8,
  floors: 15,
  seed: 12345,
  era: 'cyberpunk',
});
```

## Worker Integration

For complex generation tasks, use the Web Worker system:

```typescript
// In main thread
const worker = new Worker(new URL('../../workers/proceduralWorker.ts', import.meta.url), {
  type: 'module',
});

worker.onmessage = (event) => {
  const { type, result, id } = event.data;
  if (type === 'building-generated') {
    // Use the generated building data
    console.log(`Building ${id} generated:`, result);
  }
};

// Request building generation
worker.postMessage({
  type: 'generate-building',
  params: {
    width: 10,
    height: 20,
    depth: 8,
    floors: 5,
    seed: 12345,
    era: 'cyberpunk',
  },
  id: 'building-1',
});
```
