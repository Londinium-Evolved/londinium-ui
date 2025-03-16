import { makeAutoObservable, computed } from 'mobx';
import { RootStore } from './RootStore';
import { Era, IGameState } from './types';

// Re-export Era type for backward compatibility
export type { Era };

export class GameState implements IGameState {
  rootStore: RootStore;

  // Era tracking
  currentEra: Era = 'roman';
  eraProgress: number = 0; // 0 = roman, 1 = cyberpunk

  // Game controls
  gameSpeed: number = 1;
  paused: boolean = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, {
      rootStore: false,
      currentEraEnum: computed,
      isRomanEra: computed,
      isCyberpunkEra: computed,
      isTransitioning: computed,
    });
  }

  // Computed properties
  get currentEraEnum(): 0 | 1 | 0.5 {
    if (this.eraProgress === 0) return 0; // Roman
    if (this.eraProgress === 1) return 1; // Cyberpunk
    return 0.5; // Transitioning
  }

  get isRomanEra() {
    return this.currentEra === 'roman';
  }

  get isCyberpunkEra() {
    return this.currentEra === 'cyberpunk';
  }

  get isTransitioning() {
    return this.eraProgress > 0 && this.eraProgress < 1;
  }

  // Actions
  setEra(era: Era) {
    // Don't do anything if era is already set
    if (this.currentEra === era) return;

    this.currentEra = era;

    // Set progress based on era
    if (era === 'roman') {
      this.setEraProgress(0);
    } else {
      this.setEraProgress(1);
    }

    // Propagate era change to other stores
    this.applyEraChangeToAllStores();
  }

  setEraProgress(progress: number) {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Only update if different
    if (this.eraProgress === clampedProgress) return;

    this.eraProgress = clampedProgress;

    // Set era based on progress
    if (this.eraProgress === 0) {
      this.currentEra = 'roman';
    } else if (this.eraProgress === 1) {
      this.currentEra = 'cyberpunk';
    }

    // Propagate era progress to other stores
    this.applyEraProgressToAllStores();
  }

  setGameSpeed(speed: number) {
    // Clamp speed between 0.5 and 3
    this.gameSpeed = Math.max(0.5, Math.min(3, speed));

    // Update time state if available
    if (this.rootStore.timeState) {
      this.rootStore.timeState.setSpeedMultiplier(this.gameSpeed);
    }
  }

  setPaused(paused: boolean) {
    this.paused = paused;

    // Update time state if available
    if (this.rootStore.timeState) {
      this.rootStore.timeState.setPaused(paused);
    }
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  // Apply era changes to all related stores
  private applyEraChangeToAllStores() {
    const { buildingState, resourceState, citizenState } = this.rootStore;

    // Update building states for the new era
    if (buildingState) {
      buildingState.applyEraTransition(this.eraProgress);
    }

    // Update citizen needs for the new era
    if (citizenState) {
      citizenState.applyEraTransition(this.eraProgress);
    }

    // Adjust resource production/consumption for the new era
    if (resourceState) {
      resourceState.applyEraTransition(this.eraProgress);
    }
  }

  // Apply gradual era progress to all stores
  private applyEraProgressToAllStores() {
    const { buildingState, resourceState, citizenState } = this.rootStore;

    // Update buildings
    if (buildingState) {
      buildingState.applyEraTransition(this.eraProgress);
    }

    // Update citizens
    if (citizenState) {
      citizenState.applyEraTransition(this.eraProgress);
    }

    // Update resources
    if (resourceState) {
      resourceState.applyEraTransition(this.eraProgress);
    }
  }
}
