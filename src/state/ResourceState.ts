import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';
import { Era } from './GameState';

// Define resource types for different eras
export type RomanResource = 'food' | 'wood' | 'stone' | 'metal';
export type TransitionalResource = RomanResource | 'coal' | 'electronics';
export type CyberpunkResource = TransitionalResource | 'energy' | 'cyberneticComponents' | 'data';

// All resource types
export type Resource = CyberpunkResource;

export class ResourceState {
  rootStore: RootStore;

  resources = {
    // Roman resources
    food: 100,
    wood: 100,
    stone: 100,
    metal: 50,

    // Transitional resources
    coal: 0,
    electronics: 0,

    // Cyberpunk resources
    energy: 0,
    cyberneticComponents: 0,
    data: 0,
  };

  // Production rates per tick
  productionRates = {
    food: 2,
    wood: 1,
    stone: 0.5,
    metal: 0.2,
    coal: 0,
    electronics: 0,
    energy: 0,
    cyberneticComponents: 0,
    data: 0,
  };

  // Consumption rates per tick
  consumptionRates = {
    food: 1,
    wood: 0.5,
    stone: 0,
    metal: 0,
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

  // Add resources
  addResource(resource: Resource, amount: number) {
    this.resources[resource] += amount;
  }

  // Set production rate
  setProductionRate(resource: Resource, rate: number) {
    this.productionRates[resource] = rate;
  }

  // Set consumption rate
  setConsumptionRate(resource: Resource, rate: number) {
    this.consumptionRates[resource] = rate;
  }

  // Get resources for a specific era
  getEraResources(era: Era) {
    if (era === 'roman') {
      return this.resources;

    } else {
      return this.resources;
    }
  }

  // Update resources based on production and consumption rates
  updateResources() {
    for (const resource of Object.keys(this.resources) as Resource[]) {
      const netProduction = this.productionRates[resource] - this.consumptionRates[resource];
      this.resources[resource] += netProduction;

      // Ensure resources don't go below zero
      this.resources[resource] = Math.max(this.resources[resource], 0)

    }
  }
}
