# Creating Morph Targets for Era Transition Models

This guide explains how to prepare GLB models with proper morph targets for use with the Londinium era transition system. Following these guidelines will ensure smooth transitions between Roman and Cyberpunk eras for your models.

## What Are Morph Targets?

Morph targets (also called blend shapes or shape keys) define how a 3D mesh should deform from one shape to another. In Londinium, we use morph targets to smoothly transition models between Roman and Cyberpunk eras.

## Requirements for Successful Morphing

For models to properly morph between eras, they must meet these requirements:

1. **Matching Topology**: Both models must have the same number of vertices arranged in the same order
2. **Identical Mesh Names**: Corresponding meshes must have the same names in both models
3. **Consistent Hierarchy**: Objects should maintain the same parent-child relationships
4. **Analogous UV Mapping**: To prevent texture distortion, maintain similar UV layouts

## Step-by-Step Model Creation Process

### Using Blender

1. **Create the Base Roman Model**:

   - Build your Roman-era model first
   - Use clean topology with appropriate edge loops for deformation
   - Give meshes descriptive names (e.g., "wall_front", "roof_main")

2. **Duplicate for Cyberpunk Version**:

   - Make a full copy of the Roman model
   - Maintain the same object names and hierarchy

3. **Modify the Cyberpunk Version**:

   - Transform the duplicated model into its Cyberpunk aesthetic
   - **IMPORTANT**: Only move existing vertices, NEVER add or remove vertices
   - Use sculpt tools with dynotopo disabled
   - Use proportional editing for controlled deformations

4. **Verify Vertex Count**:

   - Check that both models have the same number of vertices for each corresponding mesh
   - In Blender: Select a mesh and check the "Vertex" count in the status bar
   - Use this script in the Python console to check all objects:

   ```python
   for obj in bpy.context.scene.objects:
       if obj.type == 'MESH':
           print(f"{obj.name}: {len(obj.data.vertices)} vertices")
   ```

5. **Export as Separate GLB Files**:
   - Export the Roman model as "roman\_[modelname].glb"
   - Export the Cyberpunk model as "cyberpunk\_[modelname].glb"
   - Use these export settings:
     - Format: glTF 2.0 (.glb)
     - Include: Selected Objects
     - Transform: +Y Up
     - Check "Apply Modifiers"

### Using Other 3D Software

The principles remain the same regardless of software:

- Create the base model first
- Duplicate it for the second era
- Modify only vertex positions, never topology
- Maintain naming conventions
- Export as separate GLB files

## Advanced Morphing Techniques

### 1. Test with Simple Shapes First

Before creating complex models, practice with simple shapes:

1. Create a cube in Roman style
2. Duplicate and modify to Cyberpunk style
3. Test with the EraModelLoader to verify morphing

### 2. Use Subdivision Wisely

- Apply the same subdivision level to both models
- Apply subdivision modifiers before export

### 3. Handle Material Transitions

- Keep material slots consistent between models
- Use similar naming conventions for materials

## Validation and Testing

After creating your models:

1. **Validate with the ModelValidator Tool**:

   ```tsx
   <ModelValidator
     romanModelUrl='/assets/models/roman/building.glb'
     cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
   />
   ```

2. **Test the Transition**:

   ```tsx
   <EraModelLoader
     romanModelUrl='/assets/models/roman/building.glb'
     cyberpunkModelUrl='/assets/models/cyberpunk/building.glb'
     onRef={(ref) => {
       // Store ref to trigger transitions
       modelRef.current = ref;
     }}
   />;

   // Later trigger a transition:
   modelRef.current?.transitionToEra(Era.Cyberpunk);
   ```

## Common Problems and Solutions

### Problem: Distorted Morphing

**Causes**:

- Different vertex counts
- Vertices in different orders

**Solutions**:

- Ensure both models started from the same base mesh
- Never add or remove vertices when modifying the duplicate
- Verify vertex counts match exactly

### Problem: Parts Don't Transition

**Causes**:

- Mismatched object names
- Missing objects in one model

**Solutions**:

- Use consistent naming
- Ensure all objects exist in both models

### Problem: Performance Issues

**Causes**:

- Too many vertices
- Too many separate objects

**Solutions**:

- Reduce polygon count
- Merge objects where appropriate
- Use LOD (Level of Detail) for distant objects

## Using the useModelLoader Hook

Our system provides a `useModelLoader` hook that handles all aspects of model loading and morphing:

```tsx
import { useModelLoader, Era } from '../../hooks/useModelLoader';

function MyComponent() {
  const { modelRef, currentEra, isTransitioning, transitionProgress, transitionToEra, models } =
    useModelLoader({
      romanModelUrl: '/assets/models/roman/building.glb',
      cyberpunkModelUrl: '/assets/models/cyberpunk/building.glb',
      initialEra: Era.Roman,
      transitionSpeed: 2.0,
      onTransitionComplete: (era) => console.log(`Transitioned to ${era}`),
    });

  // Trigger a transition when needed
  const handleEraChange = (era: Era) => {
    transitionToEra(era);
  };

  return <group ref={modelRef} />;
}
```

## Conclusion

Creating models with proper morph targets takes practice, but following these guidelines will help you create smooth transitions between Roman and Cyberpunk eras. Remember that the key is maintaining consistent topology and naming between your model pairs.

## Related Documentation

- [Era Transition Models Guide](./EraTransitionModelsGuide.md)
- [Performance Optimization Guide](./PerformanceOptimization.md)
- [GLB Model Loading Guide](./GLBModelWithECS.md)
