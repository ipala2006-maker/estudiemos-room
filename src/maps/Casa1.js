import * as THREE from 'three';

const INTERIOR_SPAWN_VIEW = {
  yaw: 0.22,
  pitch: -0.06
};

export const Casa1 = {
  id: 'casa-1',
  name: 'Casa 1',
  startPosition: new THREE.Vector3(0, 1.7, 20),
  entrancePosition: new THREE.Vector3(0, 1.7, -13.7),
  interiorSpawnPosition: new THREE.Vector3(98, 1.7, 4.5),
  interiorSpawnYaw: INTERIOR_SPAWN_VIEW.yaw,
  interiorSpawnPitch: INTERIOR_SPAWN_VIEW.pitch,
  interiorExitPosition: new THREE.Vector3(90, 1.7, 20),
  computerPosition: new THREE.Vector3(78.6, 1.7, -14.6),
  screenChannels: {
    primaryContent: {
      label: 'Contenido principal',
      slot: 'upper'
    },
    secondaryContent: {
      label: 'Contenido secundario',
      slot: 'lower'
    }
  },
  neighborhoodBounds: {
    minX: -27.5,
    maxX: 27.5,
    minZ: -27.5,
    maxZ: 27.5
  },
  interiorBounds: {
    minX: 62,
    maxX: 118,
    minZ: -36,
    maxZ: 23
  },
  style: {
    interiorWall: 0xffffff,
    interiorFloor: 0xf4f6ee,
    exteriorWall: 0xffefbd,
    desk: 0x30344f
  }
};

installCasa1RuntimeEnhancements(Casa1);

function installCasa1RuntimeEnhancements(map) {
  const installKey = '__estudiemosCasa1RuntimeEnhancementsV1';
  if (globalThis[installKey]) return;
  globalThis[installKey] = true;

  const originalVectorCopy = THREE.Vector3.prototype.copy;
  const originalEulerSet = THREE.Euler.prototype.set;
  const originalSceneAdd = THREE.Scene.prototype.add;
  const entryView = { pending: false };

  THREE.Vector3.prototype.copy = function copyWithCasa1EntryView(source) {
    const result = originalVectorCopy.call(this, source);
    if (source === map.interiorSpawnPosition) {
      entryView.pending = true;
    }
    return result;
  };

  THREE.Euler.prototype.set = function setWithCasa1EntryView(x, y, z, order) {
    if (
      entryView.pending &&
      Math.abs(x) < 0.0001 &&
      Math.abs(y - Math.PI) < 0.0001 &&
      Math.abs(z) < 0.0001
    ) {
      entryView.pending = false;
      return originalEulerSet.call(this, map.interiorSpawnPitch, map.interiorSpawnYaw, 0, order);
    }

    if (entryView.pending) entryView.pending = false;
    return originalEulerSet.call(this, x, y, z, order);
  };

  THREE.Scene.prototype.add = function addWithCasa1Enhancements(...objects) {
    if (!objects.some((object) => object?.isCSS3DObject || object?.element)) {
      enhanceExteriorOnce(this, originalSceneAdd);
    }
    objects.forEach((object) => {
      if (isCasa1InteriorGroup(object)) {
        enhanceCasa1InteriorOnce(object);
      }
    });
    return originalSceneAdd.apply(this, objects);
  };
}

function isCasa1InteriorGroup(object) {
  return (
    object?.isGroup &&
    Math.abs(object.position.x - 90) < 0.001 &&
    Math.abs(object.position.y) < 0.001 &&
    Math.abs(object.position.z + 6) < 0.001
  );
}

