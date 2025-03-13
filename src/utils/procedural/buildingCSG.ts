import * as THREE from 'three';

/**
 * BuildingCSG provides utility functions for constructive solid geometry operations
 * on THREE.js geometries. This is used to create complex building structures by
 * combining, subtracting, and intersecting simple geometric shapes.
 *
 * Since THREE.js doesn't have built-in CSG operations, this module provides simplified
 * functions to simulate these operations for the procedural building generator.
 */

/**
 * Creates a hollow box by subtracting an inner box from an outer box
 *
 * @param outerWidth Width of the outer box
 * @param outerHeight Height of the outer box
 * @param outerDepth Depth of the outer box
 * @param wallThickness Thickness of the walls
 * @param bottomThickness Thickness of the bottom (floor)
 * @param hasRoof Whether to include a roof (top)
 * @returns A geometry representing a hollow box
 */
export function createHollowBox(
  outerWidth: number,
  outerHeight: number,
  outerDepth: number,
  wallThickness: number = 0.2,
  bottomThickness: number = 0.2,
  hasRoof: boolean = true
): THREE.BufferGeometry {
  // Calculate inner dimensions (for reference)
  const innerWidth = outerWidth - wallThickness * 2;
  const innerDepth = outerDepth - wallThickness * 2;

  // Create geometries for the walls, floor, and optional roof
  const geometries: THREE.BufferGeometry[] = [];

  // Front wall
  const frontWall = new THREE.BoxGeometry(outerWidth, outerHeight, wallThickness);
  frontWall.translate(0, 0, outerDepth / 2 - wallThickness / 2);
  geometries.push(frontWall);

  // Back wall
  const backWall = new THREE.BoxGeometry(outerWidth, outerHeight, wallThickness);
  backWall.translate(0, 0, -outerDepth / 2 + wallThickness / 2);
  geometries.push(backWall);

  // Left wall
  const leftWall = new THREE.BoxGeometry(
    wallThickness,
    outerHeight,
    outerDepth - wallThickness * 2
  );
  leftWall.translate(-outerWidth / 2 + wallThickness / 2, 0, 0);
  geometries.push(leftWall);

  // Right wall
  const rightWall = new THREE.BoxGeometry(
    wallThickness,
    outerHeight,
    outerDepth - wallThickness * 2
  );
  rightWall.translate(outerWidth / 2 - wallThickness / 2, 0, 0);
  geometries.push(rightWall);

  // Floor
  const floor = new THREE.BoxGeometry(innerWidth, bottomThickness, innerDepth);
  floor.translate(0, -outerHeight / 2 + bottomThickness / 2, 0);
  geometries.push(floor);

  // Roof (optional)
  if (hasRoof) {
    const roof = new THREE.BoxGeometry(innerWidth, wallThickness, innerDepth);
    roof.translate(0, outerHeight / 2 - wallThickness / 2, 0);
    geometries.push(roof);
  }

  // Create a single merged geometry
  return mergeBufferGeometries(geometries);
}

/**
 * Creates a Roman-style atrium with columns, compluvium, and impluvium
 *
 * @param width Width of the atrium
 * @param height Height of the atrium
 * @param depth Depth of the atrium
 * @param columnRadius Radius of the columns
 * @param columnHeight Height of the columns
 * @param compluviumRatio Ratio of the compluvium opening to atrium size
 * @returns A geometry representing a Roman atrium
 */
