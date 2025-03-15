import { v4 as uuidv4 } from 'uuid';
import { Component, ComponentMap, EntityId, ECSEvent, EventListener, ECSEventType } from './types';

/**
 * Manages entities and their components in the ECS
 */
export class EntityManager {
  private entities: Map<EntityId, ComponentMap> = new Map();
  private eventListeners: Map<ECSEventType, Set<EventListener>> = new Map();

  /**
   * Creates a new entity with a unique ID
   * @returns The ID of the new entity
   */
  createEntity(): EntityId {
    const id = uuidv4();
    this.entities.set(id, new Map());
    this.emitEvent({ type: ECSEventType.ENTITY_CREATED, entityId: id });
    return id;
  }

  /**
   * Removes an entity and all its components
   * @param entityId The ID of the entity to remove
   */
  removeEntity(entityId: EntityId): void {
    if (this.entities.has(entityId)) {
      this.entities.delete(entityId);
      this.emitEvent({ type: ECSEventType.ENTITY_DESTROYED, entityId });
    }
  }

  /**
   * Adds a component to an entity
   * @param entityId The ID of the entity
   * @param component The component to add
   */
  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const entityComponents = this.entities.get(entityId);
    if (entityComponents) {
      entityComponents.set(component.type, component);
      this.emitEvent({
        type: ECSEventType.COMPONENT_ADDED,
        entityId,
        componentType: component.type,
        component,
      });
    }
  }

  /**
   * Removes a component from an entity
   * @param entityId The ID of the entity
   * @param componentType The type of component to remove
   */
  removeComponent(entityId: EntityId, componentType: string): void {
    const entityComponents = this.entities.get(entityId);
    if (entityComponents && entityComponents.has(componentType)) {
      const component = entityComponents.get(componentType);
      entityComponents.delete(componentType);
      this.emitEvent({
        type: ECSEventType.COMPONENT_REMOVED,
        entityId,
        componentType,
        component,
      });
    }
  }

  /**
   * Gets a component from an entity
   * @param entityId The ID of the entity
   * @param componentType The type of component to get
   * @returns The component, or undefined if not found
   */
  getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined {
    const entityComponents = this.entities.get(entityId);
    if (entityComponents && entityComponents.has(componentType)) {
      return entityComponents.get(componentType) as T;
    }
    return undefined;
  }

  /**
   * Checks if an entity has a specific component
   * @param entityId The ID of the entity
   * @param componentType The type of component to check for
   * @returns True if the entity has the component
   */
  hasComponent(entityId: EntityId, componentType: string): boolean {
    const entityComponents = this.entities.get(entityId);
    return !!entityComponents && entityComponents.has(componentType);
  }

  /**
   * Gets all entities that have all the specified component types
   * @param componentTypes The types of components to query for
   * @returns An array of entity IDs that match the query
   */
  queryEntities(componentTypes: string[]): EntityId[] {
    const result: EntityId[] = [];

    this.entities.forEach((components, entityId) => {
      const hasAllComponents = componentTypes.every((type) => components.has(type));
      if (hasAllComponents) {
        result.push(entityId);
      }
    });

    return result;
  }

  /**
   * Registers an event listener
   * @param eventType The type of event to listen for
   * @param listener The listener function
   */
  addEventListener(eventType: ECSEventType, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(listener);
  }

  /**
   * Removes an event listener
   * @param eventType The type of event
   * @param listener The listener function to remove
   */
  removeEventListener(eventType: ECSEventType, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emits an event to all registered listeners
   * @param event The event to emit
   */
  private emitEvent(event: ECSEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }
}
