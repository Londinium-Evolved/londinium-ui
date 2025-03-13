# Entity Component System (ECS) for Londinium

This module implements an Entity Component System (ECS) architecture for the Londinium project. ECS is a software architectural pattern commonly used in game development that focuses on composition over inheritance.

## Core Concepts

### Entities

Entities are simple identifiers (numbers) that represent game objects. They don't contain any data or behavior themselves, but serve as containers for components.

### Components

Components are pure data containers that represent specific aspects of an entity. For example, a `PositionComponent` might store the x, y, and z coordinates of an entity in 3D space.

### Systems

Systems contain the logic that operates on entities with specific components. For example, a `MovementSystem` might update the positions of entities based on their velocities.

## Key Features

- **MobX Integration**: The ECS is integrated with MobX for reactive state management
- **Efficient Entity Queries**: Fast filtering of entities based on component combinations
- **Event System**: Events for entity and component lifecycle changes
- **System Priorities**: Systems can be prioritized to control execution order
- **TypeScript Support**: Full TypeScript support with generics for type safety

## Usage

### Creating Components

Components are simple classes decorated with the `@component` decorator:

```typescript
import { component } from '../ecs';

@component('position')
export class PositionComponent {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}
```

### Creating Systems

Systems extend the `System` base class and implement the `process` method:

```typescript
import { System, EntityManager, EntityId, SystemPriority } from '../ecs';

export class MovementSystem extends System {
  constructor() {
    super(
      {
        all: ['position', 'velocity'], // This system processes entities with both components
      },
      SystemPriority.NORMAL
    );
  }

  process(entityManager: EntityManager, entityIds: EntityId[], deltaTime: number): void {
    for (const entityId of entityIds) {
      const position = entityManager.getComponent(entityId, 'position');
      const velocity = entityManager.getComponent(entityId, 'velocity');

      if (position && velocity) {
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
        position.z += velocity.z * deltaTime;

        entityManager.updateComponent(entityId, position);
      }
    }
  }
}
```

### Setting Up the ECS

```typescript
import { EntityManager, SystemManager } from '../ecs';
import { PositionComponent, VelocityComponent } from './components';
import { MovementSystem } from './systems';

// Create managers
const entityManager = new EntityManager();
const systemManager = new SystemManager(entityManager);

// Register systems
systemManager.registerSystem(new MovementSystem());

// Create an entity
const entityId = entityManager.createEntity();

// Add components to the entity
entityManager.addComponent(entityId, new PositionComponent(0, 0, 0));
entityManager.addComponent(entityId, new VelocityComponent(1, 0, 0));

// Update systems (typically called in a game loop)
const deltaTime = 1 / 60; // 60 FPS
systemManager.update(deltaTime);
```

## Component Queries

Systems can filter entities based on component combinations:

- `all`: Entities must have ALL of these components
- `any`: Entities must have AT LEAST ONE of these components
- `none`: Entities must have NONE of these components

```typescript
// Example query: Entities with position AND velocity, but NOT static
const query = {
  all: ['position', 'velocity'],
  none: ['static'],
};
```

## Event System

The ECS includes an event system for entity and component lifecycle events:

```typescript
// Listen for component added events
entityManager.addEventListener(EntityEventType.COMPONENT_ADDED, (event) => {
  console.log(`Component ${event.componentType} added to entity ${event.entityId}`);
});
```

## Integration with Three.js

This ECS is designed to work well with Three.js for 3D rendering. Systems can be created to synchronize ECS state with Three.js objects.

## Performance Considerations

- The ECS is optimized for efficient entity queries
- Systems are sorted by priority for deterministic execution order
- Component access is O(1) for fast lookups
- Entity queries use set operations for optimal performance
