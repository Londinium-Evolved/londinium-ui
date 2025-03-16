import { RootStore } from './RootStore';

// Core domain types
export type Era = 'roman' | 'cyberpunk';

// Resource types
export interface Resources {
  // Roman era
  food: number;
  wood: number;
  stone: number;
  metal: number;

  // Transitional
  coal: number;
  electronics: number;

  // Cyberpunk era
  energy: number;
  cyberneticComponents: number;
  data: number;
}

// Building types
export type BuildingType =
  // Roman era
  | 'domus'
  | 'insula'
  | 'temple'
  | 'forum'
  | 'bath'
  | 'amphitheater'
  // Cyberpunk era
  | 'megacorp-tower'
  | 'residential-stack'
  | 'nano-fabricator'
  | 'data-center'
  | 'entertainment-hub';

export interface Building {
  id: string;
  type: BuildingType;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  health: number;
  constructionProgress: number; // 0 to 1
  eraAdaptationProgress: number; // 0 to 1, how much the building has adapted to the current era
}

// Population and citizens
export interface Citizen {
  id: string;
  occupation: string;
  homeBuilding: string; // Building ID
  workBuilding: string; // Building ID
  needs: {
    food: number;
    shelter: number;
    entertainment: number;
    [key: string]: number;
  };
}

// Store State interfaces
export interface IGameState {
  currentEra: Era;
  eraProgress: number;
  gameSpeed: number;
  paused: boolean;
  rootStore: RootStore;
}

export interface IBuildingState {
  buildings: Record<string, Building>;
  selectedBuildingId: string | null;
  constructionQueue: string[]; // Building IDs
  rootStore: RootStore;
}

export interface IResourceState {
  resources: Resources;
  productionRates: Partial<Resources>;
  consumptionRates: Partial<Resources>;
  rootStore: RootStore;
}

export interface ICitizenState {
  citizens: Record<string, Citizen>;
  unemployedCount: number;
  homelessCount: number;
  happiness: number;
  rootStore: RootStore;
}

export interface ITimeState {
  currentDay: number;
  currentYear: number;
  dayLength: number; // in milliseconds
  lastUpdateTime: number;
  rootStore: RootStore;
}
