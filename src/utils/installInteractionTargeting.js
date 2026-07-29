import * as THREE from 'three';

const TARGET_EVENT = 'estudiemos:interaction-target';
const PATCH_FLAG = '__estudiemosInteractionTargetingInstalled';
const AGENDA_PATCH_FLAG = '__estudiemosAgendaMoved';
const NEIGHBORHOOD_PATCH_FLAG = '__estudiemosVisibleNeighborhoodFix1349CleanSigns';
const CANVAS_FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';

function canvasFont(weight, size) {
  return `${weight} ${size}px ${CANVAS_FONT_STACK}`;
}

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
  center: new THREE.Vector3(90, 5.7, 22.62),
  localCenter: new THREE.Vector3(0, 5.7, 28.62),
  width: 12.4,
  domWidth: 980,
  domHeight: 560,
  padding: 1.35,
  distance: 14,
  rotationY: Math.PI,
  physicalBoardScale: new THREE.Vector3(8.2, 5.35, 1),
  physicalFrameScale: 3.15
};

const ROOM_SPEAKER_TARGET = {
  center: new THREE.Vector3(65.4, 3.35, -29.55),
  radius: 2.1,
  distance: 9.5
};

const LEGACY_SHOP_TARGET = {
  center: new THREE.Vector3(116.15, 1.55, -17.5),
  radius: 2.75,
  distance: 10.5
};
const BUILDING_SHOP_TARGET = {
  center: new THREE.Vector3(101.55, -8.45, 34.6),
  radius: 3.1,
  distance: 11.5
};

const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minY: -1,
  maxY: 18,
  minZ: -36,
  maxZ: 23
};
const LOBBY_BOUNDS = {
  minX: 70.1,
  maxX: 104.5,
  minY: -10.8,
  maxY: -3.2,
  minZ: 13.5,
  maxZ: 49.9
};

const directionScratch = new THREE.Vector3();
let lastTarget = undefined;
let lastWorldScene = null;
let lastWorldCamera = null;

export function installInteractionTargeting() {
  if (typeof window === 'undefined' || window[PATCH_FLAG]) return;
  window[PATCH_FLAG] = true;
  document.documentElement.dataset.estudiemosInteractionTargeting = '2410-shop-corner-target';
}

export function ensureInteractionTargetingInScene(scene, cssScene) {
  if (!isWorldScene(scene)) return;
  if (scene !== lastWorldScene) {
    lastTarget = undefined;
    lastWorldScene = scene;
  }
  patchPhysicalAgenda(scene);
  patchNeighborhood(scene);
  if (cssScene?.isScene) patchCssAgenda(cssScene);
}

export function updateInteractionTargeting(scene, camera) {
  if (!isWorldScene(scene) || !camera?.isCamera) return;
  if (scene !== lastWorldScene) {
    lastTarget = undefined;
    lastWorldScene = scene;
  }
  lastWorldCamera = camera;
  refreshInteractionRuntime();
}

function isWorldScene(scene) {
  return Boolean(scene?.isScene && (scene.userData?.performancePass || scene.getObjectByName?.('estudiemos-room-exterior-neighborhood')));
}

function refreshInteractionRuntime() {
  if (lastWorldScene) {
    patchPhysicalAgenda(lastWorldScene);
    patchNeighborhood(lastWorldScene);
  }

  if (lastWorldCamera?.isCamera) {
    publishInteractionTarget(lastWorldCamera);
  }
}

function publishInteractionTarget(camera) {
  const position = camera.position;
  const isStudyFloor = isInsideBounds(position, INTERIOR_BOUNDS);
  const isBuildingWorld = lastWorldScene?.userData?.worldMode !== 'legacy';
  const isLobby = isBuildingWorld && isInsideBounds(position, LOBBY_BOUNDS);
  const isInteractiveZone = isStudyFloor || isLobby;

  const target = isInteractiveZone ? getActiveTarget(camera, isLobby) : null;
  document.documentElement.dataset.estudiemosInteractionTarget = target ?? '';
  if (target === lastTarget) return;

  lastTarget = target;
  window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { target } }));
}

