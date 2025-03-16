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
  roughness: 0.8
});

// Create a Cyberpunk material
const cyberpunkMaterial = materialFactory.createCyberpunkMaterial({
  color: '#2c3e50',
  emissive: '#00ffff'
});

// Create a building material
const buildingMaterial = materialFactory.createBuildingMaterial({
  buildingType: 'domus',
  era: 'roman',
  color: '#8b7355'
});
```

### Material Caching

Materials are automatically cached based on their properties. You can also specify a custom cache key:

```typescript
const material = materialFactory.createRomanMaterial({
  cacheKey: 'my-custom-material',
  color: '#ff0000'
});

// Get the cached material
const cachedMaterial = materialFactory.getCachedMaterial('my-custom-material');
```

### Updating Materials

You can update existing materials without creating new instances:

```typescript
materialFactory.updateCachedMaterial('my-custom-material', {
  roughness: 0.5,
  metalness: 0.8
});
```

### Memory Management

```typescript
// Dispose a specific material
materialFactory.disposeMaterial('my-custom-material');

// Dispose all cached materials
materialFactory.disposeCachedMaterials();
```

## Architecture

The system is composed of several modules:

- `materialFactory.ts`: Main factory class implementing the singleton pattern
- `types.ts`: TypeScript interfaces and types
- `validators.ts`: Input validation functions
- `colorUtils.ts`: Color manipulation utilities
- `cacheKeyGenerator.ts`: Cache key generation logic
- `materialUpdater.ts`: Material property update functionality

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