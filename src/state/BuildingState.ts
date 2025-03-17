import { makeAutoObservable, computed } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { RootStore } from './RootStore';
import { Era } from './types';
import { Building, BuildingType, IBuildingState, BaseState } from './types';

// Re-export types for backward compatibility
export type { Building, BuildingType };

export class BuildingState implements IBuildingState, BaseState {
  rootStore: RootStore;
  buildings: Record<string, Building> = {};
  selectedBuildingId: string | null = null;
  constructionQueue: string[] = []; // Building IDs in construction queue
  constructionProgressRate: number = 0.05; // Default progress per day

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, {
      rootStore: false,
      buildingCount: computed,
      buildingsByType: computed,
      buildingsUnderConstruction: computed,
      selectedBuilding: computed,
    });
  }

  // Computed properties
  get buildingCount() {
    return Object.keys(this.buildings).length;
  }

  get buildingsByType() {
    const result: Record<BuildingType, Building[]> = {} as Record<BuildingType, Building[]>;

    Object.values(this.buildings).forEach((building) => {
      if (!result[building.type]) {
        result[building.type] = [];
      }
      result[building.type].push(building);
    });

    return result;
  }

  get buildingsUnderConstruction() {
    return Object.values(this.buildings).filter((b) => b.constructionProgress < 1);
  }

  get selectedBuilding() {
    return this.selectedBuildingId ? this.buildings[this.selectedBuildingId] : null;
  }

  // Actions
  addBuilding(
    type: BuildingType,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scale: { x: number; y: number; z: number } = { x: 1, y: 1, z: 1 }
  ) {
    const id = uuidv4();

    const building: Building = {
      id,
      type,
      position,
      rotation,
      scale,
      health: 100,
      constructionProgress: 0, // Starts at 0, needs to be built
      eraAdaptationProgress: 1, // Starts fully adapted to current era
    };

    this.buildings[id] = building;
    this.constructionQueue.push(id);

    return id;
  }

  removeBuilding(id: string) {
    // Remove from construction queue if present
    const queueIndex = this.constructionQueue.indexOf(id);
    if (queueIndex !== -1) {
      this.constructionQueue.splice(queueIndex, 1);
    }

    // If this was the selected building, deselect it
    if (this.selectedBuildingId === id) {
      this.selectedBuildingId = null;
    }

    // Delete the building
    delete this.buildings[id];
    return true;
  }

  selectBuilding(id: string | null) {
    this.selectedBuildingId = id;
  }

  updateBuilding(id: string, updates: Partial<Omit<Building, 'id'>>) {
    const building = this.buildings[id];
    if (!building) return false;

    Object.assign(building, updates);
    return true;
  }

  // Progress construction of all buildings in the queue
  progressConstruction(progressAmount = this.constructionProgressRate) {
    // Iterate backward through the queue to avoid index shifting issues during splicing
    for (let i = this.constructionQueue.length - 1; i >= 0; i--) {
      const id = this.constructionQueue[i];
      const building = this.buildings[id];
      if (building) {
        building.constructionProgress = Math.min(1, building.constructionProgress + progressAmount);

        // If construction is complete, remove from queue
        if (building.constructionProgress >= 1) {
          this.constructionQueue.splice(i, 1);
        }
      }
    }
  }

  // Apply era transition effects to buildings
  applyEraTransition(progress: number) {
    const { gameState } = this.rootStore;
    if (!gameState) return;

    const targetEra = gameState.currentEra;

    Object.values(this.buildings).forEach((building) => {
      // Update era adaptation progress based on the current era
      if (targetEra === 'roman') {
        building.eraAdaptationProgress = 1 - progress; // 1 (fully roman) to 0 (fully cyberpunk)
      } else {
        building.eraAdaptationProgress = progress; // 0 (fully roman) to 1 (fully cyberpunk)
      }
    });
  }

  // Get buildings by era (for compatibility with existing code)
  getBuildingsByEra(era: Era) {
    return Object.values(this.buildings).filter((building) => {
      // Roman building types
      const romanTypes: BuildingType[] = [
        'domus',
        'insula',
        'temple',
        'forum',
        'bath',
        'amphitheater',
      ];

      return era === 'roman'
        ? romanTypes.includes(building.type)
        : !romanTypes.includes(building.type);
    });
  }

  // Get buildings by type (for compatibility with existing code)
  getBuildingsByType(type: BuildingType) {
    return Object.values(this.buildings).filter((b) => b.type === type);
  }

  // Cleanup when the store is no longer needed
  dispose(): void {
    // Add cleanup logic if needed
  }
}
