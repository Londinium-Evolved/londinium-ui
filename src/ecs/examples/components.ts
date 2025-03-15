import { Component } from '../types';

/**
 * Component for 3D position
 */
export class PositionComponent implements Component {
  readonly type = 'position';

  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for 3D rotation in radians
 */
export class RotationComponent implements Component {
  readonly type = 'rotation';

  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for 3D scale
 */
export class ScaleComponent implements Component {
  readonly type = 'scale';

  constructor(public x: number = 1, public y: number = 1, public z: number = 1) {}
}

/**
 * Component for 3D velocity
 */
export class VelocityComponent implements Component {
  readonly type = 'velocity';

  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for 3D model data
 */
export class ModelComponent implements Component {
  readonly type = 'model';

  constructor(public modelId: string = '', public visible: boolean = true) {}
}
