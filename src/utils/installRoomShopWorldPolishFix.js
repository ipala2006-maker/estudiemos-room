import * as THREE from 'three';
import dachshundMascotRenderUrl from '../assets/dachshund-mascot-render.jpg';
import { BUILDING_LOBBY_OFFSET } from '../maps/BuildingWorld.js';
import {
  addArchitectureModel,
  BUILDING_ARCHITECTURE
} from '../world/buildingArchitecture.js';

const SHOP_OBJECT_NAME = 'casa1-salchi-shop-corner';
const SHOP_ANCHOR_NAME = 'casa1-salchi-shop-anchor';
const SHOP_DISTANCE = 10.5;
const SHOP_RADIUS = 2.8;
const FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';
const SHOP_PLACEMENTS = {
  building: {
    id: 'building-lobby-backwall',
    anchor: BUILDING_LOBBY_OFFSET.clone(),
    local: new THREE.Vector3(0, 0, -11),
    center: new THREE.Vector3(87.3, -8.45, 21.7),
    rotationY: Math.PI / 2,
    bounds: { minX: 70.1, maxX: 104.5, minY: -10.8, maxY: -3.2, minZ: 20.2, maxZ: 49.9 }
  },
  legacy: {
    id: 'legacy-casa1',
    anchor: new THREE.Vector3(90, 0, -6),
    local: new THREE.Vector3(25.85, 0, -11.5),
    center: new THREE.Vector3(116.15, 1.55, -17.5),
    rotationY: 0,
    bounds: { minX: 62, maxX: 118, minZ: -36, maxZ: 23 }
  }
};

const loader = new THREE.TextureLoader();
const rayDirection = new THREE.Vector3();
let lastScene = null;
let lastCamera = null;

function isWorldScene(scene) {
  return Boolean(scene?.isScene && scene.userData?.performancePass);
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.64,
    metalness: options.metalness ?? 0.04,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: Boolean(options.opacity && options.opacity < 1),
    opacity: options.opacity ?? 1,
    ...(options.side !== undefined ? { side: options.side } : {})
  });
}

function addBox(parent, name, size, position, meshMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function disposeObject(object) {
  object.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((item) => item.dispose?.());
  });
}

function makeLabel({ title, subtitle = '', width = 760, height = 210, titleSize = 56, opacity = 0.94 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#21372f');
  gradient.addColorStop(0.72, '#101817');
  gradient.addColorStop(1, '#070b0c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(255,248,221,0.08)';
  context.roundRect(28, 28, width - 56, height - 56, 28);
  context.fill();
  context.fillStyle = '#e0c47a';
  context.fillRect(34, 34, width - 68, 10);
  context.fillRect(62, height - 54, 190, 8);

  context.fillStyle = '#fff8dd';
  context.font = `900 ${titleSize}px ${FONT_STACK}`;
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0,0,0,0.34)';
  context.shadowBlur = 12;
  context.fillText(title, 56, height * 0.45);

  if (subtitle) {
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(245,238,218,0.72)';
    context.font = `750 26px ${FONT_STACK}`;
    context.fillText(subtitle, 58, height * 0.69);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const labelMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.02,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, height / width), labelMaterial);
  mesh.castShadow = true;
  return mesh;
}

function addWallLabel(parent, name, config, position, scale) {
  const label = makeLabel(config);
  if (!label) return null;
  label.name = name;
  label.position.set(...position);
  label.rotation.y = -Math.PI / 2;
  label.scale.set(...scale);
  parent.add(label);
  return label;
}

function makeDogVendor() {
  const texture = loader.load(dachshundMascotRenderUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.72, 1.72),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  mesh.name = 'casa1-salchi-shop-vendor';
  mesh.position.set(-0.28, 2.13, 0);
  mesh.rotation.y = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.renderOrder = 2;
  return mesh;
}

