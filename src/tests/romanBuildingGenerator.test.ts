import * as THREE from 'three';
import { generateRomanBuilding } from '../utils/procedural/romanBuildingGenerator';
import { BuildingConfig } from '../utils/procedural/buildingGenerator';
import { BuildingType } from '../state/types';

describe('Roman Building Generator', () => {
  const testBuildingConfig: BuildingConfig = {
    widthRange: [5, 7] as [number, number],
    depthRange: [7, 10] as [number, number],
    heightRange: [3, 4] as [number, number],
    material: new THREE.MeshStandardMaterial({ color: '#c9b18f' }),
    features: {
      windows: {
        enabled: true,
        density: 0.3,
        size: [0.5, 0.8] as [number, number],
        style: 'roman' as const,
      },
      doors: {
        width: 1.2,
        height: 2.2,
        position: 'center' as const,
        style: 'roman' as const,
      },
      roof: {
        style: 'peaked' as const,
        height: 0.3,
        overhang: 0.4,
      },
      decoration: {
        level: 0.7,
        style: 'roman' as const,
      },
    },
    variations: {
      wallThickness: 0.2,
      floorThickness: 0.2,
      columnDensity: 0.8,
      roomDivisions: 5,
    },
    performance: {
      detailLevel: 0.8,
      textureResolution: 'medium' as const,
    },
  };

  const romanBuildingTypes: BuildingType[] = ['domus', 'insula', 'temple', 'bath'];

  test.each(romanBuildingTypes)('generates valid Roman %s geometry', (buildingType) => {
    // Arrange
    const seed = 12345; // Fixed seed for reproducibility

    // Act
    const result = generateRomanBuilding(buildingType, testBuildingConfig, seed);

    // Assert
    expect(result).toBeDefined();
    expect(result.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(result.materials).toBeDefined();
    expect(result.materials.length).toBeGreaterThan(0);
    expect(result.type).toBe(buildingType);

    // Validate the geometry has expected attributes
    const positionAttribute = result.geometry.getAttribute('position');
    expect(positionAttribute).toBeDefined();
    expect(positionAttribute.count).toBeGreaterThan(0);

    // Basic historical accuracy checks - use a safety check to handle InterleavedBufferAttribute
    if (positionAttribute) {
      const bounds = new THREE.Box3().setFromBufferAttribute(
        positionAttribute as THREE.BufferAttribute
      );
      const size = new THREE.Vector3();
      bounds.getSize(size);

      // Check if building dimensions are within expected ranges
      switch (buildingType) {
        case 'domus':
          // Domus should have reasonable dimensions based on historical references
          expect(size.x).toBeGreaterThan(4); // Width
          expect(size.z).toBeGreaterThan(6); // Depth
          expect(size.y).toBeGreaterThan(2); // Height
          break;

        case 'insula':
          // Insulae were multi-story buildings
          expect(size.y).toBeGreaterThan(6); // Should be tall (multi-story)
          break;

        case 'temple':
          // Temples had columns and were generally imposing structures
          expect(size.y).toBeGreaterThan(4); // Height should be significant
          break;

        case 'bath':
          // Baths were large public structures
          expect(size.x * size.z).toBeGreaterThan(100); // Footprint size
          break;
      }
    }
  });

  test('measures generation performance', () => {
    // Arrange
    const seed = 54321;
    const buildingType: BuildingType = 'domus';

    // Act
    const start = performance.now();
    generateRomanBuilding(buildingType, testBuildingConfig, seed);
    const generationTime = performance.now() - start;

    // Assert - building generation should be reasonably fast for game performance
    console.log(`${buildingType} generation time: ${generationTime.toFixed(2)}ms`);
    expect(generationTime).toBeLessThan(500); // 500ms is a reasonable upper limit for tests
  });

  test('generates deterministic buildings with same seed', () => {
    // Arrange
    const seed = 789;
    const buildingType: BuildingType = 'temple';

    // Act
    const building1 = generateRomanBuilding(buildingType, testBuildingConfig, seed);
    const building2 = generateRomanBuilding(buildingType, testBuildingConfig, seed);

    // Assert - buildings with same seed should have identical vertex counts
    const position1 = building1.geometry.getAttribute('position');
    const position2 = building2.geometry.getAttribute('position');

    expect(position1.count).toBe(position2.count);

    // Check if positions are defined before comparing
    if (position1 && position2) {
      // Sample some vertices to verify they're identical
      const sampleSize = Math.min(position1.count, 10);
      for (let i = 0; i < sampleSize; i++) {
        expect(position1.getX(i)).toBeCloseTo(position2.getX(i));
        expect(position1.getY(i)).toBeCloseTo(position2.getY(i));
        expect(position1.getZ(i)).toBeCloseTo(position2.getZ(i));
      }
    }
  });

  test('verify historical accuracy of domus building', () => {
    // Arrange
    const seed = 42;
    const buildingType: BuildingType = 'domus';

    // Act
    const result = generateRomanBuilding(buildingType, testBuildingConfig, seed);

    // Assert - check for the presence of key architectural features
    // We'll use the presence of a significant number of vertices as a proxy for feature complexity
    const positionAttribute = result.geometry.getAttribute('position');
    expect(positionAttribute.count).toBeGreaterThan(200); // A domus should be complex enough

    // Calculate the bounding box to get height
    if (positionAttribute) {
      const bounds = new THREE.Box3().setFromBufferAttribute(
        positionAttribute as THREE.BufferAttribute
      );
      const size = new THREE.Vector3();
      bounds.getSize(size);

      // Historically accurate domus features:
      // 1. Width-to-length ratio: typically 2:3 or similar
      expect(size.z / size.x).toBeGreaterThanOrEqual(1.2); // Domus were typically longer than wide

      // 2. Height-to-width ratio: typically lower buildings
      expect(size.y / size.x).toBeLessThan(1); // Height usually less than width for domus

      // 3. Atrium and peristyle space would occupy significant volume
      // This is harder to test directly, but we can confirm the overall dimensions match Roman architecture
      expect(size.x).toBeGreaterThan(4); // Width should be substantial
      expect(size.y).toBeLessThan(5); // Height should be modest (typically one-story with some taller spaces)
    }
  });
});
