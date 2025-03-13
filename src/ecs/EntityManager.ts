import { makeAutoObservable } from 'mobx';
import {
  Component,
  ComponentQuery,
  ComponentType,
  EntityEvent,
  EntityEventListener,
  EntityEventType,
  EntityId,
} from './types';

/**
 * Manages entities and their components in the ECS architecture.
 * Uses MobX for reactive state management.
 */
export class EntityManager {
  // Counter for generating unique entity IDs
  private nextEntityId: EntityId = 1;

  // Maps entity IDs to their component maps
  private entities: Map<EntityId, Map<ComponentType, Component>> = new Map();

  // Maps component types to sets of entity IDs that have that component
  private componentEntityMap: Map<ComponentType, Set<EntityId>> = new Map();

  // Event listeners
  private eventListeners: Map<EntityEventType, Set<EntityEventListener>> = new Map();

  constructor() {
    makeAutoObservable(this, {
      // These are computed methods, not actions
      getEntity: false,
      getComponent: false,
      hasComponent: false,
      queryEntities: false,
    });

    // Initialize event listener sets
    Object.values(EntityEventType).forEach((eventType) => {
      this.eventListeners.set(eventType, new Set());
    });
  }

  /**
   * Creates a new entity
   * @returns The ID of the created entity
   */
  createEntity(): EntityId {
    const entityId = this.nextEntityId++;
    this.entities.set(entityId, new Map());

    this.emitEvent({
      type: EntityEventType.ENTITY_CREATED,
      entityId,
    });

    return entityId;
  }

  /**
   * Destroys an entity and all its components
   * @param entityId The ID of the entity to destroy
   * @returns Whether the entity was successfully destroyed
   */
  destroyEntity(entityId: EntityId): boolean {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return false;

    // Remove the entity from all component maps
    for (const [componentType, component] of componentMap.entries()) {
      // First emit a component removed event
      this.emitEvent({
        type: EntityEventType.COMPONENT_REMOVED,
        entityId,
        componentType,
        component,
      });

      // Then remove the entity from the component entity map
      const entitySet = this.componentEntityMap.get(componentType);
      if (entitySet) {
        entitySet.delete(entityId);
        if (entitySet.size === 0) {
          this.componentEntityMap.delete(componentType);
        }
      }
    }

    // Remove the entity from the entities map
    this.entities.delete(entityId);

    // Emit entity destroyed event
    this.emitEvent({
      type: EntityEventType.ENTITY_DESTROYED,
      entityId,
    });

    return true;
  }

  /**
   * Adds a component to an entity
   * @param entityId The ID of the entity
   * @param component The component to add
   * @returns Whether the component was successfully added
   */
  addComponent(entityId: EntityId, component: Component): boolean {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return false;

    // Add the component to the entity
    componentMap.set(component.type, component);

    // Add the entity to the component entity map
    let entitySet = this.componentEntityMap.get(component.type);
    if (!entitySet) {
      entitySet = new Set();
      this.componentEntityMap.set(component.type, entitySet);
    }
    entitySet.add(entityId);

    // Emit component added event
    this.emitEvent({
      type: EntityEventType.COMPONENT_ADDED,
      entityId,
      componentType: component.type,
      component,
    });

    return true;
  }

  /**
   * Removes a component from an entity
   * @param entityId The ID of the entity
   * @param componentType The type of component to remove
   * @returns Whether the component was successfully removed
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return false;

    // Get the component before removing it
    const component = componentMap.get(componentType);
    if (!component) return false;

    // Remove the component from the entity
    componentMap.delete(componentType);

    // Remove the entity from the component entity map
    const entitySet = this.componentEntityMap.get(componentType);
    if (entitySet) {
      entitySet.delete(entityId);
      if (entitySet.size === 0) {
        this.componentEntityMap.delete(componentType);
      }
    }

    // Emit component removed event
    this.emitEvent({
      type: EntityEventType.COMPONENT_REMOVED,
      entityId,
      componentType,
      component,
    });

    return true;
  }

  /**
   * Gets a component from an entity
   * @param entityId The ID of the entity
   * @param componentType The type of component to get
   * @returns The component, or undefined if not found
   */
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return undefined;