function enhanceExteriorOnce(scene, originalSceneAdd) {
  if (!scene?.isScene || scene.userData.estudiemosExteriorEnhanced) return;
  scene.userData.estudiemosExteriorEnhanced = true;

  const group = new THREE.Group();
  group.name = 'casa1-base-exterior-enhancement';

  const lawnBlend = material('exterior-lawn-blend', 0x6f845b, 0.72, 0, 'lawnBlend');
  const paving = material('approach-paving', 0xb9b2a4, 0.66, 0.01, 'paving');
  const warmStone = material('warm-stone-trim', 0x9e8d78, 0.58, 0.02, 'stoneTrim');
  const guide = material('room-guide-line', 0xd7c28a, 0.42, 0.02);

  [
    { points: [[-7.2, 11.2], [7.2, 11.2], [5.2, -19.4], [-5.2, -19.4]], y: 0.075, material: paving },
    { points: [[-11.8, -8.4], [11.8, -8.4], [8.5, -22.8], [-8.5, -22.8]], y: 0.085, material: warmStone },
    { points: [[-29.2, -29.2], [-7, -29.2], [-5.5, -18], [-29.2, -16]], y: 0.065, material: lawnBlend },
    { points: [[7, -29.2], [29.2, -29.2], [29.2, -16], [5.5, -18]], y: 0.065, material: lawnBlend }
  ].forEach((spec) => {
    const patch = groundShape(spec.points, spec.material);
    patch.position.y = spec.y;
    patch.receiveShadow = true;
    group.add(patch);
  });

  [
    { position: [-4.35, 0.19, -3.5], size: [0.12, 0.1, 26.5] },
    { position: [4.35, 0.19, -3.5], size: [0.12, 0.1, 26.5] },
    { position: [0, 0.2, -17.8], size: [8.6, 0.12, 0.14] }
  ].forEach((spec) => {
    const line = box(spec.size, spec.position, guide);
    line.receiveShadow = true;
    group.add(line);
  });

  [
    [-6.8, -14.4],
    [6.8, -14.4],
    [-8.9, -21.1],
    [8.9, -21.1]
  ].forEach(([x, z]) => {
    const bollard = box([0.42, 1.15, 0.42], [x, 0.58, z], material('dark-metal', 0x111622, 0.32, 0.08));
    const glow = box([0.5, 0.08, 0.5], [x, 1.2, z], material('soft-path-light', 0xd7c28a, 0.26, 0.02));
    group.add(bollard, glow);
  });

  originalSceneAdd.call(scene, group);
}

function enhanceCasa1InteriorOnce(room) {
  if (room.userData.estudiemosBaseEnhanced) return;
  room.userData.estudiemosBaseEnhanced = true;

  const wallPanel = material('interior-wall-panel', 0x6b513a, 0.62, 0.01, 'wallPanel');
  const darkFrame = material('charcoal-architectural-frame', 0x151923, 0.42, 0.05);
  const brass = material('muted-brass-line', 0xd7c28a, 0.36, 0.04);
  const floorInset = material('floor-inset-study-zone', 0x7c5a3d, 0.58, 0.02, 'floorInset');
  const acoustic = material('acoustic-ceiling-panel', 0x272f36, 0.7, 0.01, 'acousticPanel');
  const screenGlow = material('screen-glow-trim', 0xb9d7df, 0.24, 0.02);
  const workstation = material('workstation-bay-panel', 0x2a3340, 0.54, 0.03, 'workBay');

  addFloorComposition(room, { floorInset, darkFrame, brass });
  addWallArchitecture(room, { wallPanel, darkFrame, brass, workstation });
  addScreenComposition(room, { darkFrame, brass, screenGlow });
  addCeilingArchitecture(room, { acoustic, darkFrame, brass, screenGlow });
  addStudyLighting(room);
}

function addFloorComposition(room, materials) {
  const { floorInset, darkFrame, brass } = materials;
  [
    { size: [30, 0.08, 38], position: [2.5, 0.04, -7.4], material: floorInset },
    { size: [44, 0.11, 0.22], position: [0, 0.09, -25.2], material: brass },
    { size: [0.18, 0.1, 33], position: [-15.6, 0.1, -7.5], material: darkFrame },
    { size: [0.18, 0.1, 33], position: [15.6, 0.1, -7.5], material: darkFrame },
    { size: [18.5, 0.1, 0.16], position: [-5.6, 0.12, -8.6], material: brass },
    { size: [4.2, 0.12, 0.16], position: [-11.4, 0.14, -13.2], material: brass }
  ].forEach((spec) => {
    const mesh = box(spec.size, spec.position, spec.material);
    mesh.receiveShadow = true;
    room.add(mesh);
  });
}

function addWallArchitecture(room, materials) {
  const { wallPanel, darkFrame, brass, workstation } = materials;
  [-27.68, 27.68].forEach((x) => {
    [-20, -8, 4, 16].forEach((z, index) => {
      const panel = box([0.2, 7.1, 7.6], [x, 6.7, z], wallPanel);
      panel.castShadow = true;
      panel.receiveShadow = true;
      room.add(panel);

      const rail = box([0.28, 0.18, 7.9], [x, 3.25, z], index % 2 === 0 ? brass : darkFrame);
      room.add(rail);
    });
  });

  [-18, -9, 0, 9, 18].forEach((x) => {
    room.add(box([0.22, 11.8, 0.3], [x, 7.1, 28.62], darkFrame));
    room.add(box([7.2, 0.22, 0.34], [x, 11.8, 28.58], wallPanel));
  });

  room.add(box([10.2, 7.4, 0.32], [-11.4, 5.5, -9.25], workstation));
  room.add(box([10.9, 0.28, 0.38], [-11.4, 9.35, -9.05], brass));
  room.add(box([0.24, 6.9, 0.38], [-16.95, 5.6, -9.04], brass));
  room.add(box([0.24, 6.9, 0.38], [-5.85, 5.6, -9.04], brass));
}

