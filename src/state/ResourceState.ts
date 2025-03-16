import { makeAutoObservable, computed } from 'mobx';
import { RootStore } from './RootStore';
import { Era, IResourceState, Resources } from './types';

// Define resource types for different eras
export type RomanResource = 'food' | 'wood' | 'stone' | 'metal';
export type TransitionalResource = RomanResource | 'coal' | 'electronics';
export type CyberpunkResource = TransitionalResource | 'energy' | 'cyberneticComponents' | 'data';

// All resource types
export type Resource = CyberpunkResource;

// Re-export Resources type for backward compatibility
export type { Resources };

export class ResourceState implements IResourceState {
  rootStore: RootStore;

  resources: Resources = {
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
  productionRates: Partial<Resources> = {
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
  consumptionRates: Partial<Resources> = {
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
    makeAutoObservable(this, {
      rootStore: false,
      netProduction: computed,
      romanResources: computed,
      cyberpunkResources: computed,
      resourcesByEra: computed,
    });
  }

  // Computed properties
  get netProduction(): Partial<Resources> {
    const result: Partial<Resources> = {};

    (Object.keys(this.resources) as Array<keyof Resources>).forEach((resource) => {
      const production = this.productionRates[resource] || 0;
      const consumption = this.consumptionRates[resource] || 0;
      result[resource] = production - consumption;
    });

    return result;
  }

  get romanResources() {
    return {
      food: this.resources.food,
      wood: this.resources.wood,
      stone: this.resources.stone,
      metal: this.resources.metal,
    };
  }

  get cyberpunkResources() {
    return {
      energy: this.resources.energy,
      cyberneticComponents: this.resources.cyberneticComponents,
      data: this.resources.data,
    };
  }

  get resourcesByEra() {
    return {
      roman: this.romanResources,
      transitional: {
        ...this.romanResources,
        coal: this.resources.coal,
        electronics: this.resources.electronics,
      },
      cyberpunk: {
        ...this.romanResources,
        ...this.cyberpunkResources,
        coal: this.resources.coal,
        electronics: this.resources.electronics,
      },
    };
  }

  // Add resources
  addResource(resource: keyof Resources, amount: number) {
    this.resources[resource] += amount;

    // Ensure resources don't go below zero
    this.resources[resource] = Math.max(this.resources[resource], 0);
  }

  // Set production rate
  setProductionRate(resource: keyof Resources, rate: number) {
    this.productionRates[resource] = rate;
  }

  // Set consumption rate
  setConsumptionRate(resource: keyof Resources, rate: number) {
    this.consumptionRates[resource] = rate;
  }

  // Update resources based on production and consumption rates
  updateResources() {
    (Object.keys(this.resources) as Array<keyof Resources>).forEach((resource) => {
      const netProduction =
        (this.productionRates[resource] || 0) - (this.consumptionRates[resource] || 0);
      this.addResource(resource, netProduction);
    });
  }

  // Apply era transition effects to resources
  applyEraTransition(progress: number) {
    const { gameState } = this.rootStore;
    if (!gameState) return;

    // Adjust production rates based on era progression
    // As we move toward cyberpunk era:
    // - Roman resource production decreases
    // - Cyberpunk resource production increases

    // Roman resources production scales down with progress
    this.productionRates.food = 2 * (1 - progress * 0.5); // Food still needed but less important
    this.productionRates.wood = 1 * (1 - progress * 0.7); // Wood becomes less used
    this.productionRates.stone = 0.5 * (1 - progress * 0.6); // Stone becomes less used
    this.productionRates.metal = 0.2 * (1 + progress * 2); // Metal becomes more important

    // Transitional resources increase then decrease
    const transitionPeak = Math.sin(progress * Math.PI); // Peaks at 0.5 progress
    this.productionRates.coal = transitionPeak * 2;
    this.productionRates.electronics = transitionPeak * 1.5;

    // Cyberpunk resources scale up with progress
    this.productionRates.energy = 0 + progress * 3;
    this.productionRates.cyberneticComponents = 0 + progress * 0.5;
    this.productionRates.data = 0 + progress * 2;

    // Also adjust consumption rates
    this.consumptionRates.food = 1; // Always needed
    this.consumptionRates.wood = 0.5 * (1 - progress * 0.8);
    this.consumptionRates.stone = 0 + progress * 0.1; // Small maintenance needs
    this.consumptionRates.metal = 0 + progress * 0.5;
    this.consumptionRates.coal = transitionPeak * 1.5;
    this.consumptionRates.electronics = transitionPeak * 1.2;
    this.consumptionRates.energy = 0 + progress * 2.5;
    this.consumptionRates.cyberneticComponents = 0 + progress * 0.3;
    this.consumptionRates.data = 0 + progress * 1.5;
  }

  // Get resources for a specific era (for compatibility)
  getEraResources(era: Era) {
    if (era === 'roman') {
      return this.resourcesByEra.roman;
    } else {
      return this.resourcesByEra.cyberpunk;
    }
  }
}
