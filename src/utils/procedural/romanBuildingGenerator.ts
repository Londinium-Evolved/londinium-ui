import * as THREE from 'three';
import { BuildingType } from '../../state/types';
import {
  createHollowBox,
  createRomanAtrium,
  createRomanPeristyle,
  createRomanRoof,
} from './buildingCSG';
import { BuildingConfig, BuildingMeshData } from './buildingGenerator';

// Random generator class for deterministic building generation
class RomanRandomGenerator {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Generate a random float between min and max
  generateFloatBetween(min: number, max: number): number {
    const x = Math.sin(this.seed++) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  }

  // Generate a random integer between min (inclusive) and max (inclusive)
  generateIntegerBetween(min: number, max: number): number {
    return Math.floor(this.generateFloatBetween(min, max + 1));
  }

  // Generate a boolean with a specific probability
  generateBooleanWithProbability(probability: number): boolean {
    return this.generateFloatBetween(0, 1) < probability;
  }

  // Select a random item from an array
  selectRandomItem<T>(items: T[]): T {
    const index = this.generateIntegerBetween(0, items.length - 1);
    return items[index];
  }
}

// Material factory for Roman building materials
export function createRomanMaterials(config: BuildingConfig): THREE.Material[] {
  const materials: THREE.Material[] = [];

  // Base wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: config.material.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  materials.push(wallMaterial);

  // Stone/marble material for columns and decorative elements
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0e8,
    roughness: 0.5,
    metalness: 0.2,
  });
  materials.push(stoneMaterial);

  // Roof tile material
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xc45c48, // Terracotta color
    roughness: 0.7,
    metalness: 0.0,
  });
  materials.push(roofMaterial);

  // Floor material
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c7a8,
    roughness: 0.6,
    metalness: 0.1,
  });
  materials.push(floorMaterial);

  return materials;
}

/**
 * Creates a historically accurate Roman domus (house)
 *
 * A typical Roman domus had:
 * - Atrium: Central courtyard with compluvium (roof opening) and impluvium (water basin)
 * - Peristyle: Columned garden courtyard
 * - Tablinum: Reception room between atrium and peristyle
 * - Cubiculum: Bedrooms flanking the atrium
 * - Triclinium: Dining room
 * - Culina: Kitchen
 */
export function generateRomanDomus(
  random: RomanRandomGenerator,
  config: BuildingConfig
): BuildingMeshData {
  // Extract dimensions from config
  const width = random.generateFloatBetween(config.widthRange[0], config.widthRange[1]);
  const depth = random.generateFloatBetween(config.depthRange[0], config.depthRange[1]);
  const height = random.generateFloatBetween(config.heightRange[0], config.heightRange[1]);

  // Get variation settings
  const wallThickness = config.variations?.wallThickness || 0.2;
  const floorThickness = config.variations?.floorThickness || 0.2;

  const geometries: THREE.BufferGeometry[] = [];

  // Create the main structure (hollow box)
  const mainStructure = createHollowBox(
    width,
    height,
    depth,
    wallThickness,
    floorThickness,
    true // has roof
  );
  geometries.push(mainStructure);

  // Add atrium (central courtyard)
  const atriumWidth = width * 0.4;
  const atriumDepth = depth * 0.3;
  const atriumHeight = height * 0.9;

  const columnRadius = 0.12;
  const columnHeight = height * 0.8;
  const compluviumRatio = random.generateFloatBetween(0.15, 0.25); // Based on historical references

  const atriumResult = createRomanAtrium(
    atriumWidth,
    atriumHeight,
    atriumDepth,
    columnRadius,
    columnHeight,
    compluviumRatio
  );

  // Position the atrium in the center-front of the domus
  const atriumGeometry = atriumResult.geometry.clone();
  atriumGeometry.translate(0, 0, depth * 0.15); // Slightly towards the front
  geometries.push(atriumGeometry);

  // Add peristyle (garden courtyard) if the domus is large enough
  if (width > 6 && depth > 7) {
    const peristyleWidth = width * 0.45;
    const peristyleDepth = depth * 0.35;
    const peristyleHeight = height * 0.85;

    const peristyleResult = createRomanPeristyle(
      peristyleWidth,
      peristyleHeight,
      peristyleDepth,
      columnRadius,
      columnHeight
    );

    // Position the peristyle in the center-back of the domus
    const peristyleGeometry = peristyleResult.geometry.clone();
    peristyleGeometry.translate(0, 0, -depth * 0.25); // Towards the back
    geometries.push(peristyleGeometry);
  }

  // Add a Roman roof
  const roofPeakHeight = height * 0.3;
  const roofOverhang = 0.3;

  const roofGeometry = createRomanRoof(
    width + roofOverhang * 2,
    depth + roofOverhang * 2,
    roofPeakHeight,
    roofOverhang
  );
  roofGeometry.translate(0, height / 2, 0);
  geometries.push(roofGeometry);

  // Merge all geometries
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Create materials
  const materials = createRomanMaterials(config);

  return {
    geometry: mergedGeometry,
    materials: materials,
    type: 'domus',
  };
}

