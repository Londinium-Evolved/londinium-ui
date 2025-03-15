import { EntityId } from './types';
import { EntityManager } from './EntityManager';

/**
 * Base class for all systems in the ECS
 */
export abstract class System {
  protected entityManager: EntityManager;
  protected componentsRequired: string[] = [];

  /**
   * Creates a new system
   * @param entityManager The entity manager instance
   */
  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Called when the system is initialized
   */
  init(): void {
    // Override in subclasses as needed
  }

  /**
   * Called when the system is being destroyed
   */
  destroy(): void {
    // Override in subclasses as needed
  }

  /**
   * Updates the system's state
   * @param deltaTime Time since the last update in seconds
   */
  update(deltaTime: number): void {
    // Query for entities that match our required components
    const entityIds = this.entityManager.queryEntities(this.componentsRequired);

    // Process each matching entity
    this.process(entityIds, deltaTime);
  }

  /**
   * Processes the entities with the required components
   * @param entityIds The IDs of the entities to process
   * @param deltaTime Time since the last update in seconds
   */
  protected abstract process(entityIds: EntityId[], deltaTime: number): void;
}