function getActiveTarget(camera, isLobby = false) {
  camera.getWorldDirection(directionScratch).normalize();
  const position = camera.position;
  const shopTarget = isLobby
    ? BUILDING_SHOP_TARGET
    : lastWorldScene?.userData?.worldMode === 'legacy'
      ? LEGACY_SHOP_TARGET
      : null;
  const candidates = [
    getSphereHit('computer', position, directionScratch, COMPUTER_TARGET),
    getAgendaHit(position, directionScratch),
    getSphereHit('speaker', position, directionScratch, ROOM_SPEAKER_TARGET),
    getSphereHit('shop', position, directionScratch, shopTarget),
    getScreenHit(position, directionScratch)
  ].filter(Boolean);

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.id ?? null;
}

function isInsideBounds(position, bounds) {
  return (
    position.x >= bounds.minX &&
    position.x <= bounds.maxX &&
    (bounds.minY === undefined || (position.y >= bounds.minY && position.y <= bounds.maxY)) &&
    position.z >= bounds.minZ &&
    position.z <= bounds.maxZ
  );
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
  return getAgendaZPlaneHit(position, direction, AGENDA_TARGET.center, AGENDA_TARGET.width, AGENDA_TARGET.distance);
}

function getAgendaZPlaneHit(position, direction, center, width, maxDistance) {
  if (Math.abs(direction.z) < 0.001) return null;

  const distance = (center.z - position.z) / direction.z;
  if (distance < 0.8 || distance > maxDistance) return null;

  const hitX = position.x + direction.x * distance;
  const hitY = position.y + direction.y * distance;
  const halfWidth = width / 2 + AGENDA_TARGET.padding;
  const halfHeight = (width * (AGENDA_TARGET.domHeight / AGENDA_TARGET.domWidth)) / 2 + AGENDA_TARGET.padding;

  const isInside =
    hitX >= center.x - halfWidth &&
    hitX <= center.x + halfWidth &&
    hitY >= center.y - halfHeight &&
    hitY <= center.y + halfHeight;

  return isInside ? { id: 'agenda', distance } : null;
}

function getSphereHit(id, position, direction, target) {
  if (!target) return null;
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
  if (scene.userData?.[AGENDA_PATCH_FLAG]) return;

  scene.traverse((object) => {
    if (!object?.position || object.userData?.[AGENDA_PATCH_FLAG]) return;
    if (!isOldAgendaPiece(object.position)) return;

    object.userData[AGENDA_PATCH_FLAG] = true;
    const localCenter = AGENDA_TARGET.localCenter;

    if (Math.abs(object.position.y - 6.95) < 0.16) {
      object.position.set(localCenter.x, localCenter.y + 2.78, localCenter.z - 0.06);
      object.rotation.y = Math.PI / 2;
      object.scale.z *= AGENDA_TARGET.physicalFrameScale;
      return;
    }

    if (Math.abs(object.position.y - 4.25) < 0.16) {
      object.position.set(localCenter.x, localCenter.y - 2.78, localCenter.z - 0.06);
      object.rotation.y = Math.PI / 2;
      object.scale.z *= AGENDA_TARGET.physicalFrameScale;
      return;
    }

    if (object.scale.x > 2.5 && object.scale.y > 2) {
      object.position.copy(localCenter);
      object.rotation.y = AGENDA_TARGET.rotationY;
      object.scale.copy(AGENDA_TARGET.physicalBoardScale);
      return;
    }

    object.visible = false;
  });
  scene.userData[AGENDA_PATCH_FLAG] = true;
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
  if (scene.userData?.[AGENDA_PATCH_FLAG]) return;

  scene.traverse((object) => {
    if (!object?.element?.classList?.contains('css-agenda-board') || object.userData?.[AGENDA_PATCH_FLAG]) return;

    object.userData[AGENDA_PATCH_FLAG] = true;
    object.element.style.width = `${AGENDA_TARGET.domWidth}px`;
    object.element.style.height = `${AGENDA_TARGET.domHeight}px`;
    object.position.copy(AGENDA_TARGET.center);
    object.rotation.y = AGENDA_TARGET.rotationY;
    object.scale.setScalar(AGENDA_TARGET.width / AGENDA_TARGET.domWidth);
  });
  scene.userData[AGENDA_PATCH_FLAG] = true;
}

