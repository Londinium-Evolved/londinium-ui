import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';

export type Era = 'roman' | 'cyberpunk';

export class GameState {
  rootStore: RootStore;
  currentEra: Era = 'roman';
  eraProgress: number = 0; // 0 = roman, 1 = cyberpunk
  resources = {
    food: 100,
    wood: 100,
    stone: 100,
    metal: 50,
    coal: 0,
    electronics: 0,
    energy: 0,
    cyberneticComponents: 0,
    data: 0,
  };

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, { rootStore: false });
  }

  setEra(era: Era) {
    this.currentEra = era;
  }

  setEraProgress(progress: number) {
    this.eraProgress = Math.max(0, Math.min(1, progress));
  }

  addResource(resource: keyof GameState['resources'], amount: number) {
    this.resources[resource] += amount;
  }
}