export function createRomanAtrium(
  width: number,
  height: number,
  depth: number,
  columnRadius: number = 0.15,
  columnHeight: number = 2.5,
  compluviumRatio: number = 0.2
): { geometry: THREE.BufferGeometry; columnPositions: THREE.Vector3[] } {
  const geometries: THREE.BufferGeometry[] = [];
  const columnPositions: THREE.Vector3[] = [];

  // Create the floor
  const floorThickness = 0.1;
  const floor = new THREE.BoxGeometry(width, floorThickness, depth);
  floor.translate(0, -height / 2 + floorThickness / 2, 0);
  geometries.push(floor);

  // Create the compluvium (opening in the roof)
  const compluviumWidth = width * compluviumRatio;
  const compluviumDepth = depth * compluviumRatio;

  // Create the roof with a hole for the compluvium
  // For simplicity, we'll use separate box geometries for the roof segments
  const roofThickness = 0.15;

  // Front roof segment
  const frontRoof = new THREE.BoxGeometry(width, roofThickness, (depth - compluviumDepth) / 2);
  frontRoof.translate(0, height / 2 - roofThickness / 2, depth / 4 + compluviumDepth / 4);
  geometries.push(frontRoof);

  // Back roof segment
  const backRoof = new THREE.BoxGeometry(width, roofThickness, (depth - compluviumDepth) / 2);
  backRoof.translate(0, height / 2 - roofThickness / 2, -depth / 4 - compluviumDepth / 4);
  geometries.push(backRoof);

  // Left roof segment
  const leftRoof = new THREE.BoxGeometry(
    (width - compluviumWidth) / 2,
    roofThickness,
    compluviumDepth
  );
  leftRoof.translate(-width / 4 - compluviumWidth / 4, height / 2 - roofThickness / 2, 0);
  geometries.push(leftRoof);

  // Right roof segment
  const rightRoof = new THREE.BoxGeometry(
    (width - compluviumWidth) / 2,
    roofThickness,
    compluviumDepth
  );
  rightRoof.translate(width / 4 + compluviumWidth / 4, height / 2 - roofThickness / 2, 0);
  geometries.push(rightRoof);

  // Create the impluvium (basin under the compluvium)
  const impluviumWidth = compluviumWidth * 1.5;
  const impluviumDepth = compluviumDepth * 1.5;
  const impluviumHeight = 0.3;

  const impluvium = new THREE.BoxGeometry(impluviumWidth, impluviumHeight, impluviumDepth);
  impluvium.translate(0, -height / 2 + impluviumHeight / 2 + floorThickness, 0);
  geometries.push(impluvium);

  // Create columns around the perimeter
  const numColumnsWidth = Math.max(2, Math.floor(width / 2));
  const numColumnsDepth = Math.max(2, Math.floor(depth / 2));

  const columnSpacingWidth = width / (numColumnsWidth + 1);
  const columnSpacingDepth = depth / (numColumnsDepth + 1);

  const cylinderGeometry = new THREE.CylinderGeometry(
    columnRadius,
    columnRadius * 1.2, // Wider at the base
    columnHeight,
    8 // Number of segments (octagonal columns)
  );

  // Create columns along the perimeter
  for (let w = 0; w < numColumnsWidth; w++) {
    for (let d = 0; d < numColumnsDepth; d++) {
      // Skip columns that aren't on the perimeter
      const isPerimeterW = w === 0 || w === numColumnsWidth - 1;
      const isPerimeterD = d === 0 || d === numColumnsDepth - 1;

      if (!isPerimeterW && !isPerimeterD) {
        continue;
      }

      const xPos = -width / 2 + columnSpacingWidth * (w + 1);
      const zPos = -depth / 2 + columnSpacingDepth * (d + 1);

      const columnInstance = cylinderGeometry.clone();
      columnInstance.translate(xPos, -height / 2 + columnHeight / 2 + floorThickness, zPos);

      geometries.push(columnInstance);
      columnPositions.push(new THREE.Vector3(xPos, 0, zPos));
    }
  }

  return {
    geometry: mergeBufferGeometries(geometries),
    columnPositions,
  };
}

/**
 * Creates a Roman peristyle (garden courtyard surrounded by columns)
 *
 * @param width Width of the peristyle
 * @param height Height of the peristyle
 * @param depth Depth of the peristyle
 * @param columnRadius Radius of the columns
 * @param columnHeight Height of the columns
 * @returns A geometry representing a Roman peristyle
 */
export function createRomanPeristyle(
  width: number,
  height: number,
  depth: number,
  columnRadius: number = 0.15,
  columnHeight: number = 2.5
): { geometry: THREE.BufferGeometry; columnPositions: THREE.Vector3[] } {
  const geometries: THREE.BufferGeometry[] = [];
  const columnPositions: THREE.Vector3[] = [];

  // Create the floor/garden area
  const floorThickness = 0.1;
  const floor = new THREE.BoxGeometry(width, floorThickness, depth);
  floor.translate(0, -height / 2 + floorThickness / 2, 0);
  geometries.push(floor);

  // Create columns around the perimeter
  const columnInset = columnRadius * 3; // Inset from the edge
  const perimeterWidth = width - columnInset * 2;
  const perimeterDepth = depth - columnInset * 2;

  const numColumnsWidth = Math.max(3, Math.floor(perimeterWidth / 1.5));
  const numColumnsDepth = Math.max(3, Math.floor(perimeterDepth / 1.5));

  const columnSpacingWidth = perimeterWidth / (numColumnsWidth - 1);
  const columnSpacingDepth = perimeterDepth / (numColumnsDepth - 1);

  const cylinderGeometry = new THREE.CylinderGeometry(
    columnRadius,
    columnRadius * 1.2, // Wider at the base
    columnHeight,
    8 // Number of segments (octagonal columns)
  );

  // Create columns along the perimeter
  for (let w = 0; w < numColumnsWidth; w++) {
    const xPos = -perimeterWidth / 2 + columnSpacingWidth * w;

    // Front row
    const frontColumn = cylinderGeometry.clone();
    frontColumn.translate(
      xPos,
      -height / 2 + columnHeight / 2 + floorThickness,
      -perimeterDepth / 2
    );
    geometries.push(frontColumn);
    columnPositions.push(new THREE.Vector3(xPos, 0, -perimeterDepth / 2));

    // Back row
    const backColumn = cylinderGeometry.clone();
    backColumn.translate(xPos, -height / 2 + columnHeight / 2 + floorThickness, perimeterDepth / 2);
    geometries.push(backColumn);
    columnPositions.push(new THREE.Vector3(xPos, 0, perimeterDepth / 2));
  }

  // Add side columns (skip the corners as they're already added)
  for (let d = 1; d < numColumnsDepth - 1; d++) {
    const zPos = -perimeterDepth / 2 + columnSpacingDepth * d;

    // Left side
    const leftColumn = cylinderGeometry.clone();
    leftColumn.translate(
      -perimeterWidth / 2,
      -height / 2 + columnHeight / 2 + floorThickness,
      zPos
    );
    geometries.push(leftColumn);
    columnPositions.push(new THREE.Vector3(-perimeterWidth / 2, 0, zPos));

    // Right side
    const rightColumn = cylinderGeometry.clone();
    rightColumn.translate(
      perimeterWidth / 2,
      -height / 2 + columnHeight / 2 + floorThickness,
      zPos
    );
    geometries.push(rightColumn);
    columnPositions.push(new THREE.Vector3(perimeterWidth / 2, 0, zPos));
  }

  // Create a central garden feature
  const gardenFeatureRadius = Math.min(width, depth) * 0.15;
  const gardenFeatureHeight = 0.5;

  const gardenFeature = new THREE.CylinderGeometry(
    gardenFeatureRadius,
    gardenFeatureRadius,
    gardenFeatureHeight,
    16
  );
  gardenFeature.translate(0, -height / 2 + gardenFeatureHeight / 2 + floorThickness, 0);
  geometries.push(gardenFeature);

  return {
    geometry: mergeBufferGeometries(geometries),
    columnPositions,
  };
}