/**
 * Creates a historically accurate Roman insula (apartment building)
 *
 * Insulae were multi-story apartment buildings for the common people:
 * - Usually 3-5 stories high
 * - Ground floor typically had shops (tabernae)
 * - Upper floors had apartments of various sizes
 * - Simple, functional architecture with windows
 */
export function generateRomanInsula(
  random: RomanRandomGenerator,
  config: BuildingConfig
): BuildingMeshData {
  // Extract dimensions from config
  const width = random.generateFloatBetween(config.widthRange[0], config.widthRange[1]);
  const depth = random.generateFloatBetween(config.depthRange[0], config.depthRange[1]);
  const baseHeight = random.generateFloatBetween(config.heightRange[0], config.heightRange[1]);

  // Get variation settings
  const wallThickness = config.variations?.wallThickness || 0.15;
  const floorThickness = config.variations?.floorThickness || 0.2;

  const geometries: THREE.BufferGeometry[] = [];

  // Determine number of floors (3-6 historically accurate)
  const numFloors = random.generateIntegerBetween(3, 6);
  const floorHeight = baseHeight / numFloors;
  const totalHeight = floorHeight * numFloors;

  // Create the main structure
  const mainStructure = createHollowBox(
    width,
    totalHeight,
    depth,
    wallThickness,
    floorThickness,
    true // has roof
  );
  geometries.push(mainStructure);

  // Add floors/dividers between levels
  for (let i = 1; i < numFloors; i++) {
    const floor = new THREE.BoxGeometry(
      width - wallThickness * 2,
      floorThickness,
      depth - wallThickness * 2
    );

    const yPosition = -totalHeight / 2 + i * floorHeight;
    floor.translate(0, yPosition, 0);
    geometries.push(floor);
  }

  // Add windows - historical insulae had small windows
  const windowWidth = 0.5;
  const windowHeight = 0.7;
  const windowDepth = wallThickness * 1.1; // Slightly deeper than wall

  // Add windows to front facade - ground floor has fewer windows (usually shops)
  const frontFacadeWindowsPerFloor = [
    random.generateIntegerBetween(2, 3), // Ground floor (shops)
    ...Array(numFloors - 1)
      .fill(0)
      .map(() => random.generateIntegerBetween(3, 5)), // Upper floors
  ];

  // Add windows to all facades
  const facades = ['front', 'back', 'left', 'right'];

  facades.forEach((facade) => {
    // Determine window parameters based on facade
    let facadeWidth: number, xOffset: number, zOffset: number, rotation: number;

    switch (facade) {
      case 'front':
        facadeWidth = width - wallThickness * 2;
        xOffset = 0;
        zOffset = depth / 2;
        rotation = 0;
        break;
      case 'back':
        facadeWidth = width - wallThickness * 2;
        xOffset = 0;
        zOffset = -depth / 2;
        rotation = Math.PI;
        break;
      case 'left':
        facadeWidth = depth - wallThickness * 2;
        xOffset = -width / 2;
        zOffset = 0;
        rotation = -Math.PI / 2;
        break;
      case 'right':
        facadeWidth = depth - wallThickness * 2;
        xOffset = width / 2;
        zOffset = 0;
        rotation = Math.PI / 2;
        break;
      default:
        facadeWidth = width;
        xOffset = 0;
        zOffset = 0;
        rotation = 0;
    }

    // Add windows to this facade
    for (let floor = 0; floor < numFloors; floor++) {
      // Number of windows depends on facade and floor
      const numWindows =
        facade === 'front' || facade === 'back'
          ? frontFacadeWindowsPerFloor[floor]
          : random.generateIntegerBetween(2, 3);

      for (let w = 0; w < numWindows; w++) {
        const windowBox = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);

        // Position window along facade
        const windowSpacing = facadeWidth / (numWindows + 1);
        const windowX = (w + 1) * windowSpacing - facadeWidth / 2;

        // Position window at the right height for this floor
        const windowY = -totalHeight / 2 + floor * floorHeight + floorHeight / 2;

        // Apply position and rotation
        windowBox.rotateY(rotation);

        if (facade === 'front' || facade === 'back') {
          windowBox.translate(windowX + xOffset, windowY, zOffset);
        } else {
          windowBox.translate(xOffset, windowY, windowX + zOffset);
        }

        geometries.push(windowBox);
      }
    }
  });

  // Add a flat roof (insulae typically had flat roofs)
  const roofGeometry = new THREE.BoxGeometry(
    width + wallThickness,
    wallThickness * 2,
    depth + wallThickness
  );
  roofGeometry.translate(0, totalHeight / 2 + wallThickness, 0);
  geometries.push(roofGeometry);

  // Merge all geometries
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Create materials
  const materials = createRomanMaterials(config);

  return {
    geometry: mergedGeometry,
    materials: materials,
    type: 'insula',
  };
}

