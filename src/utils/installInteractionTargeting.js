import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const TARGET_EVENT = 'estudiemos:interaction-target';
const PATCH_FLAG = '__estudiemosInteractionTargetingInstalled';
const AGENDA_PATCH_FLAG = '__estudiemosAgendaMoved';

const GIANT_SCREEN_WORLD = {
  center: new THREE.Vector3(90, 8.25, -34.25),
  width: 48,
  height: 13.5,
  padding: 2.4,
  distance: 44
};

const COMPUTER_TARGET = {
  center: new THREE.Vector3(78.6, 2.35, -14.6),
  radius: 2.55,
  distance: 6.25
};

const AGENDA_TARGET = {
  oldLocalCenter: new THREE.Vector3(-27.6, 5.6, -12.8),
  legacyCenter: new THREE.Vector3(62.4, 5.6, -18.8),
  center: new THREE.Vector3(62.32, 5.05, -21.65),
  width: 5.45,
  domWidth: 640,
  domHeight: 390,
  padding: 1.05,
  distance: 11.5,
  wallAssistZPadding: 5.8
};

const ROOM_SPEAKER_TARGET = {
  center: new THREE.Vector3(74, 2.8, -22.2),
  radius: 2.25,
  distance: 8.75
};

const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};

const directionScratch = new THREE.Vector3();
let lastTarget = undefined;

installInteractionTargeting();

function installInteractionTargeting() {
  if (typeof window === 'undefined' || window[PATCH_FLAG]) return;
  window[PATCH_FLAG] = true;

  patchWebGlRender();
  patchCss3dRender();
}

function patchWebGlRender() {
  const originalRender = THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render = function renderWithInteractionTarget(scene, camera, ...args) {
    if (scene?.userData?.performancePass && camera?.isCamera) {
      patchPhysicalAgenda(scene);
      publishInteractionTarget(camera);
    }

    return originalRender.call(this, scene, camera, ...args);
  };
}

function patchCss3dRender() {
  const originalRender = CSS3DRenderer.prototype.render;
  CSS3DRenderer.prototype.render = function renderWithAgendaPatch(scene, camera, ...args) {
    patchCssAgenda(scene);
    return originalRender.call(this, scene, camera, ...args);
  };
}

function publishInteractionTarget(camera) {
  const position = camera.position;
  const isInterior =
    position.x >= INTERIOR_BOUNDS.minX &&
    position.x <= INTERIOR_BOUNDS.maxX &&
    position.z >= INTERIOR_BOUNDS.minZ &&
    position.z <= INTERIOR_BOUNDS.maxZ;

  const target = isInterior ? getActiveTarget(camera) : null;
  if (target === lastTarget) return;

  lastTarget = target;
  window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { target } }));
}

function getActiveTarget(camera) {
  camera.getWorldDirection(directionScratch).normalize();
  const position = camera.position;
  const candidates = [
    getSphereHit('computer', position, directionScratch, COMPUTER_TARGET),
    getAgendaHit(position, directionScratch),
    getSphereHit('speaker', position, directionScratch, ROOM_SPEAKER_TARGET),
    getScreenHit(position, directionScratch)
  ].filter(Boolean);

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.id ?? null;
}

function getScreenHit(position, direction) {
  if (Math.abs(direction.z) < 0.001) return null;

  const distance = (GIANT_SCREEN_WORLD.center.z - position.z) / direction.z;
  if (distance < 1.5 || distance > GIANT_SCREEN_WORLD.distance) return null;

  const hitX = position.x + direction.x * distance;
  const hitY = position.y + direction.y * distance;
  const halfWidth = GIANT_SCREEN_WORLD.width / 2 + GIANT_SCREEN_WORLD.padding;
  const halfHeight = GIANT_SCREEN_WORLD.height / 2 + GIANT_SCREEN_WORLD.padding;

  const isInside =
    hitX >= GIANT_SCREEN_WORLD.center.x - halfWidth &&
    hitX <= GIANT_SCREEN_WORLD.center.x + halfWidth &&
    hitY >= GIANT_SCREEN_WORLD.center.y - halfHeight &&
    hitY <= GIANT_SCREEN_WORLD.center.y + halfHeight;

  return isInside ? { id: 'screen', distance } : null;
}

