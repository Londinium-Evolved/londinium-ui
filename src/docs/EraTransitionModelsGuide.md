# Era Transition GLB Model System

This guide explains how to use the Era Transition system for GLB models in the Londinium project, which allows for smooth morphing between Roman and Cyberpunk era versions of the same model.

## Overview

The Londinium project features a unique era transition system that smoothly morphs buildings and other objects between Roman and Cyberpunk visual styles. This system works with GLB models to create a seamless transition effect that maintains the structural integrity and position of objects while transforming their appearance.

## Key Components

1. **ModelTransitionLoader**: React component that handles loading and managing GLB models with morphing capability
2. **EraTransitionComponent**: ECS component that tracks era state and transition progress
3. **ModelTransitionSystem**: ECS system that processes model transitions
4. **EraTransitionModelViewer**: Ready-to-use component for displaying models with transition controls

## Prerequisites

To use the era transition system, you need:

1. Pairs of GLB models (Roman and Cyberpunk) with:

   - Same mesh/object names for corresponding parts
   - Same number of vertices for corresponding meshes
   - Similar topology to enable smooth morphing

2. The existing ECS (Entity Component System) architecture

## Basic Usage

The simplest way to use the system is with the EraTransitionModelViewer component:

```tsx
import React from 'react';
import { EraTransitionModelViewer } from '../components/game/EraTransitionModelViewer';
import { Era } from '../state/gameState';

const ModelShowcase: React.FC = () => {
  return (
    <div className='model-showcase'>
      <h2>Era Transition Demo</h2>
      <EraTransitionModelViewer
        romanModelUrl='/assets/models/roman/building.glb'
        cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
        width='800px'
        height='600px'
        initialEra={Era.Roman}
        transitionSpeed={1.5}
      />
    </div>
  );
};

export default ModelShowcase;
```

## Advanced Integration with Game State

For a more integrated approach with game state:

```tsx
import { useGameState } from '../state/useGameState';
import { EraTransitionModelViewer } from '../components/game/EraTransitionModelViewer';

const GameBuildingView: React.FC = () => {
  const { era, transitionSpeed, setEra } = useGameState();

  return (
    <EraTransitionModelViewer
      romanModelUrl='/assets/models/roman/building.glb'
      cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
      initialEra={era}
      transitionSpeed={transitionSpeed}
      onTransitionComplete={setEra}
      showControls={false} // Hide controls when managed by game state
    />
  );
};
```

## Working with the ECS Directly

For more control, you can use the ECS system directly:

```tsx
// Create an entity for a building
const buildingId = entityManager.createEntity();

// Add required components
entityManager.addComponent(buildingId, new PositionComponent(x, y, z));
entityManager.addComponent(buildingId, new EraTransitionComponent(Era.Roman));
entityManager.addComponent(buildingId, {
  type: 'glbModel',
  isLoaded: false,
});

// Get the model transition system
const modelSystem = systemManager.getSystem('modelTransition');

// Load models for the entity
modelSystem.loadModelsForEntity(
  buildingId,
  '/assets/models/roman/building.glb',
  '/assets/models/cyberpunk/building.glb'
);

// Later, to trigger a transition:
const eraComponent = entityManager.getComponent(buildingId, 'eraTransition');
eraComponent.startTransition(Era.Cyberpunk);
```

## Preparing Your GLB Models for Morphing

For optimal morphing results, follow these guidelines when creating your models:

1. **Matching Topology**: Ensure both models have the same overall structure
2. **Consistent Naming**: Use identical names for corresponding parts
3. **Vertex Count**: Maintain the same number of vertices for corresponding meshes
4. **UV Coordinates**: Use consistent UV mapping to avoid texture distortion
5. **Origins**: Keep the model origins consistent

Here's a workflow example using Blender:

1. Create the Roman model first
2. Duplicate the model for Cyberpunk version
3. Modify the duplicated model while preserving vertex count (ensure that modifications do not add or remove vertices; avoid operations like extruding, subdividing, or deleting vertices)
4. Export both models as separate GLB files
5. Test with the EraTransitionModelViewer

## Performance Optimization

The transition system includes several performance optimizations:

1. **Model Caching**: Models are loaded once and reused
2. **Selective Morphing**: Only visible meshes are processed
3. **Efficient Memory Usage**: Geometry data is shared when possible
4. **Lazy Loading**: Models are loaded only when needed

For larger scenes with many transitioning models, consider:

1. **LOD (Level of Detail)**: Use simplified models for distant objects
2. **Instancing**: For repeated elements, use instanced models
3. **Progressive Loading**: Load high-priority models first
4. **View Frustum Culling**: Only process transitions for visible objects

## Material Transition

In addition to geometry morphing, the system supports material transitions:

1. **Color Transitions**: Smoothly blend between era-specific colors
2. **Texture Blending**: Crossfade between different textures
3. **Emission Effects**: Add emission during transition for energy effects
4. **Shader Effects**: Apply custom shader effects for advanced transitions

## Troubleshooting

Common issues and solutions:

1. **Morphing Issues**: If models distort badly during transition, check that both models have the same vertex count and topology
2. **Performance Problems**: For large or complex models, reduce polygon count or use LOD techniques
3. **Missing Parts**: Ensure all meshes have the same names in both models
4. **Texture Issues**: Check that materials are properly set up in both models

## Example Projects

Check these example implementations:

1. `/examples/BuildingTransition`: Basic building transition demo
2. `/examples/CityTransition`: Full city block with multiple buildings
3. `/examples/CharacterTransition`: Character model with animation transitions

## Future Enhancements

Planned improvements to the transition system:

1. **Material Animation**: Enhanced material transition effects
2. **Vertex Color Interpolation**: Smoother color transitions
3. **Partial Transitions**: Transition specific parts of a model independently
4. **Multiple Transition States**: Support for more than two era states

## Related Documentation

- [ECS Architecture Guide](./ECSArchitecture.md)
- [GLB Model Loading Guide](./GLBModelWithECS.md)
- [Performance Optimization Guide](./PerformanceOptimization.md)
