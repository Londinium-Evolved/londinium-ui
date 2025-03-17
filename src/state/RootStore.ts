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

    // Dispose previous instances if they have a dispose method
    if (this.gameState && typeof this.gameState.dispose === 'function') {
      this.gameState.dispose();
    }
    if (this.buildingState && typeof this.buildingState.dispose === 'function') {
      this.buildingState.dispose();
    }
    if (this.resourceState && typeof this.resourceState.dispose === 'function') {
      this.resourceState.dispose();
    }
    if (this.citizenState && typeof this.citizenState.dispose === 'function') {
      this.citizenState.dispose();
    }
    if (this.timeState && typeof this.timeState.dispose === 'function') {
      this.timeState.dispose();
    }

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
