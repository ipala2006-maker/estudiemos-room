import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const TARGET_EVENT = 'estudiemos:interaction-target';
const PATCH_FLAG = '__estudiemosInteractionTargetingInstalled';
const AGENDA_PATCH_FLAG = '__estudiemosAgendaMoved';
const NEIGHBORHOOD_PATCH_FLAG = '__estudiemosVisibleNeighborhoodFix2318';

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
  center: new THREE.Vector3(62.4, 5.05, -21.65),
  width: 5.75,
  domWidth: 640,
  domHeight: 390,
  padding: 1.35,
  distance: 15,
  wallAssistZPadding: 9.6,
  proximityDistance: 13.5,
  proximityMaxX: 77,
  proximityFacingLimit: 0.65
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

  const exterior = scene.getObjectByName?.('estudiemos-room-exterior-neighborhood') ?? scene;

  if (!state.signsAdded) {
    exterior.add(createNeighborhoodSignGroup());
    state.signsAdded = true;
  }

  if (state.leftHouseMoved && state.rightHouseMoved) return;

  scene.traverse((object) => {
    if (!object?.name || !object.position) return;

    if (!state.leftHouseMoved && object.name === 'suburban-house-2') {
      object.position.set(-24, 0, -22);
      object.rotation.y = Math.PI;
      state.leftHouseMoved = true;
    }

    if (!state.rightHouseMoved && object.name === 'suburban-house-3') {
      object.position.set(24, 0, -22);
      object.rotation.y = Math.PI;
      state.rightHouseMoved = true;
    }
  });
}

function createNeighborhoodSignGroup() {
  const group = new THREE.Group();
  group.name = 'estudiemos-neighborhood-visible-signs-2318';

  group.add(
    createProfessionalSign({
      title: 'ESTUDIEMOS ROOM',
      subtitle: 'Casa 1 - modo enfoque',
      accent: '#e0c47a',
      position: [-8.1, 2.55, 6.15],
      rotationY: 0.24,
      width: 5.45,
      height: 1.82,
      postSpread: 4.2
    })
  );

  group.add(
    createProfessionalSign({
      title: 'CASA 1',
      subtitle: 'Computadora + pantalla',
      accent: '#9fc1b0',
      position: [6.2, 1.78, -12.4],
      rotationY: -0.26,
      width: 2.9,
      height: 1.18,
      postSpread: 0
    })
  );

  group.add(
    createProfessionalSign({
      title: 'CASA 2',
      subtitle: 'Proximamente',
      accent: '#b9c8df',
      position: [-20.8, 1.85, -7.4],
      rotationY: 0.18,
      width: 2.9,
      height: 1.18,
      postSpread: 1.8
    })
  );

  group.add(
    createProfessionalSign({
      title: 'CASA 3',
      subtitle: 'Materiales',
      accent: '#d8c47e',
      position: [20.8, 1.85, -7.4],
      rotationY: -0.18,
      width: 2.9,
      height: 1.18,
      postSpread: 1.8
    })
  );

  return group;
}

function createProfessionalSign({ title, subtitle, accent, position, rotationY, width, height, postSpread }) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;

  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x111817 });
  const postMaterial = new THREE.MeshBasicMaterial({ color: 0x48554f });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) });

  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, height + 0.16, 0.16), frameMaterial);
  back.castShadow = true;
  group.add(back);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: createSignTexture({ title, subtitle, accent }),
      side: THREE.DoubleSide
    })
  );
  face.position.z = 0.09;
  group.add(face);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.32, 0.08, 0.22), accentMaterial);
  rail.position.set(0, height / 2 + 0.1, 0.02);
  group.add(rail);

  const postOffsets = postSpread > 0 ? [-postSpread / 2, postSpread / 2] : [0];
  postOffsets.forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, position[1] * 1.55, 0.16), postMaterial);
    post.position.set(x, -position[1] * 0.5, -0.05);
    post.castShadow = true;
    group.add(post);
  });

  return group;
}

function createSignTexture({ title, subtitle, accent }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#18211f');
  gradient.addColorStop(0.62, '#101817');
  gradient.addColorStop(1, '#070d0e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 8;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  ctx.fillStyle = accent;
  ctx.fillRect(42, 42, canvas.width - 84, 14);
  ctx.fillRect(82, canvas.height - 68, 245, 10);

  ctx.fillStyle = '#fff8df';
  ctx.font = `900 ${title.length > 11 ? 72 : 92}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.fillText(title, 82, 170);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245,238,218,0.82)';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.fillText(subtitle, 86, 250);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(870, 105, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(900, 105, 15, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
