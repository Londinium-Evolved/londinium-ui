/**
 * Base Entity class for the ECS architecture
 * Represents a game object with a unique ID that can have components attached
 */
export class Entity {
  /** Unique identifier for this entity */
  public readonly id: string;
  
  /** Map of component types to component instances */
  private components: Map<string, any> = new Map();

  /**
   * Create a new Entity
   * @param id Optional custom ID (will generate UUID if not provided)
   */
  constructor(id?: string) {
    this.id = id || crypto.randomUUID();
  }

  /**
   * Add a component to this entity
   * @param component The component to add
   * @returns This entity for chaining
   */
  public addComponent<T>(component: T & { type: string }): Entity {
    this.components.set(component.type, component);
    return this;
  }

  /**
   * Get a component by type
   * @param type The component type to retrieve
   * @returns The component or undefined if not found
   */
  public getComponent<T>(type: string): T | undefined {
    return this.components.get(type) as T;
  }

  /**
   * Check if this entity has a component
   * @param type The component type to check for
   * @returns True if the entity has the component
   */
  public hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Remove a component from this entity
   * @param type The component type to remove
   * @returns True if the component was removed
   */
  public removeComponent(type: string): boolean {
    return this.components.delete(type);
  }

  /**
   * Get all component types attached to this entity
   * @returns Array of component types
   */
  public getComponentTypes(): string[] {
    return Array.from(this.components.keys());
  }
}