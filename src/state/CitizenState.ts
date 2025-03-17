import { makeAutoObservable, computed } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { RootStore } from './RootStore';
import { Citizen, ICitizenState, BaseState } from './types';

export class CitizenState implements ICitizenState, BaseState {
  rootStore: RootStore;
  citizens: Record<string, Citizen> = {};
  unemployedCount: number = 0;
  homelessCount: number = 0;
  happiness: number = 75; // Default happiness level (0-100)

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, {
      rootStore: false,
      totalPopulation: computed,
      employedCount: computed,
      housedCount: computed,
      averageHappiness: computed,
    });
  }

  // Computed properties
  get totalPopulation() {
    return Object.keys(this.citizens).length;
  }

  get employedCount() {
    return this.totalPopulation - this.unemployedCount;
  }

  get housedCount() {
    return this.totalPopulation - this.homelessCount;
  }

  get averageHappiness() {
    if (this.totalPopulation === 0) return 0;

    const totalHappiness = Object.values(this.citizens).reduce((sum, citizen) => {
      // Calculate individual happiness based on needs satisfaction
      const needValues = Object.values(citizen.needs);
      const avgNeedSatisfaction = needValues.reduce((a, b) => a + b, 0) / needValues.length;
      return sum + avgNeedSatisfaction;
    }, 0);

    return totalHappiness / this.totalPopulation;
  }

  // Actions
  addCitizen(occupation: string = '', homeBuilding: string = '', workBuilding: string = '') {
    const id = uuidv4();
    const citizen: Citizen = {
      id,
      occupation,
      homeBuilding,
      workBuilding,
      needs: {
        food: 100, // Start with full needs
        shelter: 100,
        entertainment: 100,
      },
    };

    this.citizens[id] = citizen;

    // Update counters
    if (!workBuilding) this.unemployedCount++;
    if (!homeBuilding) this.homelessCount++;

    return id;
  }

  removeCitizen(id: string) {
    const citizen = this.citizens[id];
    if (!citizen) return false;

    // Update counters before removal
    if (!citizen.workBuilding) this.unemployedCount--;
    if (!citizen.homeBuilding) this.homelessCount--;

    delete this.citizens[id];
    return true;
  }

  assignHome(citizenId: string, buildingId: string) {
    const citizen = this.citizens[citizenId];
    if (!citizen) return false;

    // If was homeless and now has a home, decrease homeless count
    if (!citizen.homeBuilding && buildingId) {
      this.homelessCount--;
    }
    // If had a home and now homeless, increase homeless count
    else if (citizen.homeBuilding && !buildingId) {
      this.homelessCount++;
    }

    citizen.homeBuilding = buildingId;
    return true;
  }

  assignJob(citizenId: string, buildingId: string, occupation: string) {
    const citizen = this.citizens[citizenId];
    if (!citizen) return false;

    // If was unemployed and now has a job, decrease unemployed count
    if (!citizen.workBuilding && buildingId) {
      this.unemployedCount--;
    }
    // If had a job and now unemployed, increase unemployed count
    else if (citizen.workBuilding && !buildingId) {
      this.unemployedCount++;
    }

    citizen.workBuilding = buildingId;
    citizen.occupation = occupation;
    return true;
  }

  updateNeeds(citizenId: string, needUpdates: Record<string, number>) {
    const citizen = this.citizens[citizenId];
    if (!citizen) return false;

    // Update each specified need
    Object.entries(needUpdates).forEach(([need, value]) => {
      if (need in citizen.needs) {
        citizen.needs[need] = Math.max(0, Math.min(100, citizen.needs[need] + value));
      } else {
        citizen.needs[need] = Math.max(0, Math.min(100, value));
      }
    });

    return true;
  }

  // Era transition effect on citizens
  applyEraTransition(progress: number) {
    // As the era progresses, add or modify needs specific to the cyberpunk era
    Object.values(this.citizens).forEach((citizen) => {
      // New cyberpunk needs emerge as the era advances
      if (progress > 0.3 && !('connectivity' in citizen.needs)) {
        citizen.needs.connectivity = 50 * progress;
      }

      if (progress > 0.6 && !('augmentation' in citizen.needs)) {
        citizen.needs.augmentation = 30 * (progress - 0.6) * 2.5; // Scales to max 75 at progress 1
      }
    });

    // Update overall happiness based on era adaptation
    this.updateHappiness();
  }

  // Update the global happiness metric
  updateHappiness() {
    // Calculated automatically via the computed property
    const newHappiness = this.averageHappiness;

    // Apply some inertia to happiness changes (can't change too rapidly)
    this.happiness = this.happiness * 0.8 + newHappiness * 0.2;
  }

  // Cleanup when the store is no longer needed
  dispose(): void {
    // Add cleanup logic if needed
  }
}
