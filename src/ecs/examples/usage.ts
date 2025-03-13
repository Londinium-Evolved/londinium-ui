import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import {
  LightComponent,
  ModelComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  VelocityComponent,
} from './components';
import { MovementSystem } from './systems';

/**
 * Example of how to use the ECS
 */
export function ecsExample(): void {
  // Create the entity manager
  const entityManager = new EntityManager();

  // Create the system manager
  const systemManager = new SystemManager(entityManager);

  // Register systems
  const movementSystem = new MovementSystem();
  systemManager.registerSystem(movementSystem);

  // Create entities

  // Player entity
  const playerId = entityManager.createEntity();
  entityManager.addComponent(playerId, new PositionComponent(0, 1, 0));
  entityManager.addComponent(playerId, new RotationComponent());
  entityManager.addComponent(playerId, new ScaleComponent(1, 1, 1));
  entityManager.addComponent(playerId, new VelocityComponent(0, 0, 1));
  entityManager.addComponent(playerId, new ModelComponent('player'));

  // Light entity
  const lightId = entityManager.createEntity();
  entityManager.addComponent(lightId, new PositionComponent(5, 5, 5));
  entityManager.addComponent(lightId, new LightComponent('point', '#ffffff', 1.5, 20));

  // Simulate game loop
  let time = 0;
  const deltaTime = 1 / 60; // 60 FPS

  // Run 10 frames of simulation
  for (let i = 0; i < 10; i++) {
    time += deltaTime;

    // Update all systems
    systemManager.update(deltaTime);

    // Get the player's position after update
    const playerPosition = entityManager.getComponent<PositionComponent>(playerId, 'position');

    console.log(`Frame ${i + 1}, Time: ${time.toFixed(2)}s, Player position:`, playerPosition);
  }
}
