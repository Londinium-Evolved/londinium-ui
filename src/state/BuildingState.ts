import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';
import { Era } from './GameState';

export type BuildingType =
  // Roman building types
  | 'domus'
  | 'insula'
  | 'forum'
  | 'temple'
  | 'bath'
  // Cyberpunk building types
  | 'megacorp-tower'
  | 'residential-stack'
  | 'market-hub'
  | 'data-center'
  | 'entertainment-complex';

export interface Building {
  id: string;
  type: BuildingType;
  position: [number, number, number]; // [x, y, z]
  rotation: number; // y-axis rotation in radians
  scale: [number, number, number]; // [x, y, z]
  eraSpecificProps: {
    roman: Record<string, any>;
    cyberpunk: Record<string, any>;
  };
}

export class BuildingState {
  rootStore: RootStore;
  buildings: Building[] = [];

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, { rootStore: false });
  }

  addBuilding(building: Omit<Building, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    this.buildings.push({ ...building, id });
    return id;
  }

  removeBuilding(id: string) {
    const index = this.buildings.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.buildings.splice(index, 1);
    }
  }

  getBuildingsByType(type: BuildingType) {
    return this.buildings.filter((b) => b.type === type);
  }

  getBuildingsByEra(era: Era) {
    const romanTypes: BuildingType[] = ['domus', 'insula', 'forum', 'temple', 'bath'];
    return this.buildings.filter((b) =>
      era === 'roman' ? romanTypes.includes(b.type) : !romanTypes.includes(b.type)
    );
  }
}
