import * as THREE from 'three';

const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const ROOM_SPEAKER_LOCAL = new THREE.Vector3(-5.5, 0, -19.5);
const ROOM_SPEAKER_WORLD = new THREE.Vector3(
  ROOM_GROUP_POSITION.x + ROOM_SPEAKER_LOCAL.x,
  2.9,
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

const aimDirection = new THREE.Vector3();
const flatAimDirection = new THREE.Vector3();
const toSpeaker = new THREE.Vector3();

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
  speaker.name = 'spotify-room-speaker-visible-prop';
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

function findCasaRoom(scene) {
  let room = null;
  scene?.traverse?.((child) => {
    if (room || !child?.isGroup) return;
    if (
      Math.abs(child.position.x - ROOM_GROUP_POSITION.x) < 0.05 &&
      Math.abs(child.position.z - ROOM_GROUP_POSITION.z) < 0.05
    ) {
      room = child;
    }
  });
  return room;
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

  const originalRender = THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render = function renderWithRoomSpeaker(scene, camera) {
    const room = findCasaRoom(scene);
    if (room) addRoomSpeaker(room);
    updateSpeakerAim(camera);
    return originalRender.call(this, scene, camera);
  };
}

installRoomSpeakerWorld();
