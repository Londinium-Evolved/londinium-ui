import { makeAutoObservable, computed } from 'mobx';
import { RootStore } from './RootStore';
import { Era, IGameState, BaseState } from './types';

// Re-export Era type for backward compatibility
export type { Era };

export class GameState implements IGameState, BaseState {
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

  get isRomanEra(): boolean {
    return this.currentEra === 'roman';
  }

  get isCyberpunkEra(): boolean {
    return this.currentEra === 'cyberpunk';
  }

  get isTransitioning(): boolean {
    return this.eraProgress > 0 && this.eraProgress < 1;
  }

  // Actions
  setEra(era: Era) {
    // Don't do anything if era is already set
    if (this.currentEra === era) return;

    this.currentEra = era;

    // Set progress based on era
    if (era === 'roman') {
      this.eraProgress = 0;
    } else {
      this.eraProgress = 1;
    }

    // Propagate era change to other stores
    this.updateEraOnStores();
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
    this.updateEraOnStores();
  }

  setGameSpeed(speed: number) {
    // Clamp speed between 0.25 and 3
    this.gameSpeed = Math.max(0.25, Math.min(3, speed));

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

  // Consolidated method to update all stores
  private updateEraOnStores() {
    const { buildingState, resourceState, citizenState } = this.rootStore;

    // Update building states
    if (buildingState) {
      buildingState.applyEraTransition(this.eraProgress);
    }

    // Update citizen needs
    if (citizenState) {
      citizenState.applyEraTransition(this.eraProgress);
    }

    // Adjust resource production/consumption
    if (resourceState) {
      resourceState.applyEraTransition(this.eraProgress);
    }
  }

  // Cleanup when the store is no longer needed
  dispose(): void {
    // Clean up observers or subscriptions if needed in the future
    // Currently no specific cleanup required for GameState
  }
}