/**
 * Creates a Roman-style peaked roof
 *
 * @param width Width of the building
 * @param depth Depth of the building
 * @param peakHeight Height of the roof peak from the base
 * @param overhang How much the roof extends beyond the walls
 * @returns A geometry representing a Roman roof
 */
export function createRomanRoof(
  width: number,
  depth: number,
  peakHeight: number = 1.5,
  overhang: number = 0.3
): THREE.BufferGeometry {
  const adjustedWidth = width + overhang * 2;
  const adjustedDepth = depth + overhang * 2;

  // Create roof using a simple triangular prism
  const halfWidth = adjustedWidth / 2;
  const halfDepth = adjustedDepth / 2;

  // Define the vertices for a peaked roof
  const vertices = new Float32Array([
    // Left side
    -halfWidth,
    0,
    -halfDepth,
    -halfWidth,
    0,
    halfDepth,
    0,
    peakHeight,
    -halfDepth,
    0,
    peakHeight,
    halfDepth,

    // Right side
    halfWidth,
    0,
    -halfDepth,
    halfWidth,
    0,
    halfDepth,
    0,
    peakHeight,
    -halfDepth,
    0,
    peakHeight,
    halfDepth,
  ]);

  // Define the triangular faces (indices for vertices)
  const indices = [
    // Left side
    0, 1, 2, 2, 1, 3,

    // Right side
    4, 6, 5, 6, 7, 5,

    // Front
    0, 2, 4, 2, 6, 4,

    // Back
    1, 5, 3, 3, 5, 7,

    // Top
    2, 3, 6, 6, 3, 7,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Merges multiple buffer geometries into one.
 * Custom implementation that properly combines all geometries.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  // Create a new merged geometry
  const mergedGeometry = new THREE.BufferGeometry();

  // Track vertex counts to offset indices properly
  let vertexCount = 0;
  let indexCount = 0;

  // Determine which attributes to include in the merged geometry
  const attributes: Record<string, THREE.BufferAttribute[]> = {};

  // First pass: count attributes and allocate space
  geometries.forEach((geometry) => {
    for (const name in geometry.attributes) {
      if (!attributes[name]) {
        attributes[name] = [];
      }

      attributes[name].push(geometry.attributes[name] as THREE.BufferAttribute);
    }

    // Track indices if they exist
    if (geometry.index) {
      indexCount += geometry.index.count;
    } else {
      indexCount += geometry.attributes.position.count;
    }

    vertexCount += geometry.attributes.position.count;
  });

  // Create a single buffer for each attribute
  for (const name in attributes) {
    const mergedAttribute = mergeBufferAttributes(attributes[name], vertexCount);
    mergedGeometry.setAttribute(name, mergedAttribute);
  }

  // Merge indices
  let indexOffset = 0;
  const mergedIndices = new Uint32Array(indexCount);

  geometries.forEach((geometry) => {
    const positionCount = geometry.attributes.position.count;

    if (geometry.index) {
      // Copy and offset the indices
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i++) {
        mergedIndices[i + indexOffset] = indices[i] + vertexCount;
      }
      indexOffset += indices.length;
    } else {
      // Generate default indices
      for (let i = 0; i < positionCount; i++) {
        mergedIndices[i + indexOffset] = i + vertexCount;
      }
      indexOffset += positionCount;
    }

    vertexCount += positionCount;
  });

  mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

  return mergedGeometry;
}

/**
 * Helper function to merge array of buffer attributes
 */
function mergeBufferAttributes(
  attributes: THREE.BufferAttribute[],
  arrayLength: number
): THREE.BufferAttribute {
  const array = new Float32Array(arrayLength * attributes[0].itemSize);
  let offset = 0;

  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    array.set(attribute.array, offset);
    offset += attribute.array.length;
  }

  return new THREE.BufferAttribute(array, attributes[0].itemSize);
}
