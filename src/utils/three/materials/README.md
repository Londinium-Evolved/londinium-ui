# THREE.js Material System

This module provides a comprehensive material management system for THREE.js applications, specifically designed for the Londinium project. It implements a singleton factory pattern for creating and managing materials with support for different eras (Roman and Cyberpunk) and building types.

## Features

- 🎨 Material Factory Pattern
- 🔄 Material Caching
- 🏛️ Era-Specific Materials (Roman & Cyberpunk)
- 🏗️ Building-Specific Materials
- 🎯 Custom Material Support
- 🔍 Validation & Type Safety
- 🗑️ Memory Management
- 🔄 Material Updates

## Usage

### Basic Usage

```typescript
import { materialFactory } from './materialFactory';

// Create a Roman material
const romanMaterial = materialFactory.createRomanMaterial({
  color: '#8b7355',
  roughness: 0.8,
});

// Create a Cyberpunk material
const cyberpunkMaterial = materialFactory.createCyberpunkMaterial({
  color: '#2c3e50',
  emissive: '#00ffff',
});

// Create a building material
const buildingMaterial = materialFactory.createBuildingMaterial({
  buildingType: 'domus',
  era: 'roman',
  color: '#8b7355',
});
```

### Material Caching

Materials are automatically cached based on their properties. You can also specify a custom cache key:

```typescript
const material = materialFactory.createRomanMaterial({
  cacheKey: 'my-custom-material',
  color: '#ff0000',
});

// Get the cached material
const cachedMaterial = materialFactory.getCachedMaterial('my-custom-material');
```

### Updating Materials

You can update existing materials without creating new instances:

```typescript
materialFactory.updateCachedMaterial('my-custom-material', {
  roughness: 0.5,
  metalness: 0.8,
});
```

### Memory Management

```typescript
// Dispose a specific material
materialFactory.disposeMaterial('my-custom-material');

// Dispose all cached materials
materialFactory.disposeCachedMaterials();
```

## Automatic Cache Key Generation

The system now includes automatic cache key generation to avoid the need for manual cache keys. This provides several benefits:

1. **Consistency**: Keys are generated in a standardized format
2. **Correctness**: All relevant properties are included in the key
3. **Convenience**: No need to manually create and manage cache keys
4. **Deduplication**: Materials with identical properties automatically reuse the same instance

### How it Works

The `generateAutomaticCacheKey` function analyzes material properties and creates a deterministic key based on:

- Material type prefix (roman, cyberpunk, custom)
- Color properties (including hex values, emissive colors)
- Numeric properties (roughness, metalness, etc.)
- Texture references (using UUIDs for identification)
- Boolean properties (flatShading, wireframe, etc.)

### Usage Example

In most cases, you don't need to specify cache keys manually:

```typescript
// Materials with identical properties will be cached and reused automatically
const material1 = materialFactory.createRomanMaterial({
  color: '#ff0000',
  roughness: 0.5,
});

const material2 = materialFactory.createRomanMaterial({
  color: '#ff0000',
  roughness: 0.5,
});

// material1 and material2 will be the same instance
console.log(material1 === material2); // true
```

For special cases where you want to control caching explicitly, you can still provide a manual cache key:

```typescript
const material = materialFactory.createRomanMaterial({
  color: '#ff0000',
  roughness: 0.5,
  cacheKey: 'my-specific-key',
});
```

## Enhanced Material Update System

The material system now includes advanced update capabilities to efficiently modify materials without creating new instances:

### Basic Updates

```typescript
// Update a single cached material
materialFactory.updateCachedMaterial('my-material', {
  roughness: 0.5,
  metalness: 0.8,
});
```

### Batch Updates

```typescript
// Update multiple materials at once
materialFactory.batchUpdateMaterials(['material1', 'material2', 'material3'], {
  emissive: '#00ffff',
  emissiveIntensity: 0.5,
});
```

### Mesh Hierarchy Updates

```typescript
// Update all materials on a model or scene
materialFactory.updateMeshMaterials(myModel, {
  roughness: 0.3,
  metalness: 0.7,
});

// Update only specific materials using a filter
materialFactory.updateMeshMaterials(myModel, { emissive: '#ff0000' }, (material) =>
  material.name.includes('Highlight')
);
```

### Material Transitions

```typescript
// Smoothly transition between material states
const romanState = { roughness: 0.8, metalness: 0.1, color: '#8b7355' };
const cyberpunkState = { roughness: 0.2, metalness: 0.8, color: '#2c3e50' };

// Transition 60% of the way from Roman to Cyberpunk
materialFactory.interpolateMaterial(material, romanState, cyberpunkState, 0.6);
```

## Modular Architecture

The material system has been refactored into a modular architecture for better maintainability:

### Core Components

- **MaterialFactory**: Centralized facade for material creation and management
- **Material Creators**: Specialized classes for specific material types
  - `RomanMaterialCreator`: Roman-era material creation
  - `CyberpunkMaterialCreator`: Cyberpunk-era material creation
  - `BuildingMaterialCreator`: Building-specific materials
  - `CustomMaterialCreator`: Custom material properties
- **MaterialUpdateSystem**: Advanced material update capabilities
- **Validators**: Input validation and error handling
- **CacheKeyGenerator**: Automatic material caching system

### Directory Structure

```
materials/
├── creators/
│   ├── RomanMaterialCreator.ts
│   ├── CyberpunkMaterialCreator.ts
│   ├── BuildingMaterialCreator.ts
│   ├── CustomMaterialCreator.ts
│   └── index.ts
├── types.ts
├── validators.ts
├── automaticCacheKeyGenerator.ts
├── materialUpdater.ts
├── MaterialUpdateSystem.ts
└── README.md
```

## Testing

The system includes comprehensive tests for all modules. Run the tests using:

```bash
npm test
```

## Type Safety

The system is fully typed with TypeScript, providing:

- Type-safe material creation
- Validated inputs
- Proper type inference
- Comprehensive interfaces for all configurations

## Performance Considerations

- Materials are cached to prevent duplicate instances
- Textures are properly disposed when no longer needed
- Updates are performed in-place when possible
- Cache keys are optimized for quick lookups

## Contributing

When contributing to this system:

1. Ensure all new features have corresponding tests
2. Validate inputs appropriately
3. Update documentation as needed
4. Follow the existing patterns for consistency
5. Consider memory management implications

## License

This material system is part of the Londinium project and is subject to its licensing terms.
