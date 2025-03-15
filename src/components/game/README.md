# GLB Model Transition System

This directory contains components for loading and rendering GLB models with era transition morphing capabilities for the Londinium project.

## Overview

The Londinium project features a unique era transition system that allows buildings and other objects to morph between Roman and Cyberpunk visual styles. This system is implemented using Three.js morph targets and integrated with our Entity Component System (ECS) architecture.

## Key Components

### ModelTransitionLoader

The core component that handles loading GLB models and morphing between them. It:

- Loads Roman and Cyberpunk versions of a model
- Creates morph targets for smooth transitions
- Handles the transition animation
- Exposes methods for controlling transitions

```tsx
<ModelTransitionLoader
  romanModelUrl='/assets/models/roman/building.glb'
  cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
  initialEra={Era.Roman}
  transitionSpeed={2.0}
  onTransitionComplete={(era) => console.log(`Transition to ${era} complete`)}
/>
```

### EraTransitionModelViewer

A ready-to-use component that provides a complete viewing environment for models with transition capabilities:

- Camera controls
- Environment lighting
- Transition controls
- Configurable settings

```tsx
<EraTransitionModelViewer
  romanModelUrl='/assets/models/roman/building.glb'
  cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
  width='800px'
  height='600px'
  initialEra={Era.Roman}
  transitionSpeed={1.5}
  showControls={true}
  environmentPreset='city'
/>
```

## ECS Integration

The system is integrated with our Entity Component System through:

1. **EraTransitionComponent**: Tracks era state and transition progress
2. **ModelTransitionSystem**: Processes model transitions
3. **GlbModelComponent**: Stores model data and state

## Model Requirements

For optimal morphing results, models should have:

1. **Matching Topology**: Same overall structure
2. **Consistent Naming**: Identical names for corresponding parts
3. **Vertex Count**: Same number of vertices for corresponding meshes
4. **UV Coordinates**: Consistent UV mapping
5. **Origins**: Consistent model origins

## Usage Examples

### Basic Usage

```tsx
import { EraTransitionModelViewer } from '../components/game/EraTransitionModelViewer';
import { Era } from '../components/game/ModelTransitionLoader';

function BuildingViewer() {
  return (
    <EraTransitionModelViewer
      romanModelUrl='/assets/models/roman/building.glb'
      cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
      initialEra={Era.Roman}
    />
  );
}
```

### Programmatic Control

```tsx
import { useRef } from 'react';
import { ModelTransitionLoader, Era } from '../components/game/ModelTransitionLoader';

function ControlledTransition() {
  const modelRef = useRef<{ transitionToEra: (era: Era) => void }>(null);

  const handleTransition = (era: Era) => {
    if (modelRef.current) {
      modelRef.current.transitionToEra(era);
    }
  };

  return (
    <>
      <button onClick={() => handleTransition(Era.Roman)}>Roman Era</button>
      <button onClick={() => handleTransition(Era.Cyberpunk)}>Cyberpunk Era</button>

      <ModelTransitionLoader
        ref={modelRef}
        romanModelUrl='/assets/models/roman/building.glb'
        cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
      />
    </>
  );
}
```

## Demo

Check out the era transition demo at `/era-transition-demo` to see the system in action.

## Performance Considerations

- Models are cached to avoid loading the same model multiple times
- Only visible meshes are processed for morphing
- Geometry data is shared when possible
- Consider using LOD (Level of Detail) for distant objects
- For repeated elements, use instanced models

## Future Enhancements

- Enhanced material transition effects
- Smoother color transitions
- Partial transitions for specific parts of a model
- Support for more than two era states

## Related Documentation

For more detailed information, see:

- [Era Transition Models Guide](../../docs/EraTransitionModelsGuide.md)
- [ECS Architecture Guide](../../docs/ECSArchitecture.md)
- [GLB Model Loading Guide](../../docs/GLBModelWithECS.md)