/**
 * Creates a historically accurate Roman temple
 *
 * Roman temples typically had:
 * - Podium (raised platform)
 * - Cella (inner chamber)
 * - Pronaos (columned porch)
 * - Columns around the exterior
 * - Triangular pediment
 */
export function generateRomanTemple(
  random: RomanRandomGenerator,
  config: BuildingConfig
): BuildingMeshData {
  // Extract dimensions from config
  const width = random.generateFloatBetween(config.widthRange[0], config.widthRange[1]);
  const depth = random.generateFloatBetween(config.depthRange[0], config.depthRange[1]);
  const height = random.generateFloatBetween(config.heightRange[0], config.heightRange[1]);

  // Get variation settings
  const wallThickness = config.variations?.wallThickness || 0.3;

  const geometries: THREE.BufferGeometry[] = [];

  // Create the podium (raised platform)
  const podiumHeight = height * 0.15;
  const podium = new THREE.BoxGeometry(width, podiumHeight, depth);
  podium.translate(0, -height / 2 + podiumHeight / 2, 0);
  geometries.push(podium);

  // Create the cella (inner chamber)
  const cellaWidth = width * 0.7;
  const cellaDepth = depth * 0.7;
  const cellaHeight = height * 0.7;

  const cella = createHollowBox(
    cellaWidth,
    cellaHeight,
    cellaDepth,
    wallThickness,
    0, // No bottom as it sits on the podium
    true // Has roof
  );
  cella.translate(0, -height / 2 + podiumHeight + cellaHeight / 2, 0);
  geometries.push(cella);

  // Create columns around the cella
  const columnRadius = 0.2;
  const columnHeight = height * 0.8;

  // Determine temple style: peripteral (columns all around) or prostyle (columns at front)
  const isPeripteralTemple = random.generateBooleanWithProbability(0.7); // 70% chance for peripteral temple

  // Front columns
  const frontColumnCount = random.generateIntegerBetween(4, 8); // Common Roman temple designs
  const frontColumnSpacing = width / (frontColumnCount + 1);

  for (let i = 1; i <= frontColumnCount; i++) {
    const columnX = i * frontColumnSpacing - width / 2;
    const columnZ = depth / 2 - columnRadius;

    const column = new THREE.CylinderGeometry(
      columnRadius,
      columnRadius * 1.1, // Slightly wider at bottom
      columnHeight,
      12 // Number of segments
    );

    column.translate(columnX, -height / 2 + podiumHeight + columnHeight / 2, columnZ);
    geometries.push(column);
  }

  // Side columns (if peripteral)
  if (isPeripteralTemple) {
    const sideColumnCount = random.generateIntegerBetween(4, 10);
    const sideColumnSpacing = depth / (sideColumnCount + 1);

    // Left side columns
    for (let i = 1; i <= sideColumnCount; i++) {
      const columnZ = depth / 2 - i * sideColumnSpacing;
      const columnX = -width / 2 + columnRadius;

      const column = new THREE.CylinderGeometry(columnRadius, columnRadius * 1.1, columnHeight, 12);

      column.translate(columnX, -height / 2 + podiumHeight + columnHeight / 2, columnZ);
      geometries.push(column);
    }

    // Right side columns
    for (let i = 1; i <= sideColumnCount; i++) {
      const columnZ = depth / 2 - i * sideColumnSpacing;
      const columnX = width / 2 - columnRadius;

      const column = new THREE.CylinderGeometry(columnRadius, columnRadius * 1.1, columnHeight, 12);

      column.translate(columnX, -height / 2 + podiumHeight + columnHeight / 2, columnZ);
      geometries.push(column);
    }

    // Back columns
    for (let i = 1; i <= frontColumnCount; i++) {
      const columnX = i * frontColumnSpacing - width / 2;
      const columnZ = -depth / 2 + columnRadius;

      const column = new THREE.CylinderGeometry(columnRadius, columnRadius * 1.1, columnHeight, 12);

      column.translate(columnX, -height / 2 + podiumHeight + columnHeight / 2, columnZ);
      geometries.push(column);
    }
  }

  // Create steps at the front
  const stepsWidth = width * 0.6;
  const stepsDepth = depth * 0.15;
  const stepsCount = 5;
  const stepHeight = podiumHeight / stepsCount;

  for (let i = 0; i < stepsCount; i++) {
    const stepWidth = stepsWidth;
    const stepDepth = (stepsDepth / stepsCount) * (stepsCount - i);

    const step = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
    step.translate(0, -height / 2 + (i + 0.5) * stepHeight, depth / 2 + stepDepth / 2);
    geometries.push(step);
  }

  // Add a triangular pediment at the front
  const pedimentHeight = height * 0.2;
  const pedimentGeometry = createTriangularPediment(width, pedimentHeight, wallThickness);
  pedimentGeometry.translate(0, height * 0.3, depth / 2 - wallThickness);
  geometries.push(pedimentGeometry);

  // Merge all geometries
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Create materials
  const materials = createRomanMaterials(config);

  return {
    geometry: mergedGeometry,
    materials: materials,
    type: 'temple',
  };
}

