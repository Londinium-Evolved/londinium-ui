# Using GLB Models with the ECS Architecture

This guide explains how to integrate 3D GLB models with the Entity Component System (ECS) architecture in the Londinium project.

## Overview

GLB files (Binary GL Transmission Format) are a binary file format for 3D models that efficiently package geometry, materials, textures, and animations in a single file. In the Londinium project, we use Three.js and React Three Fiber to render these models and integrate them with our ECS architecture.

## Key Components

1. **ModelSystem**: A dedicated system for loading and managing GLB models
2. **GlbModelComponent**: A component that stores model data and state
3. **Integration with ECS**: How models relate to entities with position, rotation, and other components
4. **Model Caching and Resource Management**: Efficient handling of model resources

## Usage Example

Here's a basic example of how to load and render a GLB model using our ECS architecture:

```tsx
import React from 'react';
import { GlbModelScene } from '../components/game/GlbModelScene';

const ModelViewer: React.FC = () => {
  return (
    <div className='model-viewer'>
      <h2>Roman Building Model</h2>
      <GlbModelScene modelUrl='/assets/models/your-model.glb' width='800px' height='600px' />
    </div>
  );
};

export default ModelViewer;
```

## Loading Models Through ECS

To load a model and attach it to an entity:

1. Create an entity with the necessary components (position, rotation, etc.)
2. Add a GLB model component with the URL to the model
3. The ModelSystem will handle loading, caching, and rendering the model

```typescript
// Create an entity
const entityId = entityManager.createEntity();

// Add position and other transform components
entityManager.addComponent(entityId, {
  type: 'position',
  x: 0,
  y: 0,
  z: 0,
});

entityManager.addComponent(entityId, {
  type: 'rotation',
  x: 0,
  y: 0,
  z: 0,
});

// Add the model component
entityManager.addComponent(entityId, {
  type: 'glbModel',
  url: '/path/to/model.glb',
  visible: true,
});
```

## Performance Considerations

When working with GLB models in the ECS architecture, consider these performance optimizations:

1. **Model Caching**: Models are cached to avoid loading the same model multiple times
2. **Resource Disposal**: Proper cleanup of Three.js resources when entities are removed
3. **Level of Detail (LOD)**: For complex models, consider implementing LOD for distant views
4. **Instanced Rendering**: For repeated models, use InstancedMesh to reduce draw calls

## Animations

To handle animations in GLB models:

1. Create an AnimationComponent that stores animation data
2. Implement an AnimationSystem that updates animations
3. Extract animations from the GLB file and control them through components

```typescript
// Add animation component
entityManager.addComponent(entityId, {
  type: 'animation',
  clipName: 'Walk',
  playing: true,
  speed: 1.0,
  loop: true,
});
```

## Integration with Game Logic

Models can be connected to game logic through the ECS:

1. Create systems that modify entity components based on game state
2. The model will automatically update as components change
3. Additional components can be added for specific behaviors (e.g., damage, health)

## Material and Texture Modifications

To modify materials and textures:

1. Create a MaterialComponent that stores material properties
2. Implement a MaterialSystem that updates Three.js materials
3. Connect material properties to entity state

## Troubleshooting

Common issues when working with GLB models:

1. **Models Not Visible**: Check if the camera position is appropriate for viewing the model
2. **Missing Textures**: Ensure textures are properly packed in the GLB file
3. **Memory Leaks**: Always dispose of geometries and materials when removing models
4. **Import Errors**: Make sure Three.js and related packages are properly installed

## Related Components

- `ModelLoader.tsx`: React component for loading individual models
- `GlbModelScene.tsx`: Complete scene setup with entity management
- `ModelSystem.ts`: ECS system for handling model loading and updates

## Project Structure

```
src/
├── ecs/
│   ├── components/
│   │   └── GLBModelComponent.ts
│   └── systems/
│       └── ModelSystem.ts
├── components/
│   └── game/
│       ├── ModelLoader.tsx
│       └── GlbModelScene.tsx
└── assets/
    └── models/
        └── your-model.glb
```

## Next Steps

- Implement model LOD for better performance
- Add animation support for character models
- Create a model registry for centralized management
- Add physics integration for dynamic models
