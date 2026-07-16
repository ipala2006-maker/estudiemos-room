import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const ROOM_SPEAKER_LOCAL = new THREE.Vector3(-24.6, 0, -24.2);
const ROOM_SPEAKER_WORLD = new THREE.Vector3(
  ROOM_GROUP_POSITION.x + ROOM_SPEAKER_LOCAL.x,
  2.9,
  ROOM_GROUP_POSITION.z + ROOM_SPEAKER_LOCAL.z
);
const ROOM_SPEAKER_OCCLUDER_WORLD = new THREE.Vector3(ROOM_SPEAKER_WORLD.x, 3.35, ROOM_SPEAKER_WORLD.z + 1.18);
const SPEAKER_AIM_EVENT = 'estudiemos:room-speaker-aim';
const SPEAKER_INTERACTION_DISTANCE = 34;
const SPEAKER_AIM_DOT = 0.5;
const SPEAKER_OCCLUDER_DOM_SIZE = {
  width: 520,
  height: 760
};
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};
const SPEAKER_OBJECT_NAME = 'spotify-room-speaker-visible-prop';
const SPEAKER_ANCHOR_NAME = 'spotify-room-speaker-scene-anchor';
const SPEAKER_OCCLUDER_NAME = 'spotify-room-speaker-css-occluder';
const SPEAKER_OCCLUDER_STYLE_ID = 'estudiemos-room-speaker-occluder-style';

const aimDirection = new THREE.Vector3();
const flatAimDirection = new THREE.Vector3();
const toSpeaker = new THREE.Vector3();
let lastSpeakerScene = null;
let lastSpeakerCamera = null;

function isCss3DObjectLike(object) {
  return Boolean(object?.isCSS3DObject || object?.element instanceof HTMLElement);
}

function ensureSpeakerOccluderStyles() {
  if (typeof document === 'undefined' || document.getElementById(SPEAKER_OCCLUDER_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = SPEAKER_OCCLUDER_STYLE_ID;
  style.textContent = `
    .room-speaker-css-occluder {
      width: ${SPEAKER_OCCLUDER_DOM_SIZE.width}px;
      height: ${SPEAKER_OCCLUDER_DOM_SIZE.height}px;
      box-sizing: border-box;
      display: grid;
      grid-template-rows: 76px minmax(0, 1fr) 50px;
      justify-items: center;
      align-items: end;
      pointer-events: none;
      transform-style: preserve-3d;
      backface-visibility: hidden;
      opacity: 1;
    }

    .room-speaker-css-occluder * {
      box-sizing: border-box;
    }

    .room-speaker-css-label {
      width: 360px;
      min-height: 58px;
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr);
      align-items: center;
      gap: 14px;
      padding: 8px 16px 8px 10px;
      border: 8px solid #080d0e;
      border-radius: 8px 8px 0 0;
      color: #f4fff4;
      background:
        linear-gradient(90deg, #1ed760, #102c1b 54%, #050908),
        #0a1011;
      box-shadow:
        inset 0 0 0 3px rgba(255, 255, 255, 0.16),
        0 12px 28px rgba(0, 0, 0, 0.4);
    }

    .room-speaker-css-label span {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: #06120b;
      background: #ecfff0;
      font: 900 25px/1 Arial, sans-serif;
    }

    .room-speaker-css-label strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 900 31px/1 Arial, sans-serif;
      letter-spacing: 0;
    }

    .room-speaker-css-cabinet {
      width: 390px;
      height: 590px;
      display: grid;
      place-items: center;
      padding: 42px 34px;
      border: 20px solid #070b0c;
      border-radius: 8px;
      background:
        linear-gradient(90deg, #080d0e, #172524 8%, #0b1112 22%, #0b1112 78%, #050809),
        #0b1112;
      box-shadow:
        inset 0 0 0 5px rgba(255, 255, 255, 0.035),
        inset 0 0 48px rgba(0, 0, 0, 0.72),
        0 28px 50px rgba(0, 0, 0, 0.42);
    }

    .room-speaker-css-grille {
      width: 100%;
      height: 100%;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 38px;
      border-radius: 4px;
      background:
        repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 10px),
        linear-gradient(180deg, #1ed760, #12aa4e 52%, #0c522a),
        #1ed760;
      box-shadow:
        inset 0 0 0 6px rgba(2, 8, 5, 0.26),
        inset 0 0 46px rgba(0, 0, 0, 0.24);
    }

    .room-speaker-css-driver {
      display: block;
      border-radius: 50%;
      border: 14px solid #d7c28a;
      background:
        radial-gradient(circle at 50% 48%, #020505 0 22%, #071010 23% 54%, #020303 55% 100%);
      box-shadow:
        inset 0 0 0 7px rgba(255, 255, 255, 0.035),
        0 10px 24px rgba(0, 0, 0, 0.32);
    }

    .room-speaker-css-driver:first-child {
      width: 116px;
      height: 116px;
    }

    .room-speaker-css-driver:nth-child(2) {
      width: 174px;
      height: 174px;
    }

    .room-speaker-css-driver:nth-child(3) {
      width: 128px;
      height: 128px;
    }

    .room-speaker-css-base {
      width: 470px;
      height: 42px;
      border-radius: 50% 50% 12px 12px;
      background:
        radial-gradient(ellipse at 50% 46%, rgba(30, 215, 96, 0.38), transparent 52%),
        linear-gradient(180deg, #172524, #080d0e);
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.42);
    }
  `;
  document.head.appendChild(style);
}

function createSpeakerOccluderElement() {
  ensureSpeakerOccluderStyles();

  const root = document.createElement('div');
  root.className = 'room-speaker-css-occluder';

  const label = document.createElement('div');
  label.className = 'room-speaker-css-label';
  const key = document.createElement('span');
  key.textContent = 'Q';
  const title = document.createElement('strong');
  title.textContent = 'PARLANTE';
  label.append(key, title);

  const cabinet = document.createElement('div');
  cabinet.className = 'room-speaker-css-cabinet';
  const grille = document.createElement('div');
  grille.className = 'room-speaker-css-grille';

  for (let index = 0; index < 3; index += 1) {
    const driver = document.createElement('i');
    driver.className = 'room-speaker-css-driver';
    grille.appendChild(driver);
  }

  cabinet.appendChild(grille);

  const base = document.createElement('div');
  base.className = 'room-speaker-css-base';
  root.append(label, cabinet, base);

  return root;
}

function addCssSpeakerOccluder(scene) {
  if (!scene || scene.userData.estudiemosSpeakerCssOccluderInjected || typeof document === 'undefined') return;
  scene.userData.estudiemosSpeakerCssOccluderInjected = true;

  const object = new CSS3DObject(createSpeakerOccluderElement());
  object.name = SPEAKER_OCCLUDER_NAME;
  object.position.copy(ROOM_SPEAKER_OCCLUDER_WORLD);
  object.scale.setScalar(4.7 / SPEAKER_OCCLUDER_DOM_SIZE.width);
  scene.add(object);
}

function makeStandardMaterial(color, roughness = 0.62, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeEmissiveMaterial(color, intensity = 0.75) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.24,
    metalness: 0.02
  });
}