function addScreenComposition(room, materials) {
  const { darkFrame, brass, screenGlow } = materials;
  room.add(box([42, 15.8, 0.28], [0, 8.35, -28.86], darkFrame));
  room.add(box([41.2, 0.24, 0.42], [0, 15.8, -28.2], brass));
  room.add(box([41.2, 0.24, 0.42], [0, 1.25, -28.2], brass));

  [-21.5, 21.5].forEach((x) => {
    room.add(box([0.34, 15.1, 0.5], [x, 8.45, -28.18], darkFrame));
    room.add(box([0.12, 12.2, 0.58], [x * 0.93, 8.6, -27.96], screenGlow));
  });

  [-15.5, -7.75, 7.75, 15.5].forEach((x) => {
    const fin = box([0.14, 11.2, 0.32], [x, 8.7, -28.02], screenGlow);
    room.add(fin);
  });
}

function addCeilingArchitecture(room, materials) {
  const { acoustic, darkFrame, brass, screenGlow } = materials;
  [-18, -6, 6, 18].forEach((x) => {
    room.add(box([0.38, 0.7, 55], [x, 15.58, 0], darkFrame));
  });

  [-21, -9, 3, 15].forEach((z) => {
    room.add(box([51.5, 0.22, 0.34], [0, 15.25, z], brass));
  });

  [
    { position: [0, 15.15, -18], size: [25, 0.18, 8.8], material: acoustic },
    { position: [-13.4, 15.1, -3], size: [9.8, 0.16, 9.8], material: acoustic },
    { position: [13.4, 15.1, -3], size: [9.8, 0.16, 9.8], material: acoustic },
    { position: [0, 15.05, -26.2], size: [31, 0.12, 0.42], material: screenGlow }
  ].forEach((spec) => room.add(box(spec.size, spec.position, spec.material)));
}

function addStudyLighting(room) {
  const warm = 0xffd29c;
  const cool = 0xb9d7df;
  [
    { color: warm, intensity: 0.55, distance: 28, position: [-11.4, 6.4, -7.6] },
    { color: cool, intensity: 0.72, distance: 36, position: [0, 9.5, -20] },
    { color: warm, intensity: 0.28, distance: 26, position: [10, 6.4, 5] }
  ].forEach((spec) => {
    const light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, 2.15);
    light.position.set(...spec.position);
    room.add(light);
  });
}

function box(size, position, meshMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function groundShape(points, meshMaterial) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, meshMaterial);
}

function material(key, color, roughness = 0.5, metalness = 0, textureType = '') {
  const cacheKey = `${key}-${color}-${roughness}-${metalness}-${textureType}`;
  if (!material.cache) material.cache = new Map();
  if (material.cache.has(cacheKey)) return material.cache.get(cacheKey);

  const meshMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map: textureType ? proceduralTexture(textureType) : null
  });
  material.cache.set(cacheKey, meshMaterial);
  return meshMaterial;
}

function proceduralTexture(type) {
  if (!proceduralTexture.cache) proceduralTexture.cache = new Map();
  if (proceduralTexture.cache.has(type)) return proceduralTexture.cache.get(type);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const palette = {
    lawnBlend: ['#6f845b', '#516f4d', '#96a874'],
    paving: ['#b9b2a4', '#918778', '#d1c8b8'],
    stoneTrim: ['#9e8d78', '#746657', '#c2b198'],
    wallPanel: ['#6b513a', '#4f3a2d', '#8a6a4f'],
    floorInset: ['#7c5a3d', '#5f422e', '#a47c55'],
    acousticPanel: ['#272f36', '#1b2028', '#3a4650'],
    workBay: ['#2a3340', '#18202a', '#3f4e60']
  }[type] ?? ['#777777', '#555555', '#aaaaaa'];

  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 190; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? palette[1] : i % 3 === 1 ? palette[2] : 'rgba(255,255,255,0.08)';
    ctx.globalAlpha = 0.08 + (i % 5) * 0.025;
    ctx.fillRect((i * 37) % 128, (i * 19) % 128, 1 + (i % 4), 1 + (i % 3));
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let y = 16; y < 128; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(type === 'floorInset' ? 5 : 3, type === 'floorInset' ? 5 : 3);
  proceduralTexture.cache.set(type, texture);
  return texture;
}
