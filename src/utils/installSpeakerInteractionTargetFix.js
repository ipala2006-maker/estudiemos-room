import * as THREE from 'three';

const INSTALL_FLAG = '__estudiemosSpeakerInteractionTargetFixInstalled';
const TARGET_EVENT = 'estudiemos:interaction-target';
const OVERRIDE_SOURCE = 'speaker-target-fix';
const SPEAKER_CENTER = new THREE.Vector3(65.4, 3.35, -29.55);
const SPEAKER_RADIUS = 3.85;
const SPEAKER_MAX_DISTANCE = 34;
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};

const direction = new THREE.Vector3();
let baseEventSerial = 0;
let lastSpeakerBaseSerial = -1;
let lastBaseTarget = null;
let overrideActive = false;

export function installSpeakerInteractionTargetFix() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;
  document.documentElement.dataset.estudiemosSpeakerInteractionFix = '0002';

  window.addEventListener(
    TARGET_EVENT,
    (event) => {
      if (event.detail?.source === OVERRIDE_SOURCE) return;
      baseEventSerial += 1;
      lastBaseTarget = event.detail?.target ?? null;
    },
    true
  );

  patchCameraUpdates();
}

function patchCameraUpdates() {
  if (THREE.Camera.prototype.__estudiemosSpeakerInteractionFixHooked) return;
  THREE.Camera.prototype.__estudiemosSpeakerInteractionFixHooked = true;

  const originalUpdateMatrixWorld = THREE.Camera.prototype.updateMatrixWorld;
  THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorldWithSpeakerTargetFix(...args) {
    const result = originalUpdateMatrixWorld.apply(this, args);
    updateSpeakerTargetOverride(this);
    return result;
  };
}

function updateSpeakerTargetOverride(camera) {
  if (!camera?.isCamera || !isInsideRoom(camera)) {
    releaseSpeakerOverride();
    return;
  }

  camera.getWorldDirection(direction).normalize();
  const hitDistance = getRaySphereHitDistance(camera.position, direction, SPEAKER_CENTER, SPEAKER_RADIUS);
  const isAimingSpeaker = hitDistance != null && hitDistance <= SPEAKER_MAX_DISTANCE;

  if (isAimingSpeaker) {
    if (!overrideActive || lastSpeakerBaseSerial !== baseEventSerial) {
      overrideActive = true;
      lastSpeakerBaseSerial = baseEventSerial;
      dispatchTarget('speaker');
    }
    return;
  }

  releaseSpeakerOverride();
}

function releaseSpeakerOverride() {
  if (!overrideActive) return;
  overrideActive = false;
  dispatchTarget(lastBaseTarget === 'speaker' ? null : lastBaseTarget);
}

function dispatchTarget(target) {
  window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { target, source: OVERRIDE_SOURCE } }));
}

function isInsideRoom(camera) {
  const { x, z } = camera.position;
  return x >= INTERIOR_BOUNDS.minX && x <= INTERIOR_BOUNDS.maxX && z >= INTERIOR_BOUNDS.minZ && z <= INTERIOR_BOUNDS.maxZ;
}

function getRaySphereHitDistance(origin, rayDirection, center, radius) {
  const toCenterX = center.x - origin.x;
  const toCenterY = center.y - origin.y;
  const toCenterZ = center.z - origin.z;
  const projected = toCenterX * rayDirection.x + toCenterY * rayDirection.y + toCenterZ * rayDirection.z;
  if (projected < 0) return null;

  const centerDistanceSq = toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ;
  const closestDistanceSq = centerDistanceSq - projected * projected;
  const radiusSq = radius * radius;
  if (closestDistanceSq > radiusSq) return null;

  return Math.max(0, projected - Math.sqrt(radiusSq - closestDistanceSq));
}

installSpeakerInteractionTargetFix();