function createCleanShop(anchor, placement) {
  const oldShop = anchor.getObjectByName(SHOP_OBJECT_NAME);
  if (oldShop) {
    anchor.remove(oldShop);
    disposeObject(oldShop);
  }

  const shop = new THREE.Group();
  shop.name = SHOP_OBJECT_NAME;
  shop.position.copy(placement.local);
  shop.rotation.y = placement.rotationY ?? 0;
  shop.userData.interactionTarget = 'shop';
  shop.userData.idleSeed = Math.random() * Math.PI * 2;
  shop.userData.estudiemosCleanShop = true;
  shop.userData.estudiemosPlacement = placement.id;

  const materials = {
    wallPanel: material(0x101917, { roughness: 0.78, metalness: 0.02 }),
    wallGlow: material(0x9edfc8, { emissive: 0x9edfc8, emissiveIntensity: 0.06, opacity: 0.12 }),
    wood: material(0x4b382b, { roughness: 0.74, metalness: 0.02 }),
    dark: material(0x090f0f, { roughness: 0.66, metalness: 0.08 }),
    trim: material(0xd8bd77, { emissive: 0xd8bd77, emissiveIntensity: 0.12, roughness: 0.42, metalness: 0.08 }),
    teal: material(0x285b51, { roughness: 0.52, metalness: 0.03 }),
    mint: material(0x7abeb5, { roughness: 0.48, metalness: 0.03 })
  };

  addBox(shop, 'salchi-shop-wall-backplate', [0.1, 3.55, 4.12], [1.76, 2.78, 0], materials.wallPanel);
  addBox(shop, 'salchi-shop-wall-soft-glow', [0.06, 2.94, 3.52], [1.68, 2.74, 0], materials.wallGlow);
  addBox(shop, 'salchi-shop-top-rail', [0.14, 0.07, 4.16], [1.58, 4.55, 0], materials.trim);
  addBox(shop, 'salchi-shop-bottom-rail', [0.14, 0.07, 3.72], [1.58, 1.04, 0], materials.trim);
  addBox(shop, 'salchi-shop-left-rail', [0.14, 3.4, 0.06], [1.58, 2.8, -2.02], materials.trim);
  addBox(shop, 'salchi-shop-right-rail', [0.14, 3.4, 0.06], [1.58, 2.8, 2.02], materials.trim);

  const sign = addWallLabel(
    shop,
    'salchi-shop-wall-sign',
    { title: 'TIENDA SALCHI', subtitle: 'skins  rangos  recompensas', width: 760, height: 190, titleSize: 54 },
    [1.49, 4.18, 0],
    [3.28, 3.2, 1]
  );

  addArchitectureModel(shop, {
    asset: BUILDING_ARCHITECTURE.shopCounter,
    name: 'salchi-shop-counter',
    position: [0.08, 0, 0],
    rotation: [0, -Math.PI / 2, 0]
  });
  const vendor = makeDogVendor();
  shop.add(vendor);

  const light = new THREE.PointLight(0xffe1a2, 0.18, 6.5, 2.1);
  light.name = 'salchi-shop-warm-light';
  light.position.set(-0.35, 2.75, 0.15);
  shop.add(light);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 40),
    new THREE.MeshBasicMaterial({ color: 0xe0c47a, transparent: true, opacity: 0.045, depthWrite: false })
  );
  floorGlow.name = 'salchi-shop-floor-glow';
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0.08, 0.025, 0);
  floorGlow.scale.set(0.86, 1.42, 1);
  shop.add(floorGlow);

  shop.userData.prompt = null;
  shop.userData.vendor = vendor;
  shop.userData.glowMaterials = [materials.wallGlow, sign?.material].filter(Boolean);
  anchor.add(shop);
  return shop;
}

function ensureShop(scene) {
  if (!scene) return;
  const placement = getShopPlacement(scene);
  let anchor = scene.userData.estudiemosRoomShopAnchor;
  if (!anchor?.parent) {
    anchor = scene.getObjectByName?.(SHOP_ANCHOR_NAME);
  }
  if (!anchor) {
    anchor = new THREE.Group();
    anchor.name = SHOP_ANCHOR_NAME;
    anchor.position.copy(placement.anchor);
    scene.add(anchor);
  }
  scene.userData.estudiemosRoomShopAnchor = anchor;
  anchor.position.copy(placement.anchor);

  let shop = scene.userData.estudiemosRoomShopObject;
  if (!shop?.parent) {
    shop = anchor.getObjectByName(SHOP_OBJECT_NAME);
  }
  if (!shop?.userData?.estudiemosCleanShop || shop.userData.estudiemosPlacement !== placement.id) {
    shop = createCleanShop(anchor, placement);
  }
  scene.userData.estudiemosRoomShopObject = shop;
}