/**
 * Helper function to create a triangular pediment for temple fronts
 */
function createTriangularPediment(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  // Create a simple triangular prism
  const vertices = new Float32Array([
    // Front face (triangular)
    -width / 2,
    0,
    depth / 2,
    width / 2,
    0,
    depth / 2,
    0,
    height,
    depth / 2,

    // Back face (triangular)
    -width / 2,
    0,
    -depth / 2,
    width / 2,
    0,
    -depth / 2,
    0,
    height,
    -depth / 2,

    // Bottom face (rectangular)
    -width / 2,
    0,
    depth / 2,
    width / 2,
    0,
    depth / 2,
    -width / 2,
    0,
    -depth / 2,
    width / 2,
    0,
    -depth / 2,

    // Left face (triangular)
    -width / 2,
    0,
    depth / 2,
    -width / 2,
    0,
    -depth / 2,
    0,
    height,
    depth / 2,
    0,
    height,
    -depth / 2,

    // Right face (triangular)
    width / 2,
    0,
    depth / 2,
    width / 2,
    0,
    -depth / 2,
    0,
    height,
    depth / 2,
    0,
    height,
    -depth / 2,
  ]);

  const indices = new Uint16Array([
    // Front face
    0, 1, 2,

    // Back face
    5, 4, 3,

    // Bottom face
    6, 8, 9, 6, 9, 7,

    // Left face
    10, 11, 12, 11, 13, 12,

    // Right face
    14, 15, 16, 15, 17, 16,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates a historically accurate Roman bath complex
 */
export function generateRomanBath(
  random: RomanRandomGenerator,
  config: BuildingConfig
): BuildingMeshData {
  // Extract dimensions from config
  const width = random.generateFloatBetween(config.widthRange[0], config.widthRange[1]);
  const depth = random.generateFloatBetween(config.depthRange[0], config.depthRange[1]);
  const height = random.generateFloatBetween(config.heightRange[0], config.heightRange[1]);

  // Get variation settings
  const wallThickness = config.variations?.wallThickness || 0.3;

  const geometries: THREE.BufferGeometry[] = [];

  // Create the main structure
  const mainStructure = createHollowBox(
    width,
    height,
    depth,
    wallThickness,
    0.3, // Thicker floor for hypocaust system
    true // has roof
  );
  geometries.push(mainStructure);

  // Create main sections (caldarium, tepidarium, frigidarium)
  const sectionWidth = width / 3 - wallThickness;
  const sectionDepth = depth * 0.7;
  const sectionHeight = height * 0.9;

  // Caldarium (hot bath) - typically domed
  const caldariumRadius = sectionWidth / 2;
  const caldarium = new THREE.SphereGeometry(
    caldariumRadius,
    16,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  caldarium.translate(-width / 3, -height / 2 + caldariumRadius, 0);
  geometries.push(caldarium);

  // Tepidarium (warm area)
  const tepidarium = createHollowBox(
    sectionWidth,
    sectionHeight * 0.8,
    sectionDepth * 0.7,
    wallThickness,
    0, // No bottom as it connects to the main structure
    true // has roof
  );
  tepidarium.translate(0, -height / 2 + sectionHeight * 0.4, 0);
  geometries.push(tepidarium);

  // Frigidarium (cold bath) - often rectangular pool
  const frigidarium = new THREE.BoxGeometry(sectionWidth, height * 0.3, sectionDepth * 0.6);
  frigidarium.translate(width / 3, -height / 2 + height * 0.15, 0);
  geometries.push(frigidarium);

  // Add columns in the frigidarium area
  const columnRadius = 0.15;
  const columnHeight = height * 0.7;

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const distance = sectionWidth * 0.4;

    const columnX = width / 3 + Math.cos(angle) * distance;
    const columnZ = Math.sin(angle) * distance;

    const column = new THREE.CylinderGeometry(columnRadius, columnRadius * 1.1, columnHeight, 8);

    column.translate(columnX, -height / 2 + columnHeight / 2, columnZ);
    geometries.push(column);
  }

  // Add domed roof to the caldarium
  const domeSegments = 12;
  const dome = new THREE.SphereGeometry(
    caldariumRadius,
    domeSegments,
    domeSegments,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  dome.scale(1, 0.6, 1); // Flatten the dome slightly
  dome.translate(-width / 3, height * 0.3, 0);
  geometries.push(dome);

  // Add a flat roof to the rest of the structure
  const roofGeometry = new THREE.BoxGeometry(
    (width * 2) / 3 + wallThickness,
    wallThickness * 2,
    depth
  );
  roofGeometry.translate(width / 6, height / 2, 0);
  geometries.push(roofGeometry);

  // Merge all geometries
  const mergedGeometry = mergeBufferGeometries(geometries);

  // Create materials
  const materials = createRomanMaterials(config);

  return {
    geometry: mergedGeometry,
    materials: materials,
    type: 'bath',
  };
}

// Helper function to merge buffer geometries
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

  return mergedGeometry;
}

// Import BufferGeometryUtils helper
const BufferGeometryUtils = {
  mergeGeometries: (geometries: THREE.BufferGeometry[]): THREE.BufferGeometry => {
    // Simple implementation for merging geometries
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0].clone();

    let vertexCount = 0;
    let indexCount = 0;

    // Count total vertices and indices
    for (const geometry of geometries) {
      const positionAttribute = geometry.getAttribute('position');
      vertexCount += positionAttribute.count;

      if (geometry.index) {
        indexCount += geometry.index.count;
      } else {
        indexCount += positionAttribute.count;
      }
    }

    // Create new merged attributes
    const mergedPositions = new Float32Array(vertexCount * 3);
    const mergedNormals = new Float32Array(vertexCount * 3);
    const mergedUvs = new Float32Array(vertexCount * 2);
    const mergedIndices = new Uint32Array(indexCount);

    let positionOffset = 0;
    let indexOffset = 0;

    // Merge geometries
    for (const geometry of geometries) {
      const positionAttribute = geometry.getAttribute('position');
      const normalAttribute = geometry.getAttribute('normal');
      const uvAttribute = geometry.getAttribute('uv');
      const index = geometry.index;

      // Copy positions
      for (let i = 0; i < positionAttribute.count; i++) {
        mergedPositions[(positionOffset + i) * 3 + 0] = positionAttribute.getX(i);
        mergedPositions[(positionOffset + i) * 3 + 1] = positionAttribute.getY(i);
        mergedPositions[(positionOffset + i) * 3 + 2] = positionAttribute.getZ(i);
      }

      // Copy normals if they exist
      if (normalAttribute) {
        for (let i = 0; i < normalAttribute.count; i++) {
          mergedNormals[(positionOffset + i) * 3 + 0] = normalAttribute.getX(i);
          mergedNormals[(positionOffset + i) * 3 + 1] = normalAttribute.getY(i);
          mergedNormals[(positionOffset + i) * 3 + 2] = normalAttribute.getZ(i);
        }
      }

      // Copy UVs if they exist
      if (uvAttribute) {
        for (let i = 0; i < uvAttribute.count; i++) {
          mergedUvs[(positionOffset + i) * 2 + 0] = uvAttribute.getX(i);
          mergedUvs[(positionOffset + i) * 2 + 1] = uvAttribute.getY(i);
        }
      }

      // Copy indices
      if (index) {
        for (let i = 0; i < index.count; i++) {
          mergedIndices[indexOffset + i] = index.getX(i) + positionOffset;
        }
        indexOffset += index.count;
      } else {
        // If no indices, create them
        for (let i = 0; i < positionAttribute.count; i++) {
          mergedIndices[indexOffset + i] = positionOffset + i;
        }
        indexOffset += positionAttribute.count;
      }

      positionOffset += positionAttribute.count;
    }

    // Create the merged geometry
    const mergedGeometry = new THREE.BufferGeometry();
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
    mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(mergedUvs, 2));
    mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

    return mergedGeometry;
  },
};

// Main function to generate Roman buildings based on type
export function generateRomanBuilding(
  type: BuildingType,
  config: BuildingConfig,
  seed: number
): BuildingMeshData {
  const random = new RomanRandomGenerator(seed);

  switch (type) {
    case 'domus':
      return generateRomanDomus(random, config);
    case 'insula':
      return generateRomanInsula(random, config);
    case 'temple':
      return generateRomanTemple(random, config);
    case 'bath':
      return generateRomanBath(random, config);
    default:
      // Fallback to a generic building if type not implemented
      return {
        geometry: new THREE.BoxGeometry(5, 5, 5),
        materials: [new THREE.MeshBasicMaterial({ color: 0xcccccc })],
        type: type,
      };
  }
}
