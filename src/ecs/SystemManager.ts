import { System } from './System';
import { EntityManager } from './EntityManager';

/**
 * Manages and updates systems in the ECS
 */
export class SystemManager {
  private systems: System[] = [];
  private entityManager: EntityManager;

  /**
   * Creates a new system manager
   * @param entityManager The entity manager instance
   */
  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Registers a system with the manager
   * @param system The system to register
   */
  registerSystem(system: System): void {
    this.systems.push(system);
    system.init();
  }

  /**
   * Removes a system from the manager
   * @param system The system to remove
   */
  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      system.destroy();
      this.systems.splice(index, 1);
    }
  }

  /**
   * Updates all registered systems
   * @param deltaTime Time since the last update in seconds
   */
  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  /**
   * Gets all registered systems
   * @returns Array of registered systems
   */
  getSystems(): System[] {
    return [...this.systems];
  }

  /**
   * Destroys all systems and clears the manager
   */
  destroy(): void {
    for (const system of this.systems) {
      system.destroy();
    }
    this.systems = [];
  }
}
