import { Resources } from '../state/types';

/**
 * Configuration for resource adjustments during era transitions
 */

// Define a unified adjustment config type
export type AdjustmentConfig = {
  base: number;
  factor: number;
  op?: (base: number, progress: number) => number;
};

// Unified adjustments for both production and consumption
export const resourceAdjustments: Record<
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

/**
 * Helper function to update resource rates
 * @param rates The rates object to update
 * @param key The resource key
 * @param progress The era transition progress (0-1)
 * @param type Whether we're updating production or consumption
 * @param defaultOp Default operation to apply if no custom operation is defined
 */
export function updateRatesUnified<T extends keyof Resources>(
  rates: Partial<Resources>,
  key: T,
  progress: number,
  type: 'production' | 'consumption',
  defaultOp: (base: number, factor: number, progress: number) => number
) {
  const { base, factor, op } = resourceAdjustments[key][type];
  rates[key] = op ? op(base, progress) : defaultOp(base, factor, progress);
}

/**
 * Calculate a transition peak value that rises and falls during transition
 * @param progress The era transition progress (0-1)
 * @returns A value that peaks at 0.5 progress
 */
export function calculateTransitionPeak(progress: number): number {
  return Math.sin(progress * Math.PI); // Peaks at 0.5 progress
}