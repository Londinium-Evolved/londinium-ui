import { ComponentType } from './types';

/**
 * Decorator for component classes
 * @param type The type identifier for the component
 * @returns A decorator function that sets the component type
 */
export function component(type: ComponentType) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T) {
    return class extends constructor {
      readonly type = type;
    };
  };
}
