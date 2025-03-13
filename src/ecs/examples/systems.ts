import { EntityManager } from '../EntityManager';
import { System } from '../System';
import { EntityId, SystemPriority } from '../types';
import { PositionComponent, VelocityComponent } from './components';

/**
 * System that updates entity positions based on their velocities
 */
export class MovementSystem extends System {
  constructor() {
    super(
      {
        // This system processes entities that have both position and velocity components
        all: ['position', 'velocity'],
      },
      SystemPriority.NORMAL
    );
  }

  /**
   * Processes entities with position and velocity components
   * @param entityManager The EntityManager instance
   * @param entityIds The IDs of the entities to process
   * @param deltaTime The time in seconds since the last update
   */
  process(entityManager: EntityManager, entityIds: EntityId[], deltaTime: number): void {
    for (const entityId of entityIds) {
      // Get the position and velocity components
      const position = entityManager.getComponent<PositionComponent>(entityId, 'position');
      const velocity = entityManager.getComponent<VelocityComponent>(entityId, 'velocity');

      if (position && velocity) {
        // Update the position based on velocity and delta time
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
        position.z += velocity.z * deltaTime;

        // Update the position component in the entity manager
        entityManager.updateComponent(entityId, position);
      }
    }
  }
}
