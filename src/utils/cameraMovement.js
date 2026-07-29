import * as THREE from 'three';

const MIN_HORIZONTAL_LENGTH = 0.000001;

export function updateHorizontalCameraBasis(camera, forward, right) {
  camera.getWorldDirection(forward);
  forward.y = 0;

  if (forward.lengthSq() < MIN_HORIZONTAL_LENGTH) {
    forward.set(0, 0, -1).applyAxisAngle(camera.up, camera.rotation.y);
    forward.y = 0;
  }

  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  return { forward, right };
}

export function composeCameraRelativeDirection(
  forward,
  right,
  inputHorizontal,
  inputVertical,
  target = new THREE.Vector3()
) {
  target.set(0, 0, 0);
  target.addScaledVector(forward, inputVertical);
  target.addScaledVector(right, inputHorizontal);

  if (target.lengthSq() > 1) {
    target.normalize();
  }

  target.y = 0;
  return target;
}
