import { EntityManager } from './EntityManager';
import { ComponentQuery, EntityId, SystemPriority } from './types';

/**
 * Abstract base class for all systems in the ECS architecture
 */
export abstract class System {
  /**
   * The query used to filter entities for this system to process
   */
  protected readonly query: ComponentQuery;

  /**
   * The priority of this system (affects execution order)
   */
  protected readonly priority: SystemPriority;

  /**
   * Whether this system is currently enabled
   */
  private enabled: boolean = true;

  /**
   * Creates a new system
   * @param query The query used to filter entities for this system to process
   * @param priority The priority of this system (affects execution order)
   */
  constructor(query: ComponentQuery, priority: SystemPriority = SystemPriority.NORMAL) {
    this.query = query;
    this.priority = priority;
  }

  /**
   * Gets whether this system is currently enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enables or disables this system
   * @param enabled Whether to enable or disable this system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Gets the priority of this system
   */
  getPriority(): SystemPriority {
    return this.priority;
  }

  /**
   * Gets the query used to filter entities for this system to process
   */
  getQuery(): ComponentQuery {
    return this.query;
  }

  /**
   * Called when the system is registered with a SystemManager
   * Override in derived classes if needed
   */
  onRegister(): void {
    // Default implementation does nothing
  }

  /**
   * Called when the system is unregistered from a SystemManager
   * Override in derived classes if needed
   */
  onUnregister(): void {
    // Default implementation does nothing
  }

  /**
   * Processes the filtered entities
   * @param entityManager The EntityManager instance
   * @param entityIds The IDs of the entities to process
   * @param deltaTime The time in seconds since the last update
   */
  abstract process(entityManager: EntityManager, entityIds: EntityId[], deltaTime: number): void;
}
