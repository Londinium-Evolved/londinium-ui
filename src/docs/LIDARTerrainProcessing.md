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

- **Roman Era**: Narrower Thames, more prominent Walbrook stream, restored historical elevations
- **Cyberpunk Era**: Modified terrain for megastructure foundations

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

## Implementation Notes

- Uses GeoTIFF.js for parsing LIDAR data files
- Implements bilinear interpolation for quality resampling
- Uses THREE.js PlaneGeometry with displacement
- Properly manages memory to handle large datasets
- Adapts terrain appearance based on game era
