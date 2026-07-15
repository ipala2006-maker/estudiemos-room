import * as THREE from 'three';

const ROOM_SPEAKER_WORLD = new THREE.Vector3(114.2, 2.7, -29.1);
const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const ROOM_SPEAKER_LOCAL = new THREE.Vector3(24.2, 0, -23.1);
const SPEAKER_AIM_EVENT = 'estudiemos:room-speaker-aim';
const SPEAKER_INTERACTION_DISTANCE = 26;
const SPEAKER_AIM_DOT = 0.94;
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};

const aimDirection = new THREE.Vector3();
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

function addSpeakerEdges(mesh, color = 0x050809, opacity = 0.16) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(edges);
}

function addRoomSpeaker(room) {
  if (!room || room.userData.estudiemosRoomSpeakerInjected) return;
  room.userData.estudiemosRoomSpeakerInjected = true;

  const speaker = new THREE.Group();
  speaker.name = 'spotify-room-speaker-corner-control';
  speaker.position.copy(ROOM_SPEAKER_LOCAL);

  const cabinetMaterial = makeStandardMaterial(0x101819, 0.62, 0.04);
  const sideMaterial = makeStandardMaterial(0x243432, 0.7, 0.02);
  const grilleMaterial = makeStandardMaterial(0x070b0c, 0.74, 0.01);
  const ringMaterial = makeStandardMaterial(0xd7c28a, 0.42, 0.08);
  const glowMaterial = makeEmissiveMaterial(0x1ed760, 0.78);
  const screenMaterial = makeEmissiveMaterial(0x8ed7d2, 0.38);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.26, 1.72), sideMaterial);
  base.position.set(0, 0.13, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  speaker.add(base);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.35, 4.3, 1.12), cabinetMaterial);
  cabinet.position.set(0, 2.35, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  speaker.add(cabinet);
  addSpeakerEdges(cabinet);

  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.76, 0.94), grilleMaterial);
  frontPanel.position.set(-0.72, 2.43, 0);
  frontPanel.castShadow = true;
  speaker.add(frontPanel);

  [
    { y: 3.42, radius: 0.39 },
    { y: 2.42, radius: 0.52 },
    { y: 1.38, radius: 0.35 }
  ].forEach((driver) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(driver.radius, driver.radius, 0.08, 28), ringMaterial);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(-0.79, driver.y, 0);
    speaker.add(ring);

    const cone = new THREE.Mesh(new THREE.CylinderGeometry(driver.radius * 0.62, driver.radius * 0.82, 0.095, 28), grilleMaterial);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(-0.84, driver.y, 0);
    speaker.add(cone);
  });

  for (let index = 0; index < 4; index += 1) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18 + index * 0.07, 0.055), glowMaterial);
    led.position.set(-0.86, 0.85 + index * 0.18, -0.44);
    speaker.add(led);
  }

  const miniDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.36, 0.66), screenMaterial);
  miniDisplay.position.set(-0.86, 3.96, 0);
  speaker.add(miniDisplay);

  const remotePad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.76), makeStandardMaterial(0x1b2829, 0.58, 0.04));
  remotePad.position.set(-0.91, 0.67, 0);
  speaker.add(remotePad);

  const speakerGlow = new THREE.PointLight(0x1ed760, 0.58, 5.6, 2.2);
  speakerGlow.position.set(-0.8, 2.9, 0);
  speaker.add(speakerGlow);

  room.add(speaker);
}

function findCasaRoom(scene) {
  return scene?.children?.find(
    (child) =>
      child?.isGroup &&
      Math.abs(child.position.x - ROOM_GROUP_POSITION.x) < 0.05 &&
      Math.abs(child.position.z - ROOM_GROUP_POSITION.z) < 0.05
  );
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
  toSpeaker.copy(ROOM_SPEAKER_WORLD).sub(camera.position);
  const distance = toSpeaker.length();
  if (distance < 1.4 || distance > SPEAKER_INTERACTION_DISTANCE) {
    dispatchSpeakerAim(false);
    return;
  }

  const aimDot = toSpeaker.normalize().dot(aimDirection);
  dispatchSpeakerAim(aimDot > SPEAKER_AIM_DOT || distance < 2.65);
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