function addBox(group, size, position, material, receivesShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = receivesShadow;
  group.add(mesh);
  return mesh;
}

function addDriver(group, radius, y, ringMaterial, grilleMaterial) {
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.095, 32), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, y, 0.78);
  ring.castShadow = true;
  group.add(ring);

  const cone = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.82, 0.13, 32), grilleMaterial);
  cone.rotation.x = Math.PI / 2;
  cone.position.set(0, y, 0.87);
  cone.castShadow = true;
  group.add(cone);
}

function createSpeakerLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1ed760');
  gradient.addColorStop(0.52, '#0f2b1c');
  gradient.addColorStop(1, '#050a09');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(245,255,247,0.72)';
  context.lineWidth = 6;
  context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  context.fillStyle = '#06120b';
  context.beginPath();
  context.arc(84, 90, 48, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#effff3';
  context.font = '900 44px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Q', 84, 90);

  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '900 48px Arial, sans-serif';
  context.fillText('PARLANTE', 158, 76);
  context.fillStyle = 'rgba(245,255,247,0.78)';
  context.font = '800 28px Arial, sans-serif';
  context.fillText('Spotify sala', 160, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(3.28, 0.92),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  label.name = 'spotify-room-speaker-control-label';
  label.position.set(0, 5.95, 0.88);
  return label;
}

function addSpeakerEdges(group) {
  group.traverse((child) => {
    if (!child?.isMesh || child.name.includes('spotify-room-speaker')) return;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(child.geometry, 25),
      new THREE.LineBasicMaterial({
        color: 0x030505,
        transparent: true,
        opacity: 0.08,
        depthWrite: false
      })
    );
    child.add(edges);
  });
}

