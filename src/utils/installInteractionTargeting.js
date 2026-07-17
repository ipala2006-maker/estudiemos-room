import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const TARGET_EVENT = 'estudiemos:interaction-target';
const PATCH_FLAG = '__estudiemosInteractionTargetingInstalled';
const AGENDA_PATCH_FLAG = '__estudiemosAgendaMoved';
const NEIGHBORHOOD_PATCH_FLAG = '__estudiemosNeighborhoodPolish';

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
  distance: 12.5,
  wallAssistZPadding: 8.8,
  proximityDistance: 11.75,
  proximityMaxX: 73.5,
  proximityFacingLimit: 0.34
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
      patchNeighborhood(scene);
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
  const proximityHit = getAgendaProximityHit(position, direction);

  return [movedHit, legacyHit, assistedHit, proximityHit].filter(Boolean).sort((a, b) => a.distance - b.distance)[0] ?? null;
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
  if (direction.x > AGENDA_TARGET.proximityFacingLimit) return null;

  const nearMovedZ = Math.abs(position.z - AGENDA_TARGET.center.z) <= AGENDA_TARGET.wallAssistZPadding;
  const nearLegacyZ = Math.abs(position.z - AGENDA_TARGET.legacyCenter.z) <= AGENDA_TARGET.wallAssistZPadding;
  if (!nearMovedZ && !nearLegacyZ) return null;

  const distanceToWall = Math.max(0.35, position.x - AGENDA_TARGET.center.x);
  return { id: 'agenda', distance: distanceToWall };
}

function getAgendaProximityHit(position, direction) {
  if (position.x > AGENDA_TARGET.proximityMaxX || position.x < INTERIOR_BOUNDS.minX - 0.4) return null;
  if (direction.x > AGENDA_TARGET.proximityFacingLimit) return null;

  const distanceToMovedCenter = Math.hypot(position.x - AGENDA_TARGET.center.x, position.z - AGENDA_TARGET.center.z);
  const distanceToLegacyCenter = Math.hypot(position.x - AGENDA_TARGET.legacyCenter.x, position.z - AGENDA_TARGET.legacyCenter.z);
  const distanceToAgenda = Math.min(distanceToMovedCenter, distanceToLegacyCenter);
  if (distanceToAgenda > AGENDA_TARGET.proximityDistance) return null;

  const nearMovedZ = Math.abs(position.z - AGENDA_TARGET.center.z) <= AGENDA_TARGET.wallAssistZPadding;
  const nearLegacyZ = Math.abs(position.z - AGENDA_TARGET.legacyCenter.z) <= AGENDA_TARGET.wallAssistZPadding;
  if (!nearMovedZ && !nearLegacyZ) return null;

  return { id: 'agenda', distance: 0.18 + distanceToAgenda * 0.025 };
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

function patchNeighborhood(scene) {
  const state = scene.userData[NEIGHBORHOOD_PATCH_FLAG] ?? {
    signsAdded: false,
    leftHouseMoved: false,
    rightHouseMoved: false
  };
  scene.userData[NEIGHBORHOOD_PATCH_FLAG] = state;

  if (!state.signsAdded) {
    scene.add(createNeighborhoodSignGroup());
    state.signsAdded = true;
  }

  if (state.leftHouseMoved && state.rightHouseMoved) return;

  scene.traverse((object) => {
    if (!object?.name || !object.position) return;

    if (!state.leftHouseMoved && object.name === 'suburban-house-2') {
      object.position.set(-22.2, 0, -22.6);
      object.rotation.y = Math.PI;
      state.leftHouseMoved = true;
    }

    if (!state.rightHouseMoved && object.name === 'suburban-house-3') {
      object.position.set(22.2, 0, -22.6);
      object.rotation.y = Math.PI;
      state.rightHouseMoved = true;
    }
  });
}

function createNeighborhoodSignGroup() {
  const group = new THREE.Group();
  group.name = 'estudiemos-neighborhood-professional-signs';

  group.add(
    createProfessionalNeighborhoodSign({
      title: 'ESTUDIEMOS ROOM',
      subtitle: 'Casa 1 - modo enfoque',
      accent: '#d8c47e',
      position: [-7.5, 0, 6.1],
      rotationY: 0.24,
      width: 4.8,
      height: 1.58
    })
  );

  group.add(
    createProfessionalNeighborhoodSign({
      title: 'CASA 2',
      subtitle: 'Espacio futuro',
      accent: '#9fc1b0',
      position: [-18.8, 0, 1.8],
      rotationY: 0.2,
      width: 3.35,
      height: 1.12
    })
  );

  group.add(
    createProfessionalNeighborhoodSign({
      title: 'CASA 3',
      subtitle: 'Materiales',
      accent: '#b9c8df',
      position: [18.8, 0, 1.8],
      rotationY: -0.2,
      width: 3.35,
      height: 1.12
    })
  );

  return group;
}

function createProfessionalNeighborhoodSign({ title, subtitle, accent, position, rotationY, width, height }) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x151b1a,
    roughness: 0.62,
    metalness: 0.04
  });
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x56605a,
    roughness: 0.72,
    metalness: 0.02
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accent),
    roughness: 0.48,
    metalness: 0.02
  });

  const boardY = 1.35 + height / 2;
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, height + 0.16, 0.14), frameMaterial);
  back.position.set(0, boardY, 0);
  back.castShadow = true;
  group.add(back);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: createNeighborhoodSignTexture({ title, subtitle, accent }),
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide
    })
  );
  face.position.set(0, boardY, 0.082);
  face.castShadow = true;
  group.add(face);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, 0.08, 0.2), accentMaterial);
  topRail.position.set(0, boardY + height / 2 + 0.1, 0.035);
  group.add(topRail);

  [-width * 0.38, width * 0.38].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.48, 0.16), postMaterial);
    post.position.set(x, 0.74, -0.02);
    post.castShadow = true;
    group.add(post);
  });

  return group;
}

function createNeighborhoodSignTexture({ title, subtitle, accent }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#18211f');
  gradient.addColorStop(0.56, '#101817');
  gradient.addColorStop(1, '#070d0e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fillRect(44, 42, canvas.width - 88, canvas.height - 84);

  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 8;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  ctx.fillStyle = accent;
  ctx.fillRect(42, 42, canvas.width - 84, 14);
  ctx.fillRect(42, canvas.height - 72, 260, 10);

  ctx.fillStyle = '#fff8df';
  ctx.font = `900 ${title.length > 11 ? 86 : 106}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 16;
  ctx.fillText(title, 86, 226);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245,238,218,0.78)';
  ctx.font = '700 48px system-ui, sans-serif';
  ctx.fillText(subtitle, 90, 326);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(878, 130, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.beginPath();
  ctx.arc(912, 130, 18, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