function patchNeighborhood(scene) {
  if (scene.userData?.worldMode !== 'legacy') return;
  document.documentElement.dataset.estudiemosNeighborhoodPatch = 'ran';
  const state = scene.userData[NEIGHBORHOOD_PATCH_FLAG] ?? {
    cleaned: false,
    signsAdded: false,
    leftHouseMoved: false,
    rightHouseMoved: false,
    complete: false
  };
  scene.userData[NEIGHBORHOOD_PATCH_FLAG] = state;
  if (state.complete) return;

  const exterior = scene.getObjectByName?.('estudiemos-room-exterior-neighborhood');
  if (!exterior) return;

  if (!state.cleaned) {
    removeStrayNeighborhoodSigns(scene, exterior);
    hideLegacyNeighborhoodSigns(exterior);
    state.cleaned = true;
  }

  if (!state.signsAdded) {
    state.signsAdded = true;
    exterior.add(createNeighborhoodSignGroup());
  }

  if (state.leftHouseMoved && state.rightHouseMoved) {
    state.complete = true;
    return;
  }

  scene.traverse((object) => {
    if (!object?.name || !object.position) return;

    if (!state.leftHouseMoved && object.name === 'suburban-house-2') {
      object.position.set(-35, 0, -25);
      object.rotation.y = Math.PI;
      state.leftHouseMoved = true;
    }

    if (!state.rightHouseMoved && object.name === 'suburban-house-3') {
      object.position.set(35, 0, -25);
      object.rotation.y = Math.PI;
      state.rightHouseMoved = true;
    }
  });

  state.complete = state.leftHouseMoved && state.rightHouseMoved;
}

function removeStrayNeighborhoodSigns(scene, exterior) {
  const staleGroups = [];
  scene.traverse((object) => {
    if (!object?.name?.startsWith?.('estudiemos-neighborhood-visible-signs')) return;
    if (exterior && object.parent === exterior && object.name === 'estudiemos-neighborhood-visible-signs-clean') return;
    staleGroups.push(object);
  });

  staleGroups.forEach((object) => {
    object.parent?.remove(object);
  });
}

function hideLegacyNeighborhoodSigns(exterior) {
  exterior.traverse((object) => {
    if (!object?.isMesh || !object.position) return;

    const nearMainSign =
      Math.abs(object.position.x + 7.2) < 3.4 &&
      Math.abs(object.position.z - 5.35) < 2.2 &&
      object.position.y > 0.4 &&
      object.position.y < 3.6;
    const nearCasa1Marker =
      Math.abs(object.position.x - 5.7) < 1.8 &&
      Math.abs(object.position.z + 12.8) < 1.8 &&
      object.position.y > 0.4 &&
      object.position.y < 2.5;

    if (nearMainSign || nearCasa1Marker) {
      object.visible = false;
    }
  });
}

function createNeighborhoodSignGroup() {
  const group = new THREE.Group();
  group.name = 'estudiemos-neighborhood-visible-signs-clean';

  group.add(
    createProfessionalSign({
      title: 'CASA 1',
      subtitle: 'Modo enfoque',
      accent: '#e0c47a',
      position: [-8.2, 2.16, 6.35],
      rotationY: 0.24,
      width: 4.85,
      height: 1.68,
      postSpread: 3.3
    })
  );

  group.add(
    createProfessionalSign({
      title: 'CASA 2',
      subtitle: 'Proximamente',
      accent: '#b9c8df',
      position: [-24, 1.85, -7.6],
      rotationY: 0.18,
      width: 3.2,
      height: 1.22,
      postSpread: 1.8
    })
  );

  group.add(
    createProfessionalSign({
      title: 'CASA 3',
      subtitle: 'Materiales',
      accent: '#d8c47e',
      position: [24, 1.85, -7.6],
      rotationY: -0.18,
      width: 3.2,
      height: 1.22,
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
  face.position.z = 0.18;
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
  canvas.width = 1280;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#22302b');
  gradient.addColorStop(0.58, '#121c1a');
  gradient.addColorStop(1, '#090f10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fillRect(58, 58, canvas.width - 116, canvas.height - 116);

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 10;
  ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

  ctx.fillStyle = accent;
  ctx.fillRect(54, 54, canvas.width - 108, 18);
  ctx.fillRect(92, canvas.height - 92, 330, 14);

  ctx.fillStyle = '#fff8df';
  ctx.font = canvasFont(900, title.length > 6 ? 132 : 178);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText(title, 92, 226);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245,238,218,0.88)';
  ctx.font = canvasFont(800, 72);
  ctx.fillText(subtitle, 98, 346);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(1110, 142, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(1152, 142, 21, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