function addRoomSpeaker(room) {
  if (!room || room.userData.estudiemosRoomSpeakerInjected) return;
  room.userData.estudiemosRoomSpeakerInjected = true;

  const speaker = new THREE.Group();
  speaker.name = SPEAKER_OBJECT_NAME;
  speaker.position.copy(ROOM_SPEAKER_LOCAL);

  const cabinetMaterial = makeStandardMaterial(0x0b1112, 0.62, 0.07);
  const sideMaterial = makeStandardMaterial(0x172524, 0.74, 0.03);
  const grilleMaterial = makeStandardMaterial(0x030607, 0.88, 0.02);
  const ringMaterial = makeStandardMaterial(0xd7c28a, 0.42, 0.12);
  const greenMaterial = makeEmissiveMaterial(0x1ed760, 1.1);
  const displayMaterial = makeEmissiveMaterial(0xb8ffd0, 0.72);
  const visiblePanelMaterial = new THREE.MeshBasicMaterial({ color: 0x1ed760 });

  addBox(speaker, [4.7, 0.36, 2.55], [0, 0.18, 0.08], sideMaterial, true);
  addBox(speaker, [3.75, 5.9, 1.55], [0, 3.02, 0], cabinetMaterial, true);
  addBox(speaker, [3.35, 5.15, 0.12], [0, 3.0, 0.86], grilleMaterial, true);
  addBox(speaker, [3.05, 4.55, 0.08], [0, 3.0, 0.94], visiblePanelMaterial, false);
  addBox(speaker, [1.36, 0.32, 0.18], [0, 5.72, 1.04], displayMaterial, false);

  addDriver(speaker, 0.52, 4.48, ringMaterial, grilleMaterial);
  addDriver(speaker, 0.86, 3.02, ringMaterial, grilleMaterial);
  addDriver(speaker, 0.58, 1.48, ringMaterial, grilleMaterial);

  for (let index = 0; index < 6; index += 1) {
    addBox(
      speaker,
      [0.11, 0.18 + index * 0.055, 0.08],
      [-0.68 + index * 0.27, 0.78 + index * 0.025, 0.84],
      greenMaterial,
      false
    );
  }

  const remoteBody = addBox(speaker, [0.75, 0.16, 1.08], [2.38, 1.05, 0.84], cabinetMaterial, true);
  remoteBody.rotation.z = -0.2;
  const remoteButton = addBox(speaker, [0.38, 0.055, 0.12], [2.38, 1.19, 1.1], greenMaterial, false);
  remoteButton.rotation.z = -0.2;

  const label = createSpeakerLabel();
  if (label) speaker.add(label);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.45, 36),
    new THREE.MeshBasicMaterial({
      color: 0x1ed760,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.02, 0.18);
  speaker.add(floorGlow);

  const speakerLight = new THREE.PointLight(0x1ed760, 1.55, 12.5, 2.1);
  speakerLight.position.set(0, 3.4, 1.05);
  speaker.add(speakerLight);

  addSpeakerEdges(speaker);
  room.add(speaker);
}

function addSceneRoomSpeaker(scene) {
  if (!scene || scene.userData.estudiemosSceneSpeakerInjected) return;
  scene.userData.estudiemosSceneSpeakerInjected = true;

  const anchor = new THREE.Group();
  anchor.name = SPEAKER_ANCHOR_NAME;
  anchor.position.set(ROOM_GROUP_POSITION.x, 0, ROOM_GROUP_POSITION.z);
  anchor.visible = false;
  scene.add(anchor);
  addRoomSpeaker(anchor);
}

function findCasaRoom(scene) {
  let room = null;
  scene?.traverse?.((child) => {
    if (room || !child?.isGroup) return;
    if (child.name === SPEAKER_ANCHOR_NAME) return;
    if (
      Math.abs(child.position.x - ROOM_GROUP_POSITION.x) < 0.05 &&
      Math.abs(child.position.z - ROOM_GROUP_POSITION.z) < 0.05
    ) {
      room = child;
    }
  });
  return room;
}

function applySpeakerVerificationView(scene, camera) {
  if (!window.__estudiemosForceSpeakerView || !camera?.isCamera) return;

  const room = findCasaRoom(scene);
  if (room) room.visible = true;

  camera.position.set(79, 3.15, -8.5);
  camera.lookAt(ROOM_SPEAKER_WORLD.x, 3.1, ROOM_SPEAKER_WORLD.z);
}

function updateSpeakerDebugHandle(scene, camera) {
  if (typeof window === 'undefined') return;

  window.__estudiemosRoomSpeakerDebug = {
    hasSpeaker: Boolean(scene?.getObjectByName?.(SPEAKER_OBJECT_NAME)),
    forceSpeakerView(enabled = true) {
      window.__estudiemosForceSpeakerView = Boolean(enabled);
    },
    getState() {
      const speaker = scene?.getObjectByName?.(SPEAKER_OBJECT_NAME);
      const anchor = scene?.getObjectByName?.(SPEAKER_ANCHOR_NAME);
      return {
        hasSpeaker: Boolean(speaker),
        speakerVisible: Boolean(speaker && speaker.visible && (!anchor || anchor.visible)),
        speakerWorldPosition: speaker
          ? {
              x: Number(speaker.getWorldPosition(new THREE.Vector3()).x.toFixed(2)),
              y: Number(speaker.getWorldPosition(new THREE.Vector3()).y.toFixed(2)),
              z: Number(speaker.getWorldPosition(new THREE.Vector3()).z.toFixed(2))
            }
          : null,
        cameraPosition: camera?.position
          ? {
              x: Number(camera.position.x.toFixed(2)),
              y: Number(camera.position.y.toFixed(2)),
              z: Number(camera.position.z.toFixed(2))
            }
          : null
      };
    }
  };
}

