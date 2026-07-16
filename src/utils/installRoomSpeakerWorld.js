import * as THREE from 'three';

const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const ROOM_SPEAKER_LOCAL = new THREE.Vector3(6.2, 0, -23.2);
const ROOM_SPEAKER_WORLD = new THREE.Vector3(
  ROOM_GROUP_POSITION.x + ROOM_SPEAKER_LOCAL.x,
  2.9,
  ROOM_GROUP_POSITION.z + ROOM_SPEAKER_LOCAL.z
);
const SPEAKER_AIM_EVENT = 'estudiemos:room-speaker-aim';
const SPEAKER_INTERACTION_DISTANCE = 28;
const SPEAKER_AIM_DOT = 0.76;
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};

const aimDirection = new THREE.Vector3();
const flatAimDirection = new THREE.Vector3();
const toSpeaker = new THREE.Vector3();

function makeStandardMaterial(color, roughness = 0.58, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeEmissiveMaterial(color, intensity = 0.5) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.36,
    metalness: 0.05
  });
}

function createSpeakerLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const drawRoundedRect = (x, y, width, height, radius) => {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  };

  const gradient = context.createLinearGradient(0, 0, 512, 180);
  gradient.addColorStop(0, 'rgba(30, 215, 96, 0.96)');
  gradient.addColorStop(1, 'rgba(6, 18, 15, 0.92)');
  context.fillStyle = gradient;
  drawRoundedRect(10, 10, 492, 160, 34);
  context.fill();
  context.strokeStyle = 'rgba(236, 255, 242, 0.72)';
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = '#062012';
  context.beginPath();
  context.arc(74, 90, 40, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e9fff0';
  context.font = '900 42px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('SP', 74, 90);

  context.textAlign = 'left';
  context.fillStyle = '#f5fff7';
  context.font = '900 44px Arial, sans-serif';
  context.fillText('PARLANTE', 136, 77);
  context.fillStyle = 'rgba(245, 255, 247, 0.76)';
  context.font = '800 25px Arial, sans-serif';
  context.fillText('Spotify sala', 138, 118);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.75, 0.96),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  label.name = 'spotify-room-speaker-visible-label';
  label.position.set(-1.04, 5.28, 0);
  label.rotation.y = -Math.PI / 2;
  return label;
}

function addSpeakerEdges(mesh, color = 0x050809, opacity = 0.22) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 25),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  );
  mesh.add(edges);
}

function addRoomSpeaker(room) {
  if (!room || room.userData.estudiemosRoomSpeakerInjected) return;
  room.userData.estudiemosRoomSpeakerInjected = true;

  const speaker = new THREE.Group();
  speaker.name = 'spotify-room-speaker-corner-control';
  speaker.position.copy(ROOM_SPEAKER_LOCAL);
  speaker.rotation.y = -0.08;

  const cabinetMaterial = makeStandardMaterial(0x101819, 0.62, 0.05);
  const sideMaterial = makeStandardMaterial(0x243432, 0.72, 0.02);
  const grilleMaterial = makeStandardMaterial(0x050809, 0.82, 0.01);
  const ringMaterial = makeStandardMaterial(0xd7c28a, 0.46, 0.1);
  const glowMaterial = makeEmissiveMaterial(0x1ed760, 0.9);
  const screenMaterial = makeEmissiveMaterial(0x8ee6b2, 0.48);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 1.72), sideMaterial);
  base.position.set(0, 0.12, 0);
  base.receiveShadow = true;
  speaker.add(base);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.65, 1.12), cabinetMaterial);
  cabinet.position.set(0, 2.48, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  speaker.add(cabinet);
  addSpeakerEdges(cabinet);

  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.96), grilleMaterial);
  frontPanel.position.set(-0.79, 2.52, 0);
  frontPanel.castShadow = true;
  speaker.add(frontPanel);

  [
    { y: 3.65, radius: 0.42 },
    { y: 2.52, radius: 0.58 },
    { y: 1.32, radius: 0.38 }
  ].forEach((driver) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(driver.radius, driver.radius, 0.085, 32), ringMaterial);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(-0.86, driver.y, 0);
    speaker.add(ring);

    const cone = new THREE.Mesh(new THREE.CylinderGeometry(driver.radius * 0.58, driver.radius * 0.82, 0.105, 32), grilleMaterial);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(-0.92, driver.y, 0);
    speaker.add(cone);
  });

  const miniDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.38, 0.68), screenMaterial);
  miniDisplay.position.set(-0.94, 4.2, 0);
  speaker.add(miniDisplay);

  const visibleLabel = createSpeakerLabel();
  if (visibleLabel) speaker.add(visibleLabel);

  for (let index = 0; index < 5; index += 1) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.17 + index * 0.06, 0.06), glowMaterial);
    led.position.set(-0.96, 0.78 + index * 0.18, -0.48);
    speaker.add(led);
  }

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 36),
    new THREE.MeshBasicMaterial({
      color: 0x1ed760,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.014, 0);
  speaker.add(floorGlow);

  const speakerGlow = new THREE.PointLight(0x1ed760, 0.75, 7.5, 2.1);
  speakerGlow.position.set(-0.96, 2.8, 0);
  speaker.add(speakerGlow);

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
  dispatchSpeakerAim(aimDot > SPEAKER_AIM_DOT || distance < 3.35);
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