export function ensureRoomShopInScene(scene) {
  if (!isWorldScene(scene)) return null;
  lastScene = scene;
  ensureShop(scene);
  const anchor = scene.userData.estudiemosRoomShopAnchor ?? null;
  if (anchor && scene.userData?.worldMode !== 'legacy') anchor.visible = true;
  document.documentElement.dataset.estudiemosBuildingShop = anchor ? 'attached' : 'missing';
  return anchor;
}

function getShopPlacement(scene) {
  return scene?.userData?.worldMode === 'legacy' ? SHOP_PLACEMENTS.legacy : SHOP_PLACEMENTS.building;
}

function isInsideRoom(camera, scene) {
  const placement = getShopPlacement(scene);
  const bounds = placement.bounds;
  const { x, y, z } = camera.position;
  const insideHeight = bounds.minY === undefined || (y >= bounds.minY && y <= bounds.maxY);
  return insideHeight && x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

function raySphereHitDistance(origin, direction, center, radius) {
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

function isAimingShop(camera, scene) {
  if (!camera?.isCamera || !isInsideRoom(camera, scene)) return false;
  const shopCenter = getShopPlacement(scene).center;
  if (camera.position.distanceTo(shopCenter) > SHOP_DISTANCE) return false;
  camera.getWorldDirection(rayDirection).normalize();
  const distance = raySphereHitDistance(camera.position, rayDirection, shopCenter, SHOP_RADIUS);
  return distance !== null && distance <= SHOP_DISTANCE;
}

function refreshShop(scene = lastScene, camera = lastCamera, frameTime = performance.now()) {
  if (!scene || !camera) return;
  let anchor = scene.userData.estudiemosRoomShopAnchor;
  let shop = scene.userData.estudiemosRoomShopObject;
  if (!anchor?.parent || !shop?.parent) {
    ensureShop(scene);
    anchor = scene.userData.estudiemosRoomShopAnchor;
    shop = scene.userData.estudiemosRoomShopObject;
  }
  if (!anchor || !shop) return;

  const shouldShow = Boolean(window.__estudiemosForceShopView || isInsideRoom(camera, scene));
  const active = shouldShow && isAimingShop(camera, scene);
  anchor.visible = shouldShow;
  shop.visible = shouldShow;

  if (shop.userData.prompt) {
    shop.userData.prompt.visible = active;
    shop.userData.prompt.position.y = 2.62 + Math.sin(frameTime * 0.004 + shop.userData.idleSeed) * 0.045;
  }

  const targetOpacity = active ? 0.72 : 0.3;
  shop.userData.glowMaterials?.forEach((item) => {
    item.transparent = true;
    item.opacity += (targetOpacity - item.opacity) * 0.14;
  });

  if (shop.userData.vendor) {
    shop.userData.vendor.rotation.z = Math.sin(frameTime * 0.002 + shop.userData.idleSeed) * 0.012;
  }

  document.documentElement.dataset.estudiemosRoomShopWorld = 'anchor-object3d-v7-polish-fix';
  document.documentElement.dataset.estudiemosRoomShopState = shouldShow ? 'visible' : 'loaded';
}

export function updateRoomShopInScene(scene, camera, frameTime = performance.now()) {
  if (!isWorldScene(scene) || !camera?.isCamera) return;
  lastScene = scene;
  lastCamera = camera;
  refreshShop(scene, camera, frameTime);
}

function installRoomShopWorldPolishFix() {
  if (typeof window === 'undefined' || window.__estudiemosRoomShopWorldPolishInstalled) return;
  window.__estudiemosRoomShopWorldPolishInstalled = true;
  window.__estudiemosRoomShopInstallMode = 'anchor-object3d-v7-polish-fix';
  document.documentElement.dataset.estudiemosRoomShopWorld = 'anchor-object3d-v7-polish-fix';
}

installRoomShopWorldPolishFix();
