import * as THREE from 'three';
import {
  BuildingParams,
  generateBuildingGeometry,
  getBuildingConfig,
  BuildingMeshData,
} from './buildingGenerator';
import { BuildingType } from '../../state/BuildingState';
import { Era } from '../../state/gameState';

/**
 * Demo function that demonstrates the transition between Roman and Cyberpunk eras
 * for a specific building type by generating buildings at different era progress points
 */
export function demonstrateEraTransition(
  buildingType: BuildingType,
  steps: number = 10
): BuildingMeshData[] {
  const results: BuildingMeshData[] = [];
  const seed = 12345; // Fixed seed for consistent results in demo

  // Generate buildings at various era progress points from Roman to Cyberpunk
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps; // 0 = roman, 1 = cyberpunk

    // Determine era based on progress
    const era: Era = progress < 0.5 ? 'roman' : 'cyberpunk';

    // Create building parameters
    const params: BuildingParams = {
      position: [0, 0, 0],
      rotation: 0,
      scale: [1, 1, 1],
      type: buildingType,
      era,
      seed,
    };

    // Pass the era progress to the building generator
    // In a real application, this would come from the game state
    const config = getBuildingConfig(buildingType, era, progress);
    console.log(`Era Progress ${progress.toFixed(2)}: Building dimensions:`, {
      widthRange: config.widthRange,
      depthRange: config.depthRange,
      heightRange: config.heightRange,
      material: config.material.color,
    });

    // Generate building and add to results
    const building = generateBuildingGeometry(params);
    results.push(building);
  }

  return results;
}

/**
 * This function can be called from the browser console to test the era transition
 * It uses the transition demo function above and outputs the results
 *
 * Example usage in console:
 * import('./buildingTransitionDemo').then(m => m.testBuildingTransition('domus'))
 */
export function testBuildingTransition(buildingType: BuildingType = 'domus'): void {
  console.log(`Testing building transition for type: ${buildingType}`);
  const buildings = demonstrateEraTransition(buildingType);

  console.log(`Generated ${buildings.length} buildings for transition demo:`);
  buildings.forEach((building, index) => {
    const progress = index / (buildings.length - 1);
    console.log(`Building at progress ${progress.toFixed(2)}:`, {
      dimensions: {
        width: (building.geometry as THREE.BoxGeometry).parameters.width,
        height: (building.geometry as THREE.BoxGeometry).parameters.height,
        depth: (building.geometry as THREE.BoxGeometry).parameters.depth,
      },
      material: building.materials[0].type,
    });
  });

  console.log('Transition test complete');
}
