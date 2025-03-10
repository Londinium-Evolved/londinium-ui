import { createContext, useContext } from 'react';
import { GameState } from './gameState';
import { BuildingState } from './BuildingState';
import { ResourceState } from './ResourceState';

export class RootStore {
  gameState: GameState;
  buildingState: BuildingState;
  resourceState: ResourceState;

  constructor() {
    this.gameState = new GameState(this);
    this.buildingState = new BuildingState(this);
    this.resourceState = new ResourceState(this);
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