function getAgendaHit(position, direction) {
  const movedHit = getAgendaPlaneHit(position, direction, AGENDA_TARGET.center, AGENDA_TARGET.width, AGENDA_TARGET.distance);
  const legacyHit = getAgendaPlaneHit(position, direction, AGENDA_TARGET.legacyCenter, 4.8, AGENDA_TARGET.distance);
  const assistedHit = getAgendaWallAssistHit(position, direction);

  return [movedHit, legacyHit, assistedHit].filter(Boolean).sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function getAgendaPlaneHit(position, direction, center, width, maxDistance) {
  if (Math.abs(direction.x) < 0.001) return null;

  const distance = (center.x - position.x) / direction.x;
  if (distance < 0.25 || distance > maxDistance) return null;

  const hitY = position.y + direction.y * distance;
  const hitZ = position.z + direction.z * distance;
  const halfWidth = width / 2 + AGENDA_TARGET.padding;
  const halfHeight = (width * (AGENDA_TARGET.domHeight / AGENDA_TARGET.domWidth)) / 2 + AGENDA_TARGET.padding;

  const isInside =
    hitZ >= center.z - halfWidth &&
    hitZ <= center.z + halfWidth &&
    hitY >= center.y - halfHeight &&
    hitY <= center.y + halfHeight;

  return isInside ? { id: 'agenda', distance } : null;
}

function getAgendaWallAssistHit(position, direction) {
  const distanceToMovedCenter = Math.hypot(position.x - AGENDA_TARGET.center.x, position.z - AGENDA_TARGET.center.z);
  const distanceToLegacyCenter = Math.hypot(position.x - AGENDA_TARGET.legacyCenter.x, position.z - AGENDA_TARGET.legacyCenter.z);
  const distanceToAgenda = Math.min(distanceToMovedCenter, distanceToLegacyCenter);
  if (distanceToAgenda > AGENDA_TARGET.distance) return null;
  if (direction.x > -0.2) return null;

  const nearMovedZ = Math.abs(position.z - AGENDA_TARGET.center.z) <= AGENDA_TARGET.wallAssistZPadding;
  const nearLegacyZ = Math.abs(position.z - AGENDA_TARGET.legacyCenter.z) <= AGENDA_TARGET.wallAssistZPadding;
  if (!nearMovedZ && !nearLegacyZ) return null;

  const distanceToWall = Math.max(0.35, position.x - AGENDA_TARGET.center.x);
  return { id: 'agenda', distance: distanceToWall };
}

function getSphereHit(id, position, direction, target) {
  if (position.distanceTo(target.center) > target.distance) return null;

  const distance = getRaySphereHitDistance(position, direction, target.center, target.radius);
  if (distance == null || distance > target.distance) return null;

  return { id, distance };
}

function getRaySphereHitDistance(origin, direction, center, radius) {
  const toCenterX = center.x - origin.x;
  const toCenterY = center.y - origin.y;
  const toCenterZ = center.z - origin.z;
  const projected = toCenterX * direction.x + toCenterY * direction.y + toCenterZ * direction.z;
  if (projected < 0) return null;

  const centerDistanceSq = toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ;
  const closestDistanceSq = centerDistanceSq - projected * projected;
  const radiusSq = radius * radius;
  if (closestDistanceSq > radiusSq) return null;

  return Math.max(0, projected - Math.sqrt(radiusSq - closestDistanceSq));
}

function patchPhysicalAgenda(scene) {
  scene.traverse((object) => {
    if (!object?.position || object.userData?.[AGENDA_PATCH_FLAG]) return;
    if (!isOldAgendaPiece(object.position)) return;

    object.userData[AGENDA_PATCH_FLAG] = true;
    const localZ = AGENDA_TARGET.center.z + 6;

    if (Math.abs(object.position.y - 6.95) < 0.16) {
      object.position.set(-27.5, 6.78, localZ);
      object.scale.z *= 1.33;
      return;
    }

    if (Math.abs(object.position.y - 4.25) < 0.16) {
      object.position.set(-27.5, 3.32, localZ);
      object.scale.z *= 1.33;
      return;
    }

    object.position.set(object.position.x, 5.05, localZ);
    object.scale.y *= 1.3;
    object.scale.z *= 1.33;

    if (object.scale.x > 2.5 && object.scale.y > 2) {
      object.scale.set(4.35, 3.05, object.scale.z || 1);
    }
  });
}

function isOldAgendaPiece(position) {
  return (
    Math.abs(position.x - AGENDA_TARGET.oldLocalCenter.x) < 0.28 &&
    Math.abs(position.z - AGENDA_TARGET.oldLocalCenter.z) < 0.36 &&
    position.y > 4.0 &&
    position.y < 7.2
  );
}

function patchCssAgenda(scene) {
  scene.traverse((object) => {
    if (!object?.element?.classList?.contains('css-agenda-board') || object.userData?.[AGENDA_PATCH_FLAG]) return;

    object.userData[AGENDA_PATCH_FLAG] = true;
    object.element.style.width = `${AGENDA_TARGET.domWidth}px`;
    object.element.style.height = `${AGENDA_TARGET.domHeight}px`;
    object.position.copy(AGENDA_TARGET.center);
    object.scale.setScalar(AGENDA_TARGET.width / AGENDA_TARGET.domWidth);
  });
}
