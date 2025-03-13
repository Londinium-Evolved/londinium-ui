/**
 * Unique identifier for an entity
 */
export type EntityId = number;

/**
 * Unique identifier for a component type
 */
export type ComponentType = string;

/**
 * Base interface for all components
 */
export interface Component {
  /**
   * The type identifier for this component
   */
  readonly type: ComponentType;
}

/**
 * A decorator function type for creating component classes
 */
export type ComponentDecorator = <T extends { new (...args: unknown[]): Component }>(
  constructor: T
) => T;

/**
 * Query used to filter entities based on their components
 */
export interface ComponentQuery {
  /**
   * Component types that must be present on an entity
   */
  all?: ComponentType[];

  /**
   * Component types where at least one must be present on an entity
   */
  any?: ComponentType[];

  /**
   * Component types that must not be present on an entity
   */
  none?: ComponentType[];
}

/**
 * System priority levels
 */
export enum SystemPriority {
  HIGHEST = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  LOWEST = 4,
}

/**
 * Entity event types
 */
export enum EntityEventType {
  ENTITY_CREATED = 'entity-created',
  ENTITY_DESTROYED = 'entity-destroyed',
  COMPONENT_ADDED = 'component-added',
  COMPONENT_REMOVED = 'component-removed',
  COMPONENT_CHANGED = 'component-changed',
}

/**
 * Base interface for entity events
 */
export interface EntityEvent {
  type: EntityEventType;
  entityId: EntityId;
  componentType?: ComponentType;
  component?: Component;
}

/**
 * Listener for entity events
 */
export type EntityEventListener = (event: EntityEvent) => void;
