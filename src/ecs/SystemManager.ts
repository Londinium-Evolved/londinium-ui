import { makeAutoObservable } from 'mobx';
import { EntityManager } from './EntityManager';
import { System } from './System';
import { SystemPriority } from './types';

/**
 * Manages and updates systems in the ECS architecture
 */
export class SystemManager {
  /**
   * The EntityManager instance
   */
  private entityManager: EntityManager;

  /**
   * The registered systems
   */
  private systems: System[] = [];

  /**
   * Whether the systems need to be sorted by priority
   */
  private needsSort: boolean = false;

  /**
   * Creates a new SystemManager
   * @param entityManager The EntityManager instance
   */
  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    makeAutoObservable(this, {
      // These are computed methods, not actions
      getSystems: false,
    });
  }

  /**
   * Registers a system
   * @param system The system to register
   */
  registerSystem(system: System): void {
    if (this.systems.includes(system)) {
      return;
    }

    this.systems.push(system);
    this.needsSort = true;

    // Notify the system that it has been registered
    system.onRegister();
  }

  /**
   * Unregisters a system
   * @param system The system to unregister
   * @returns Whether the system was successfully unregistered
   */
  unregisterSystem(system: System): boolean {
    const index = this.systems.indexOf(system);
    if (index === -1) {
      return false;
    }

    // Notify the system that it is being unregistered
    system.onUnregister();

    this.systems.splice(index, 1);
    return true;
  }

  /**
   * Gets all registered systems
   * @returns An array of all registered systems
   */
  getSystems(): System[] {
    return [...this.systems];
  }

  /**
   * Gets systems with a specific priority
   * @param priority The priority to filter by
   * @returns An array of systems with the specified priority
   */
  getSystemsByPriority(priority: SystemPriority): System[] {
    return this.systems.filter((system) => system.getPriority() === priority);
  }

  /**
   * Updates all enabled systems
   * @param deltaTime The time in seconds since the last update
   */
  update(deltaTime: number): void {
    // Sort systems by priority if needed
    if (this.needsSort) {
      this.systems.sort((a, b) => a.getPriority() - b.getPriority());
      this.needsSort = false;
    }

    // Update each enabled system
    for (const system of this.systems) {
      if (system.isEnabled()) {
        // Get entities that match the system's query
        const entityIds = this.entityManager.queryEntities(system.getQuery());

        // Process the entities
        system.process(this.entityManager, entityIds, deltaTime);
      }
    }
  }
}
