# LIDAR Terrain Processing System

This documentation covers the LIDAR terrain processing system implemented for Londinium. The system processes Digital Terrain Model (DTM) LIDAR data from the Environment Agency and creates an accurate terrain representation for Roman Londinium.

## Overview

The LIDAR terrain system consists of several components:

1. **LIDARTerrainProcessor**: Core class for processing LIDAR data
2. **WebWorker**: For offloading heavy computation to a background thread
3. **React Hook**: For using the processor within React components
4. **React Component**: For rendering the terrain in the game world

## Data Processing Pipeline

The system implements a robust pipeline for loading and transforming LIDAR data:

1. **GeoTIFF Parsing**: Loads elevation data from GeoTIFF files
2. **Bilinear Interpolation**: Resamples data to target resolution
3. **Feature Identification**: Detects rivers, hills and other geological features
4. **Historical Adjustments**: Modifies terrain to match Roman-era topology
5. **Geometry Generation**: Creates Three.js geometries for rendering
6. **Normal Map Generation**: Generates textures for realistic lighting

## Usage

### Basic Usage

```tsx
import { LIDARTerrain } from '../components/game/terrain/LIDARTerrain';

function GameWorld() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      <LIDARTerrain
        dataUrl='/path/to/lidar-data.tif'
        settings={{
          resolution: { width: 1024, height: 1024 },
          segmentSize: 10,
          heightScale: 1.0,
          era: 'roman',
        }}
      />

      {/* Other game elements */}
    </Canvas>
  );
}
```

### Custom Processing

For more control over the processing pipeline, you can use the hook directly:

```tsx
import { useLIDARTerrain } from '../hooks/useLIDARTerrain';

function CustomTerrain() {
  const { isLoading, error, terrainGeometry, normalMap, processor, loadTerrain } =
    useLIDARTerrain();

  // Custom loading logic
  useEffect(() => {
    fetch('/path/to/lidar-data.tif')
      .then((response) => response.arrayBuffer())
      .then((data) => {
        loadTerrain(data, {
          resolution: { width: 1024, height: 1024 },
          segmentSize: 10,
          heightScale: 1.0,
          era: 'roman',
        });
      });
  }, []);

  // Custom rendering logic
  // ...
}
```

## Era Transitions

The system supports transitions between eras (Roman to Cyberpunk) by modifying the terrain:

- **Roman Era**: Narrower Thames, more prominent Walbrook stream, restored historical elevations
- **Cyberpunk Era**: Modified terrain for megastructure foundations

## Specifying Eras

To specify the desired era in the settings, use the following format:

```json
{
  "era": "roman" // or "cyberpunk"
}
```

## Performance Considerations

The system is designed with performance in mind:

- **Multi-threaded Processing**: Uses WebWorkers for heavy computation
- **Memory Efficiency**: Properly disposes of resources when no longer needed
- **Progressive Loading**: Supports loading data at different resolutions
- **Proper Cleanup**: Resources are disposed when components unmount

## Reference Features

The terrain processing system particularly handles these important geographical features:

1. **Thames River**: Narrower and shallower in Roman times
2. **Walbrook Stream**: A prominent feature in Roman London, now buried
3. **Ludgate Hill**: Had greater prominence in Roman times
4. **Cornhill**: One of the three hills of Roman Londinium
5. **Fleet River**: Wider and navigable to Holborn in Roman times

## Geological Feature Identification

The system includes an advanced algorithm for identifying key geological features from raw heightmap data. This capability is crucial for accurate historical terrain reconstruction and gameplay elements that interact with specific terrain features.

### Detection Methodology

The feature identification process uses spatial analysis through a quadtree data structure:

1. **Spatial Partitioning**: Heightmap data is organized in a quadtree for efficient querying
2. **Elevation Thresholds**: Analysis of height distribution to identify significant deviations
3. **Connected Region Analysis**: Groups of similar elevation points are clustered into regions
4. **Morphological Analysis**: Shape characteristics (aspect ratio, size) determine feature type
5. **Feature Classification**: Identification as hills, rivers, or other geological elements

### Feature Types

The system identifies these primary feature types:

- **Rivers**: Elongated low-elevation features (aspect ratio > 3)
- **Hills**: Clustered high-elevation regions
- **Valleys**: Depressions between elevated areas
- **Plains**: Relatively flat regions with consistent elevation

### Named Features

For historically significant elements, specific feature detection includes:

- **Thames River**: Detected based on width and position in the terrain
- **Walbrook Stream**: Narrower waterway with specific location criteria
- **Ludgate Hill**: Elevated area on the western side
- **Cornhill**: Elevated area on the eastern side

### Feature Metadata

Each identified feature contains rich metadata:

```typescript
interface GeologicalFeature {
  name: string; // Feature identifier
  type: string; // 'river', 'hill', etc.
  bounds: {
    // Spatial extent
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  metadata: {
    // Feature-specific properties
    averageHeight: number; // Average elevation
    pointCount: number; // Size in data points
    aspectRatio?: number; // For elongated features
    // Other properties...
  };
}
```

### Historical Adaptation

Detected features serve as the basis for era-specific terrain adjustments:

1. **Feature Detection**: Base terrain is analyzed to identify key features
2. **Historical Research**: Geographic data is cross-referenced with archaeological findings
3. **Adjustment Application**: Terrain is modified based on era-specific parameters for each feature
4. **Validation**: System ensures physical plausibility of the adjusted terrain

### Accessing Feature Data

Developers can access the identified features through the processor:

```typescript
// Get all geological features
const features = processor.getGeologicalFeatures();

// Find a specific feature (e.g., Thames River)
const thames = Array.from(features.values()).find((feature) => feature.name === 'thames');

// Use feature properties for game logic
if (thames) {
  const width = thames.bounds.maxX - thames.bounds.minX;
  // Apply game-specific logic based on the width...
}
```

## Implementation Notes

- Uses GeoTIFF.js for parsing LIDAR data files
- Implements bilinear interpolation for quality resampling
- Uses THREE.js PlaneGeometry with vertex displacement mapping, where vertices are displaced according to height data from LIDAR for a more detailed terrain representation.
- Properly manages memory to handle large datasets
- Adapts terrain appearance based on game era
