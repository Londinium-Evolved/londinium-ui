import { ComponentType } from './types';

/**
 * Decorator for component classes
 * @param type The type identifier for the component
 * @returns A decorator function that sets the component type
 */
export function component(type: ComponentType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => object>(constructor: T) {
    return class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);
      }

      readonly type = type;
    };
  };
}