    return componentMap.get(componentType) as T | undefined;
  }

  /**
   * Checks if an entity has a specific component
   * @param entityId The ID of the entity
   * @param componentType The type of component to check for
   * @returns Whether the entity has the component
   */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return false;

    return componentMap.has(componentType);
  }

  /**
   * Updates a component on an entity
   * @param entityId The ID of the entity
   * @param component The updated component
   * @returns Whether the component was successfully updated
   */
  updateComponent(entityId: EntityId, component: Component): boolean {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return false;

    // Check if the component exists
    if (!componentMap.has(component.type)) return false;

    // Update the component
    componentMap.set(component.type, component);

    // Emit component changed event
    this.emitEvent({
      type: EntityEventType.COMPONENT_CHANGED,
      entityId,
      componentType: component.type,
      component,
    });

    return true;
  }

  /**
   * Gets all components for an entity
   * @param entityId The ID of the entity
   * @returns An array of all components for the entity, or undefined if the entity doesn't exist
   */
  getEntity(entityId: EntityId): Component[] | undefined {
    const componentMap = this.entities.get(entityId);
    if (!componentMap) return undefined;

    return Array.from(componentMap.values());
  }

  /**
   * Queries for entities that match the given component criteria
   * @param query The query to match entities against
   * @returns An array of entity IDs that match the query
   */
  queryEntities(query: ComponentQuery): EntityId[] {
    const { all = [], any = [], none = [] } = query;

    let result: Set<EntityId> | null = null;

    // Handle 'all' components (AND condition)
    if (all.length > 0) {
      // Start with the smallest component entity set for efficiency
      const componentSets = all
        .map((type) => this.componentEntityMap.get(type) || new Set<EntityId>())
        .sort((a, b) => a.size - b.size);

      if (componentSets[0].size === 0) return []; // No entities have the first required component

      result = new Set(componentSets[0]);

      // Intersect with other component entity sets
      for (let i = 1; i < componentSets.length; i++) {
        const nextSet = componentSets[i];

        // If any required component has no entities, return empty result
        if (nextSet.size === 0) return [];

        // Keep only entities that are in both sets
        result = new Set([...result].filter((id) => nextSet.has(id)));

        // Early exit if no entities match all conditions so far
        if (result.size === 0) return [];
      }
    }

    // Handle 'any' components (OR condition)
    if (any.length > 0) {
      const anyEntities = new Set<EntityId>();

      for (const type of any) {
        const entitySet = this.componentEntityMap.get(type);
        if (entitySet) {
          for (const id of entitySet) {
            anyEntities.add(id);
          }
        }
      }

      if (result === null) {
        result = anyEntities;
      } else {
        // Keep only entities that are in both sets
        result = new Set([...result].filter((id) => anyEntities.has(id)));
      }

      // Early exit if no entities match all conditions so far
      if (result !== null && result.size === 0) return [];
    }

    // If no 'all' or 'any' conditions, include all entities
    if (result === null) {
      result = new Set<EntityId>();
      for (const [entityId] of this.entities) {
        result.add(entityId);
      }
    }

    // Handle 'none' components (NOT condition)
    if (none.length > 0) {
      for (const type of none) {
        const entitySet = this.componentEntityMap.get(type);
        if (entitySet) {
          // Remove entities that have the excluded component
          for (const id of entitySet) {
            result.delete(id);
          }
        }
      }
    }

    return [...result];
  }

  /**
   * Registers an event listener
   * @param eventType The type of event to listen for
   * @param listener The listener function
   */
  addEventListener(eventType: EntityEventType, listener: EntityEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Removes an event listener
   * @param eventType The type of event the listener was registered for
   * @param listener The listener function to remove
   */
  removeEventListener(eventType: EntityEventType, listener: EntityEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emits an event to all registered listeners
   * @param event The event to emit
   */
  private emitEvent(event: EntityEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
