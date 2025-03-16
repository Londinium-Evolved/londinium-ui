import { createContext, useContext } from 'react';
import { GameState } from './gameState';
import { BuildingState } from './BuildingState';
import { ResourceState } from './ResourceState';
import { CitizenState } from './CitizenState';
import { TimeState } from './TimeState';

export class RootStore {
  gameState: GameState;
  buildingState: BuildingState;
  resourceState: ResourceState;
  citizenState: CitizenState;
  timeState: TimeState;

  constructor() {
    // Create all domain stores with reference to the root store
    this.gameState = new GameState(this);
    this.buildingState = new BuildingState(this);
    this.resourceState = new ResourceState(this);
    this.citizenState = new CitizenState(this);
    this.timeState = new TimeState(this);
  }

  // Initialize the entire game state
  initialize() {
    console.log('Initializing game state...');
    // Any cross-store initialization can go here
  }

  // Reset the entire game state
  reset() {
    console.log('Resetting game state...');
    // Re-create all stores
    this.gameState = new GameState(this);
    this.buildingState = new BuildingState(this);
    this.resourceState = new ResourceState(this);
    this.citizenState = new CitizenState(this);
    this.timeState = new TimeState(this);
  }
}

// Create store context
export const StoreContext = createContext<RootStore | null>(null);

// Hook for accessing store
export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};
