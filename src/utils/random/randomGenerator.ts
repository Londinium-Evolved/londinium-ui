/**
 * A simple seeded random number generator
 * This allows for deterministic random number generation based on a seed
 */
export class RandomGenerator {
  private seed: number;

  /**
   * Create a new random number generator with the specified seed
   * @param seed The seed value to use for randomization
   */
  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate a random float between min and max
   * @param min The minimum value (inclusive)
   * @param max The maximum value (exclusive)
   * @returns A random float between min and max
   */
  generateFloatBetween(min: number, max: number): number {
    // Simple implementation of a seeded random
    const x = Math.sin(this.seed++) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  }

  /**
   * Generate a random integer between min and max (both inclusive)
   * @param min The minimum value (inclusive)
   * @param max The maximum value (inclusive)
   * @returns A random integer between min and max
   */
  generateIntegerBetween(min: number, max: number): number {
    return Math.floor(this.generateFloatBetween(min, max + 1));
  }

  /**
   * Generate a boolean with the specified probability of being true
   * @param probability The probability of returning true (0-1)
   * @returns A random boolean
   */
  generateBooleanWithProbability(probability: number): boolean {
    return this.generateFloatBetween(0, 1) < probability;
  }

  /**
   * Reset the seed to a new value
   * @param seed The new seed value
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get the current seed value
   * @returns The current seed
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Create a new RandomGenerator with a random seed
 * @returns A RandomGenerator instance with a random seed
 */
export function createRandomGenerator(): RandomGenerator {
  return new RandomGenerator(Math.floor(Math.random() * 100000));
}

/**
 * Create a new RandomGenerator with a specific seed
 * @param seed The seed to use
 * @returns A RandomGenerator instance with the specified seed
 */
export function createSeededGenerator(seed: number): RandomGenerator {
  return new RandomGenerator(seed);
}
