import { makeAutoObservable, computed } from 'mobx';
import { RootStore } from './RootStore';
import { Era, IResourceState, Resources, BaseState } from './types';

// Define resource types for different eras
export type RomanResource = 'food' | 'wood' | 'stone' | 'metal';
export type TransitionalResource = RomanResource | 'coal' | 'electronics';
export type CyberpunkResource = TransitionalResource | 'energy' | 'cyberneticComponents' | 'data';

// All resource types
export type Resource = CyberpunkResource;

// Re-export Resources type for backward compatibility
export type { Resources };

// Define a unified adjustment config type
type AdjustmentConfig = {
  base: number;
  factor: number;
  op?: (base: number, progress: number) => number;
};

// Unified adjustments for both production and consumption
const adjustments: Record<
  keyof Resources,
  { production: AdjustmentConfig; consumption: AdjustmentConfig }
> = {
  food: {
    production: { base: 2, factor: 0.5, op: (base, progress) => base * (1 - progress * 0.5) },
    consumption: { base: 1, factor: 0, op: () => 1 }, // Always 1
  },
  wood: {
    production: { base: 1, factor: 0.7, op: (base, progress) => base * (1 - progress * 0.7) },
    consumption: { base: 0.5, factor: 0.8, op: (base, progress) => base * (1 - progress * 0.8) },
  },
  stone: {
    production: { base: 0.5, factor: 0.6, op: (base, progress) => base * (1 - progress * 0.6) },
    consumption: { base: 0, factor: 0.1, op: (_, progress) => progress * 0.1 },
  },
  metal: {
    production: { base: 0.2, factor: 2, op: (base, progress) => base * (1 + progress * 2) },
    consumption: { base: 0, factor: 0.5, op: (_, progress) => progress * 0.5 },
  },
  coal: {
    production: { base: 0, factor: 2 }, // Handled separately using transition peak
    consumption: { base: 0, factor: 1.5 }, // Handled separately using transition peak
  },
  electronics: {
    production: { base: 0, factor: 1.5 }, // Handled separately using transition peak
    consumption: { base: 0, factor: 1.2 }, // Handled separately using transition peak
  },
  energy: {
    production: { base: 0, factor: 3 },
    consumption: { base: 0, factor: 2.5, op: (_, progress) => progress * 2.5 },
  },
  cyberneticComponents: {
    production: { base: 0, factor: 0.5 },
    consumption: { base: 0, factor: 0.3, op: (_, progress) => progress * 0.3 },
  },
  data: {
    production: { base: 0, factor: 2 },
    consumption: { base: 0, factor: 1.5, op: (_, progress) => progress * 1.5 },
  },
};

// Unified helper function to update rates
function updateRatesUnified<T extends keyof Resources>(
  rates: Partial<Resources>,
  key: T,
  progress: number,
  type: 'production' | 'consumption',
  defaultOp: (base: number, factor: number, progress: number) => number
) {
  const { base, factor, op } = adjustments[key][type];
  rates[key] = op ? op(base, progress) : defaultOp(base, factor, progress);
}

export class ResourceState implements IResourceState, BaseState {
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
      updateRates: false, // Don't make this observable
    });
  }

  // Helper method for backward compatibility
  updateRates<T extends keyof Resources>(
    rates: Partial<Resources>,
    config: Record<
      T,
      { base: number; factor: number; op?: (base: number, progress: number) => number }
    >,
    progress: number,
    defaultOp?: (resource: T, base: number, factor: number, progress: number) => number
  ) {
    // This function is now a wrapper around the new unified function for backward compatibility
    Object.keys(config).forEach((key) => {
      const resource = key as keyof Resources;
      const type = rates === this.productionRates ? 'production' : 'consumption';

      // Use default operation from parameter or provide a simple one
      const defaultOperation = defaultOp
        ? (base: number, factor: number, p: number) => defaultOp(resource as T, base, factor, p)
        : (base: number, factor: number, p: number) => base + p * factor;

      updateRatesUnified(
        rates,
        resource,
        progress,
        type as 'production' | 'consumption',
        defaultOperation
      );
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

    // Calculate transitional peak once
    const transitionPeak = Math.sin(progress * Math.PI); // Peaks at 0.5 progress

    // Process all resources using the unified helper function
    (Object.keys(this.productionRates) as (keyof Resources)[]).forEach((resource) => {
      // Skip special transition resources
      if (resource !== 'coal' && resource !== 'electronics') {
        updateRatesUnified(
          this.productionRates,
          resource,
          progress,
          'production',
          (base, factor, p) => base + p * factor
        );
      }
    });

    (Object.keys(this.consumptionRates) as (keyof Resources)[]).forEach((resource) => {
      // Skip special transition resources
      if (resource !== 'coal' && resource !== 'electronics') {
        updateRatesUnified(
          this.consumptionRates,
          resource,
          progress,
          'consumption',
          (base, factor, p) => base + p * factor
        );
      }
    });

    // Special handling for transition resources
    this.productionRates.coal = transitionPeak * adjustments.coal.production.factor;
    this.productionRates.electronics = transitionPeak * adjustments.electronics.production.factor;
    this.consumptionRates.coal = transitionPeak * adjustments.coal.consumption.factor;
    this.consumptionRates.electronics = transitionPeak * adjustments.electronics.consumption.factor;
  }

  // Get resources for a specific era (for compatibility)
  getEraResources(era: Era) {
    if (era === 'roman') {
      return this.resourcesByEra.roman;
    } else {
      return this.resourcesByEra.cyberpunk;
    }
  }

  // Cleanup when the store is no longer needed
  dispose(): void {
    // Add cleanup logic if needed
  }
}