function updateSpeakerSceneVisibility(scene, camera) {
  const anchor = scene?.getObjectByName?.(SPEAKER_ANCHOR_NAME);
  if (!anchor) return;

  anchor.visible = Boolean(window.__estudiemosForceSpeakerView || (camera?.isCamera && isCameraInsideRoom(camera)));
}

function refreshSpeakerRuntime(scene = lastSpeakerScene, camera = lastSpeakerCamera) {
  if (scene) {
    addSceneRoomSpeaker(scene);
  }

  if (scene && camera) {
    applySpeakerVerificationView(scene, camera);
    updateSpeakerSceneVisibility(scene, camera);
    updateSpeakerDebugHandle(scene, camera);
    updateSpeakerAim(camera);
  }
}

function installSceneAddHook() {
  if (THREE.Object3D.prototype.__estudiemosSpeakerAddHooked) return;
  THREE.Object3D.prototype.__estudiemosSpeakerAddHooked = true;

  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function addWithRoomSpeaker(...objects) {
    const result = originalAdd.apply(this, objects);

    if (this?.isScene) {
      if (objects.some(isCss3DObjectLike)) {
        addCssSpeakerOccluder(this);
        return result;
      }

      lastSpeakerScene = this;
      objects.forEach((object) => {
        if (object?.isCamera) {
          lastSpeakerCamera = object;
        }
      });
      refreshSpeakerRuntime(this, lastSpeakerCamera);
    }

    return result;
  };
}

function installCameraUpdateHook() {
  if (THREE.Camera.prototype.__estudiemosSpeakerCameraHooked) return;
  THREE.Camera.prototype.__estudiemosSpeakerCameraHooked = true;

  const originalUpdateMatrixWorld = THREE.Camera.prototype.updateMatrixWorld;
  THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorldWithRoomSpeaker(...args) {
    lastSpeakerCamera = this;
    refreshSpeakerRuntime(lastSpeakerScene, this);
    return originalUpdateMatrixWorld.apply(this, args);
  };
}

function dispatchSpeakerAim(isAiming) {
  if (window.__estudiemosRoomSpeakerAimState === isAiming) return;
  window.__estudiemosRoomSpeakerAimState = isAiming;
  window.dispatchEvent(new CustomEvent(SPEAKER_AIM_EVENT, { detail: { isAiming } }));
}

function isCameraInsideRoom(camera) {
  const { x, z } = camera.position;
  return x >= INTERIOR_BOUNDS.minX && x <= INTERIOR_BOUNDS.maxX && z >= INTERIOR_BOUNDS.minZ && z <= INTERIOR_BOUNDS.maxZ;
}

function updateSpeakerAim(camera) {
  if (typeof window === 'undefined' || !camera?.isCamera || !isCameraInsideRoom(camera)) {
    dispatchSpeakerAim(false);
    return;
  }

  camera.getWorldDirection(aimDirection);
  flatAimDirection.set(aimDirection.x, 0, aimDirection.z);
  if (flatAimDirection.lengthSq() < 0.001) {
    dispatchSpeakerAim(false);
    return;
  }

  toSpeaker.copy(ROOM_SPEAKER_WORLD).sub(camera.position);
  toSpeaker.y = 0;
  const distance = toSpeaker.length();
  if (distance < 1.4 || distance > SPEAKER_INTERACTION_DISTANCE) {
    dispatchSpeakerAim(false);
    return;
  }

  const aimDot = toSpeaker.normalize().dot(flatAimDirection.normalize());
  dispatchSpeakerAim(aimDot > SPEAKER_AIM_DOT || distance < 5.2);
}

function installRoomSpeakerWorld() {
  if (typeof window === 'undefined' || window.__estudiemosRoomSpeakerWorldInstalled) return;
  window.__estudiemosRoomSpeakerWorldInstalled = true;
  window.__estudiemosRoomSpeakerAimState = false;
  window.__estudiemosRoomSpeakerInstallMode = 'object3d-camera';
  installSceneAddHook();
  installCameraUpdateHook();
}

installRoomSpeakerWorld();
