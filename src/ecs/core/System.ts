import { Entity } from './Entity';

/**
 * Base System class for the ECS architecture
 * Systems process entities that have specific components
 */
export abstract class System {
  /** Entities that this system is currently processing */
  protected entities: Entity[] = [];
  
  /** Component types required for an entity to be processed by this system */
  protected requiredComponents: string[] = [];

  /**
   * Register an entity with this system
   * @param entity The entity to register
   * @returns True if the entity was registered (had required components)
   */
  public registerEntity(entity: Entity): boolean {
    // Check if entity has all required components
    if (this.requiredComponents.every(type => entity.hasComponent(type))) {
      this.entities.push(entity);
      return true;
    }
    return false;
  }

  /**
   * Unregister an entity from this system
   * @param entityId The ID of the entity to unregister
   */
  public unregisterEntity(entityId: string): void {
    this.entities = this.entities.filter(entity => entity.id !== entityId);
  }

  /**
   * Get all entities with a specific component type
   * @param componentType The component type to filter by
   * @returns Filtered array of entities
   */
  protected getEntitiesWithComponent(componentType: string): Entity[] {
    return this.entities.filter(entity => entity.hasComponent(componentType));
  }

  /**
   * Set the required component types for this system
   * @param componentTypes Array of required component types
   */
  protected setRequiredComponents(componentTypes: string[]): void {
    this.requiredComponents = componentTypes;
  }

  /**
   * Main update method to be implemented by derived systems
   * @param deltaTime Time elapsed since last update in seconds
   */
  public abstract update(deltaTime: number): void;
}