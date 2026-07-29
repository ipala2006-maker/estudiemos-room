import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  composeCameraRelativeDirection,
  updateHorizontalCameraBasis
} from './cameraMovement.js';

const EPSILON = 0.000001;

function assertVector(vector, expected) {
  assert.ok(Math.abs(vector.x - expected.x) < EPSILON, `x: ${vector.x}`);
  assert.ok(Math.abs(vector.y - expected.y) < EPSILON, `y: ${vector.y}`);
  assert.ok(Math.abs(vector.z - expected.z) < EPSILON, `z: ${vector.z}`);
}

function createMovementVectors(yaw = 0, pitch = 0) {
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, yaw, 0);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const direction = new THREE.Vector3();
  updateHorizontalCameraBasis(camera, forward, right);
  return { direction, forward, right };
}

test('forward follows the default camera direction', () => {
  const { direction, forward, right } = createMovementVectors();
  composeCameraRelativeDirection(forward, right, 0, 1, direction);
  assertVector(direction, { x: 0, y: 0, z: -1 });
});

test('forward follows a camera rotated 90 degrees', () => {
  const { direction, forward, right } = createMovementVectors(-Math.PI / 2);
  composeCameraRelativeDirection(forward, right, 0, 1, direction);
  assertVector(direction, { x: 1, y: 0, z: 0 });
});

test('camera pitch never changes player height', () => {
  const { direction, forward, right } = createMovementVectors(-0.8, 0.62);
  composeCameraRelativeDirection(forward, right, 0, 1, direction);
  assert.equal(direction.y, 0);
  assert.ok(Math.abs(direction.length() - 1) < EPSILON);
});

test('diagonal movement is not faster than straight movement', () => {
  const { direction, forward, right } = createMovementVectors(0.4, -0.3);
  composeCameraRelativeDirection(forward, right, 1, 1, direction);
  assert.ok(Math.abs(direction.length() - 1) < EPSILON);
});
