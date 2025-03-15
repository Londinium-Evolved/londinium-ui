import { Component } from '../types';

/**
 * Enum representing the different eras in the game
 */
export enum Era {
  Roman = 'roman',
  Transitional = 'transitional',
  Cyberpunk = 'cyberpunk',
}

/**
 * Component for handling era transitions on entities
 */
export class EraTransitionComponent implements Component {
  readonly type: string = 'eraTransition';

  /**
   * @param currentEra The current era of the entity
   * @param targetEra The target era for transition (if transitioning)
   * @param transitionProgress Progress from 0 (current) to 1 (target)
   * @param transitionSpeed Speed of transition in units per second
   * @param isTransitioning Whether the entity is currently transitioning
   */
  constructor(
    public currentEra: Era = Era.Roman,
    public targetEra: Era = Era.Roman,
    public transitionProgress: number = 0,
    public transitionSpeed: number = 1.0,
    public isTransitioning: boolean = false
  ) {}

  /**
   * Start a transition to a new era
   * @param era The era to transition to
   */
  startTransition(era: Era): void {
    if (this.currentEra === era) return;
    this.targetEra = era;
    this.isTransitioning = true;
  }

  /**
   * Update the transition progress
   * @param deltaTime Time elapsed since last update in seconds
   * @returns true if the transition is complete
   */
  updateTransition(deltaTime: number): boolean {
    if (!this.isTransitioning) return false;

    // Calculate direction based on target era
    const direction = this.targetEra === Era.Roman ? -1 : 1;

    // Update progress
    this.transitionProgress += direction * (deltaTime * this.transitionSpeed);

    // Clamp progress between 0 and 1
    this.transitionProgress = Math.max(0, Math.min(1, this.transitionProgress));

    // Check if transition is complete
    const isComplete =
      (this.transitionProgress <= 0 && this.targetEra === Era.Roman) ||
      (this.transitionProgress >= 1 && this.targetEra === Era.Cyberpunk);

    // Update state if complete
    if (isComplete) {
      this.currentEra = this.targetEra;
      this.isTransitioning = false;
    }

    return isComplete;
  }
}
