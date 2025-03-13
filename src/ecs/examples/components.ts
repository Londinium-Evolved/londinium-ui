import { Component } from '../types';
import { component } from '../decorators';

/**
 * Component for position in 3D space
 */
@component('position')
export class PositionComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for rotation in 3D space (Euler angles in radians)
 */
@component('rotation')
export class RotationComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for scale in 3D space
 */
@component('scale')
export class ScaleComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(public x: number = 1, public y: number = 1, public z: number = 1) {}
}

/**
 * Component for velocity in 3D space
 */
@component('velocity')
export class VelocityComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
}

/**
 * Component for a 3D model
 */
@component('model')
export class ModelComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(public modelId: string, public visible: boolean = true) {}
}

/**
 * Component for a light source
 */
@component('light')
export class LightComponent implements Component {
  readonly type!: string; // Will be set by decorator
  constructor(
    public lightType: 'ambient' | 'directional' | 'point' | 'spot',
    public color: string = '#ffffff',
    public intensity: number = 1,
    public range: number = 10
  ) {}
}
