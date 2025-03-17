import { BuildingType } from '../state/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Building configuration constants
 */

// Roman era building types
export const ROMAN_BUILDING_TYPES: BuildingType[] = [
  'domus',
  'insula',
  'temple',
  'forum',
  'bath',
  'amphitheater',
];

// Cyberpunk era building types
export const CYBERPUNK_BUILDING_TYPES: BuildingType[] = [
  'megacorp-tower',
  'residential-stack',
  'nano-fabricator',
  'data-center',
  'entertainment-hub',
];

// Building type metadata
export interface BuildingTypeMetadata {
  name: string;
  category: 'residential' | 'commercial' | 'industrial' | 'civic' | 'entertainment';
  description: string;
  baseConstructionTime: number; // in game days
  buildCost: Record<string, number>;
  maintenance: Record<string, number>;
}

// Building type configuration
export const BUILDING_TYPE_CONFIG: Record<BuildingType, BuildingTypeMetadata> = {
  // Roman era buildings
  domus: {
    name: 'Domus',
    category: 'residential',
    description: 'A private residence for Roman elites with atrium and peristyle',
    baseConstructionTime: 30,
    buildCost: { wood: 20, stone: 50 },
    maintenance: { gold: 0.5 },
  },
  insula: {
    name: 'Insula',
    category: 'residential',
    description: 'Multi-story apartment building for the common folk',
    baseConstructionTime: 45,
    buildCost: { wood: 30, stone: 70 },
    maintenance: { gold: 0.8 },
  },
  temple: {
    name: 'Temple',
    category: 'civic',
    description: 'Religious structure dedicated to the gods',
    baseConstructionTime: 60,
    buildCost: { wood: 30, stone: 100, marble: 20 },
    maintenance: { gold: 1.2 },
  },
  forum: {
    name: 'Forum',
    category: 'civic',
    description: 'Public square for civic and commercial activities',
    baseConstructionTime: 90,
    buildCost: { wood: 50, stone: 150, marble: 30 },
    maintenance: { gold: 2.0 },
  },
  bath: {
    name: 'Bath',
    category: 'entertainment',
    description: 'Public bathing facility with heated pools',
    baseConstructionTime: 75,
    buildCost: { wood: 40, stone: 120, marble: 15 },
    maintenance: { gold: 1.5, wood: 0.5 },
  },
  amphitheater: {
    name: 'Amphitheater',
    category: 'entertainment',
    description: 'Large oval arena for gladiatorial contests and events',
    baseConstructionTime: 120,
    buildCost: { wood: 70, stone: 200, marble: 50 },
    maintenance: { gold: 3.0 },
  },

  // Cyberpunk era buildings
  'megacorp-tower': {
    name: 'Megacorp Tower',
    category: 'commercial',
    description: 'Headquarters for a powerful corporation',
    baseConstructionTime: 90,
    buildCost: { steel: 100, glass: 80, electronics: 50 },
    maintenance: { energy: 3.0, data: 2.0 },
  },
  'residential-stack': {
    name: 'Residential Stack',
    category: 'residential',
    description: 'Dense vertical housing for the masses',
    baseConstructionTime: 60,
    buildCost: { steel: 70, concrete: 90, electronics: 20 },
    maintenance: { energy: 2.0, water: 1.0 },
  },
  'nano-fabricator': {
    name: 'Nano-Fabricator',
    category: 'industrial',
    description: 'Advanced manufacturing facility using nanotechnology',
    baseConstructionTime: 75,
    buildCost: { steel: 80, electronics: 100, rareElements: 30 },
    maintenance: { energy: 4.0, coolant: 1.5 },
  },
  'data-center': {
    name: 'Data Center',
    category: 'industrial',
    description: 'Massive server farm processing and storing data',
    baseConstructionTime: 65,
    buildCost: { steel: 60, electronics: 120, coolingSystems: 40 },
    maintenance: { energy: 5.0, coolant: 2.0 },
  },
  'entertainment-hub': {
    name: 'Entertainment Hub',
    category: 'entertainment',
    description: 'Immersive entertainment complex with VR and simulations',
    baseConstructionTime: 50,
    buildCost: { steel: 50, glass: 60, electronics: 80 },
    maintenance: { energy: 3.5, data: 1.5 },
  },
};

// ID generation utility
export const generateBuildingId = (): string => {
  // Using crypto.randomUUID() for browser environments that support it,
  // as a consistent alternative to the uuid library
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback to uuid library
  return uuidv4();
};
