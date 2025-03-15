/**
 * Core type definitions for the ECS (Entity Component System)
 */

// Entity is represented as a string ID
export type EntityId = string;

// Component interface that all components must implement
export interface Component {
  readonly type: string;
}

// Base type for all component classes
export type ComponentType<T extends object = object> = new (...args: unknown[]) => T & Component;

// Component constructor signature
export type ComponentConstructor<T extends Component> = new (...args: unknown[]) => T;

// Map of component type to component instance
export type ComponentMap = Map<string, Component>;

// Event types for the ECS system
export enum ECSEventType {
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_DESTROYED = 'ENTITY_DESTROYED',
  COMPONENT_ADDED = 'COMPONENT_ADDED',
  COMPONENT_REMOVED = 'COMPONENT_REMOVED',
  COMPONENT_UPDATED = 'COMPONENT_UPDATED',
}

// Event interface for ECS events
export interface ECSEvent {
  type: ECSEventType;
  entityId: EntityId;
  componentType?: string;
  component?: Component;
}

// Event listener function type
export type EventListener = (event: ECSEvent) => void;
