import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const ROOM_SPEAKER_LOCAL = new THREE.Vector3(-25.35, 0, -22.8);
const ROOM_SPEAKER_WORLD = new THREE.Vector3(
  ROOM_GROUP_POSITION.x + ROOM_SPEAKER_LOCAL.x,
  2.35,
  ROOM_GROUP_POSITION.z + ROOM_SPEAKER_LOCAL.z
);
const SPEAKER_AIM_EVENT = 'estudiemos:room-speaker-aim';
const SPEAKER_INTERACTION_DISTANCE = 34;
const SPEAKER_AIM_DOT = 0.5;
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};
const SPEAKER_OBJECT_NAME = 'spotify-room-speaker-visible-prop';
const SPEAKER_ANCHOR_NAME = 'spotify-room-speaker-scene-anchor';
const SPEAKER_MODEL_NAME = 'estudiemos-blender-study-speaker';
const SPEAKER_MODEL_URL = `${import.meta.env.BASE_URL}models/custom/study-speaker.glb`;

const speakerLoader = new GLTFLoader();
const aimDirection = new THREE.Vector3();
const flatAimDirection = new THREE.Vector3();
const toSpeaker = new THREE.Vector3();
let speakerTemplatePromise = null;
let lastSpeakerScene = null;
let lastSpeakerCamera = null;

function prepareSpeakerModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (material.map) {
        material.map.anisotropy = 4;
        material.map.needsUpdate = true;
      }
      if ('envMapIntensity' in material) material.envMapIntensity = 0.72;
      material.needsUpdate = true;
    });
  });

  return root;
}

function loadSpeakerTemplate() {
  if (!speakerTemplatePromise) {
    speakerTemplatePromise = speakerLoader
      .loadAsync(SPEAKER_MODEL_URL)
      .then((gltf) => prepareSpeakerModel(gltf.scene));
  }
  return speakerTemplatePromise;
}

function markSceneShadowDirty(object) {
  let root = object;
  while (root?.parent) root = root.parent;
  if (root?.isScene) root.userData.architectureShadowDirty = true;
}

function addRoomSpeaker(room) {
  if (!room || room.userData.estudiemosRoomSpeakerInjected) {
    return room?.getObjectByName?.(SPEAKER_OBJECT_NAME) ?? null;
  }
  room.userData.estudiemosRoomSpeakerInjected = true;

  const speaker = new THREE.Group();
  speaker.name = SPEAKER_OBJECT_NAME;
  speaker.position.copy(ROOM_SPEAKER_LOCAL);
  speaker.userData.modelSource = SPEAKER_MODEL_URL;
  room.add(speaker);

  loadSpeakerTemplate()
    .then((template) => {
      if (!speaker.parent) return;
      const model = template.clone(true);
      model.name = SPEAKER_MODEL_NAME;
      speaker.add(model);
      speaker.userData.modelReady = true;
      markSceneShadowDirty(speaker);
    })
    .catch((error) => {
      speaker.userData.modelError = true;
      console.warn('No se pudo cargar el parlante Blender de Casa 1.', error);
    });

  const speakerLight = new THREE.PointLight(0x9dd8c8, 0.42, 7.5, 2.2);
  speakerLight.name = 'estudiemos-study-speaker-status-light';
  speakerLight.position.set(0, 3.7, 0.8);
  speaker.add(speakerLight);

  return speaker;
}

function addSceneRoomSpeaker(scene) {
  if (!scene || scene.userData.estudiemosSceneSpeakerInjected) return;
  scene.userData.estudiemosSceneSpeakerInjected = true;

  const anchor = new THREE.Group();
  anchor.name = SPEAKER_ANCHOR_NAME;
  anchor.position.set(ROOM_GROUP_POSITION.x, 0, ROOM_GROUP_POSITION.z);
  anchor.visible = false;
  scene.add(anchor);

  const speaker = addRoomSpeaker(anchor);
  scene.userData.estudiemosRoomSpeakerAnchor = anchor;
  scene.userData.estudiemosRoomSpeakerObject = speaker;
}

function findCasaRoom(scene) {
  let room = null;
  scene?.traverse?.((child) => {
    if (room || !child?.isGroup || child.name === SPEAKER_ANCHOR_NAME) return;
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

  camera.position.set(69.3, 2.8, -23.5);
  camera.lookAt(ROOM_SPEAKER_WORLD);
}

function updateSpeakerDebugHandle(scene, camera) {
  if (typeof window === 'undefined' || scene?.userData?.estudiemosSpeakerDebugReady) return;
  if (scene) scene.userData.estudiemosSpeakerDebugReady = true;

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
        modelReady: Boolean(speaker?.userData?.modelReady),
        modelError: Boolean(speaker?.userData?.modelError),
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
  const anchor = scene?.userData?.estudiemosRoomSpeakerAnchor ?? scene?.getObjectByName?.(SPEAKER_ANCHOR_NAME);
  if (!anchor) return;

  anchor.visible = Boolean(window.__estudiemosForceSpeakerView || (camera?.isCamera && isCameraInsideRoom(camera)));
}

function refreshSpeakerRuntime(scene = lastSpeakerScene, camera = lastSpeakerCamera, { ensure = false } = {}) {
  if (scene && ensure) addSceneRoomSpeaker(scene);

  if (scene && camera) {
    applySpeakerVerificationView(scene, camera);
    updateSpeakerSceneVisibility(scene, camera);
    updateSpeakerDebugHandle(scene, camera);
    updateSpeakerAim(camera);
  }
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

export function ensureRoomSpeakerInScene(scene) {
  if (!scene?.isScene) return null;
  lastSpeakerScene = scene;
  addSceneRoomSpeaker(scene);
  return scene.userData.estudiemosRoomSpeakerAnchor ?? null;
}

export function updateRoomSpeakerInScene(scene, camera) {
  if (!scene?.isScene || !camera?.isCamera) return;
  lastSpeakerScene = scene;
  lastSpeakerCamera = camera;
  refreshSpeakerRuntime(scene, camera);
}

function installRoomSpeakerWorld() {
  if (typeof window === 'undefined' || window.__estudiemosRoomSpeakerWorldInstalled) return;
  window.__estudiemosRoomSpeakerWorldInstalled = true;
  window.__estudiemosRoomSpeakerAimState = false;
  window.__estudiemosForceSpeakerView =
    new URLSearchParams(window.location.search).get('view') === 'speaker';
  window.__estudiemosRoomSpeakerInstallMode = 'blender-gltf-runtime';
}

installRoomSpeakerWorld();
