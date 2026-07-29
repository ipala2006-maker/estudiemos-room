import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ARCHITECTURE_ROOT = 'models/custom/architecture';
const architectureLoader = new GLTFLoader();
const architecturePromises = new Map();
const materialVariants = new Map();

export const BUILDING_ARCHITECTURE = Object.freeze({
  wallSolid: 'wall-solid.glb',
  wallDoor: 'wall-door.glb',
  wallWindow: 'wall-window.glb',
  floorPanel: 'floor-panel.glb',
  ceilingPanel: 'ceiling-panel.glb',
  column: 'column.glb',
  railing: 'railing.glb',
  stairFlight: 'stair-flight.glb',
  stairLanding: 'stair-landing.glb',
  stairwellPortal: 'stairwell-portal.glb',
  elevatorShaftShell: 'elevator-shaft-shell.glb',
  elevatorPortal: 'elevator-portal.glb',
  elevatorDoorPanel: 'elevator-door-panel.glb',
  elevatorCabinShell: 'elevator-cabin-shell.glb',
  receptionDesk: 'reception-desk.glb',
  builtInBench: 'built-in-bench.glb',
  entryPortal: 'entry-portal.glb',
  giantScreenSurround: 'giant-screen-surround.glb',
  studyWorkstation: 'study-workstation.glb',
  shopCounter: 'shop-counter.glb',
  studyShelf: 'study-shelf.glb',
  architecturalPlanter: 'architectural-planter.glb'
});

function architectureUrl(file) {
  return `${import.meta.env.BASE_URL}${ARCHITECTURE_ROOT}/${file}`;
}

function prepareArchitectureRoot(root) {
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
      if ('envMapIntensity' in material) material.envMapIntensity = 0.55;
      if (material.name.includes('Glass')) {
        material.transparent = true;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
      }
      material.needsUpdate = true;
    });
  });

  return root;
}

function loadArchitectureTemplate(file) {
  if (!architecturePromises.has(file)) {
    architecturePromises.set(
      file,
      architectureLoader
        .loadAsync(architectureUrl(file))
        .then((gltf) => prepareArchitectureRoot(gltf.scene))
    );
  }
  return architecturePromises.get(file);
}

function architectureTextureRepeat(asset, scale) {
  const horizontal = Math.max(1, Math.abs(scale[0]));
  const vertical =
    asset === BUILDING_ARCHITECTURE.floorPanel || asset === BUILDING_ARCHITECTURE.ceilingPanel
      ? Math.max(1, Math.abs(scale[2]))
      : Math.max(1, Math.abs(scale[1]));
  return [horizontal, vertical];
}

function materialVariant(material, asset, repeat) {
  if (!material?.map || (repeat[0] === 1 && repeat[1] === 1)) return material;

  const key = `${asset}:${material.uuid}:${repeat[0].toFixed(3)}:${repeat[1].toFixed(3)}`;
  if (!materialVariants.has(key)) {
    const variant = material.clone();
    variant.map = material.map.clone();
    variant.map.wrapS = THREE.RepeatWrapping;
    variant.map.wrapT = THREE.RepeatWrapping;
    variant.map.repeat.set(repeat[0], repeat[1]);
    variant.map.needsUpdate = true;
    materialVariants.set(key, variant);
  }
  return materialVariants.get(key);
}

function preserveFloorDetailScale(model, scale) {
  const scaleX = Math.max(0.001, Math.abs(scale[0]));
  const scaleZ = Math.max(0.001, Math.abs(scale[2]));
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.name.includes('Floor_Inlay_X')) child.scale.z = 1 / scaleZ;
    if (child.name.includes('Floor_Inlay_Y')) child.scale.x = 1 / scaleX;
    if (child.name.includes('Floor_Pin')) child.scale.set(1 / scaleX, child.scale.y, 1 / scaleZ);
  });
}

export function addArchitectureModel(
  parent,
  {
    asset,
    name,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    castShadow = true,
    receiveShadow = true,
    onReady
  }
) {
  const anchor = new THREE.Group();
  anchor.name = name;
  anchor.position.set(...position);
  anchor.rotation.set(...rotation);
  anchor.scale.set(...scale);
  anchor.userData.architectureAsset = asset;
  parent.add(anchor);

  loadArchitectureTemplate(asset)
    .then((template) => {
      if (!anchor.parent) return;
      const model = template.clone(true);
      model.name = `${name}-model`;
      const repeat = architectureTextureRepeat(asset, scale);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
        if (Array.isArray(child.material)) {
          child.material = child.material.map((material) => materialVariant(material, asset, repeat));
        } else {
          child.material = materialVariant(child.material, asset, repeat);
        }
      });
      if (asset === BUILDING_ARCHITECTURE.floorPanel) preserveFloorDetailScale(model, scale);
      anchor.add(model);
      anchor.userData.architectureReady = true;
      let root = anchor;
      while (root.parent) root = root.parent;
      if (root.isScene) root.userData.architectureShadowDirty = true;
      onReady?.(anchor, model);
    })
    .catch((error) => {
      anchor.userData.architectureError = true;
      console.warn(`No se pudo cargar el modulo arquitectonico ${asset}.`, error);
    });

  return anchor;
}

export function addRepeatedWall(
  parent,
  {
    name,
    center,
    length,
    height,
    rotationY = 0,
    maxModuleLength = 4,
    asset = BUILDING_ARCHITECTURE.wallSolid
  }
) {
  const count = Math.max(1, Math.ceil(length / maxModuleLength));
  const segmentLength = length / count;
  const direction = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  for (let index = 0; index < count; index += 1) {
    const offset = -length / 2 + segmentLength * (index + 0.5);
    addArchitectureModel(parent, {
      asset,
      name: `${name}-${index + 1}`,
      position: [
        center[0] + direction.x * offset,
        center[1],
        center[2] + direction.z * offset
      ],
      rotation: [0, rotationY, 0],
      scale: [segmentLength / 4, height / 3, 1]
    });
  }
}

export function clearArchitectureCache() {
  architecturePromises.clear();
  materialVariants.clear();
}
