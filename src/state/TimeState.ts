import { makeAutoObservable, computed } from 'mobx';
import { RootStore } from './RootStore';
import { ITimeState } from './types';

export class TimeState implements ITimeState {
  rootStore: RootStore;

  // Time tracking
  currentDay: number = 1;
  currentYear: number = 1;
  dayLength: number = 5000; // milliseconds per game day
  lastUpdateTime: number = Date.now();
  elapsedTimeAccumulator: number = 0; // Accumulator for partial days

  // Game speed controls
  paused: boolean = false;
  speedMultiplier: number = 1; // 1x, 2x, 3x, etc.

  // Internal timer reference
  private updateIntervalId: number | null = null;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, {
      rootStore: false,
      formattedDate: computed,
      realTimeElapsedSinceLastUpdate: computed,
    });

    // Start the time update interval
    this.startTimeLoop();
  }

  // Computed values
  get formattedDate() {
    return `Year ${this.currentYear}, Day ${this.currentDay}`;
  }

  get realTimeElapsedSinceLastUpdate() {
    return Date.now() - this.lastUpdateTime;
  }

  get effectiveDayLength() {
    return this.dayLength / this.speedMultiplier;
  }

  // Actions
  startTimeLoop() {
    if (this.updateIntervalId !== null) return;

    // Run update at 60fps for smooth progression
    this.updateIntervalId = window.setInterval(() => {
      if (!this.paused) {
        this.updateGameTime();
      }
    }, 16);
  }

  stopTimeLoop() {
    if (this.updateIntervalId !== null) {
      window.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  setSpeedMultiplier(multiplier: number) {
    // Ensure multiplier is between 0.5 and 5
    this.speedMultiplier = Math.max(0.5, Math.min(5, multiplier));
  }

  setDayLength(milliseconds: number) {
    // Ensure day length is at least 1000ms and at most 30000ms
    this.dayLength = Math.max(1000, Math.min(30000, milliseconds));
  }

  // Advance time by the appropriate amount
  updateGameTime() {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;

    // Skip updates when elapsed time is zero or negative
    if (elapsed <= 0) return;

    // Add to our accumulator
    this.elapsedTimeAccumulator += elapsed;

    // Calculate how many whole days have passed
    const fullDays = Math.floor(this.elapsedTimeAccumulator / this.effectiveDayLength);

    if (fullDays > 0) {
      // Advance game time by full days
      this.advanceTime(fullDays);

      // Remove the processed time from accumulator, keeping only the remainder
      this.elapsedTimeAccumulator -= fullDays * this.effectiveDayLength;

      if (process.env.NODE_ENV !== 'production') {
        console.debug(
          `Time update: +${fullDays} days | ` +
            `Remaining partial day: ${(
              this.elapsedTimeAccumulator / this.effectiveDayLength
            ).toFixed(3)} | ` +
            `Effective day length: ${this.effectiveDayLength}ms`
        );
      }
    }

    // Update the last time we processed
    this.lastUpdateTime = now;
  }

  // Advance game time by the specified number of days
  advanceTime(days: number) {
    // Calculate total days
    const totalDayCount = this.currentDay + days;

    // Calculate new year and day
    const daysPerYear = 365;
    const newYear = this.currentYear + Math.floor((totalDayCount - 1) / daysPerYear);
    const newDay = ((totalDayCount - 1) % daysPerYear) + 1;

    // Apply changes
    this.currentYear = newYear;
    this.currentDay = newDay;

    // Trigger any day change events or updates in other stores
    this.onDayChanged();
  }

  // Callback that runs when a day changes
  onDayChanged() {
    // Update resources based on production/consumption rates
    const { resourceState, buildingState } = this.rootStore;
    if (resourceState && buildingState) {
      // Apply production and consumption
      Object.entries(resourceState.productionRates).forEach(([resource, rate]) => {
        if (rate && typeof rate === 'number') {
          resourceState.addResource(resource as keyof typeof resourceState.resources, rate);
        }
      });

      Object.entries(resourceState.consumptionRates).forEach(([resource, rate]) => {
        if (rate && typeof rate === 'number') {
          resourceState.addResource(resource as keyof typeof resourceState.resources, -rate);
        }
      });

      // Progress buildings under construction
      buildingState.progressConstruction();
    }
  }

  // Cleanup when the store is no longer needed
  dispose() {
    this.stopTimeLoop();
  }
}
