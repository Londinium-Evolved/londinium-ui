import { ComponentType } from './types';

/**
 * Decorator for creating component classes
 * @param type The component type identifier
 * @returns A decorator function for the component class
 */
export function component(type: string) {
  return function <T extends object>(constructor: ComponentType<T>) {
    constructor.prototype.type = type;
    return constructor;
  };
}
