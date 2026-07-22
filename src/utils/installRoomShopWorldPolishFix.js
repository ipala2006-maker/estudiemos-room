import * as THREE from 'three';
import dachshundMascotRenderUrl from '../assets/dachshund-mascot-render.jpg';

const ROOM_ORIGIN = { x: 90, z: -6 };
const SHOP_LOCAL = new THREE.Vector3(25.85, 0, -11.5);
const SHOP_WORLD_CENTER = new THREE.Vector3(116.15, 1.55, -17.5);
const SHOP_OBJECT_NAME = 'casa1-salchi-shop-corner';
const SHOP_ANCHOR_NAME = 'casa1-salchi-shop-anchor';
const INTERIOR_BOUNDS = { minX: 62, maxX: 118, minZ: -36, maxZ: 23 };
const SHOP_DISTANCE = 10.5;
const SHOP_RADIUS = 2.8;
const FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';

const loader = new THREE.TextureLoader();
const rayDirection = new THREE.Vector3();
let lastScene = null;
let lastCamera = null;

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.64,
    metalness: options.metalness ?? 0.04,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: Boolean(options.opacity && options.opacity < 1),
    opacity: options.opacity ?? 1,
    side: options.side
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
    new THREE.PlaneGeometry(1.34, 1.34),
    new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: true
    })
  );
  mesh.name = 'casa1-salchi-shop-vendor';
  mesh.position.set(-0.1, 2.03, -0.18);
  mesh.rotation.y = -Math.PI / 2;
  mesh.scale.setScalar(1.04);
  mesh.castShadow = true;
  mesh.renderOrder = 2;
  return mesh;
}

function addDecor(parent, materials) {
  [-0.38, 0, 0.38].forEach((z, index) => {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.055, 28), materials.gold);
    coin.name = 'salchi-shop-coin';
    coin.position.set(-0.62, 1.05 + index * 0.03, z);
    coin.rotation.z = Math.PI / 2;
    coin.castShadow = true;
    parent.add(coin);
  });

  [
    { z: -1.26, mat: materials.teal },
    { z: 1.26, mat: materials.mint }
  ].forEach(({ z, mat }) => {
    addBox(parent, 'salchi-shop-display-pillar', [0.12, 0.72, 0.44], [-0.7, 1.42, z], mat);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), materials.paper);
    badge.name = 'salchi-shop-display-badge';
    badge.position.set(-0.78, 1.49, z);
    badge.rotation.y = -Math.PI / 2;
    badge.castShadow = true;
    parent.add(badge);
  });
}

function createCleanShop(anchor) {
  const oldShop = anchor.getObjectByName(SHOP_OBJECT_NAME);
  if (oldShop) {
    anchor.remove(oldShop);
    disposeObject(oldShop);
  }

  const shop = new THREE.Group();
  shop.name = SHOP_OBJECT_NAME;
  shop.position.copy(SHOP_LOCAL);
  shop.userData.interactionTarget = 'shop';
  shop.userData.idleSeed = Math.random() * Math.PI * 2;
  shop.userData.estudiemosCleanShop = true;

  const materials = {
    wallPanel: material(0x101917, { roughness: 0.78, metalness: 0.02 }),
    wallGlow: material(0x9edfc8, { emissive: 0x9edfc8, emissiveIntensity: 0.06, opacity: 0.12 }),
    wood: material(0x33271f, { roughness: 0.78, metalness: 0.02 }),
    dark: material(0x090f0f, { roughness: 0.66, metalness: 0.08 }),
    trim: material(0xd8bd77, { emissive: 0xd8bd77, emissiveIntensity: 0.12, roughness: 0.42, metalness: 0.08 }),
    gold: material(0xe0c47a, { emissive: 0xe0c47a, emissiveIntensity: 0.18, roughness: 0.34 }),
    teal: material(0x285b51, { roughness: 0.52, metalness: 0.03 }),
    mint: material(0x7abeb5, { roughness: 0.48, metalness: 0.03 }),
    paper: material(0xf4ead2, { roughness: 0.74, metalness: 0.01 })
  };

  addBox(shop, 'salchi-shop-wall-backplate', [0.1, 3.7, 4.25], [1.76, 2.82, 0], materials.wallPanel);
  addBox(shop, 'salchi-shop-wall-soft-glow', [0.06, 3.12, 3.58], [1.68, 2.78, 0], materials.wallGlow);
  addBox(shop, 'salchi-shop-top-rail', [0.14, 0.08, 4.28], [1.58, 4.64, 0], materials.trim);
  addBox(shop, 'salchi-shop-bottom-rail', [0.14, 0.08, 3.82], [1.58, 1.02, 0], materials.trim);
  addBox(shop, 'salchi-shop-left-rail', [0.14, 3.52, 0.06], [1.58, 2.83, -2.08], materials.trim);
  addBox(shop, 'salchi-shop-right-rail', [0.14, 3.52, 0.06], [1.58, 2.83, 2.08], materials.trim);

  const sign = addWallLabel(
    shop,
    'salchi-shop-wall-sign',
    { title: 'TIENDA SALCHI', subtitle: 'skins  rangos  recompensas', width: 760, height: 190, titleSize: 54 },
    [1.49, 4.26, 0],
    [3.38, 0.84, 1]
  );

  addBox(shop, 'salchi-shop-counter-body', [1.42, 0.54, 3.16], [0.1, 0.48, 0], materials.wood);
  addBox(shop, 'salchi-shop-counter-top', [1.64, 0.12, 3.36], [0.04, 0.84, 0], materials.dark);
  addBox(shop, 'salchi-shop-counter-front', [0.1, 0.62, 3.28], [-0.66, 0.48, 0], materials.dark);
  addBox(shop, 'salchi-shop-counter-front-trim', [0.06, 0.06, 3.28], [-0.72, 0.84, 0], materials.trim);
  addBox(shop, 'salchi-shop-counter-plinth', [1.34, 0.08, 3.02], [0.1, 0.08, 0], materials.dark);

  const counterLabel = addWallLabel(
    shop,
    'salchi-shop-counter-label',
    { title: 'SALCHI', subtitle: 'equipar', width: 512, height: 180, titleSize: 48, opacity: 0.9 },
    [-0.74, 0.55, 0],
    [0.86, 0.3, 1]
  );

  const vendorBacking = addBox(shop, 'salchi-shop-vendor-backing', [0.08, 1.72, 1.62], [0.02, 2.06, -0.12], materials.dark);
  vendorBacking.rotation.y = -Math.PI / 2;
  const vendor = makeDogVendor();
  shop.add(vendor);

  addDecor(shop, materials);

  const prompt = addWallLabel(
    shop,
    'salchi-shop-floating-prompt',
    { title: 'E', subtitle: 'Abrir tienda', width: 512, height: 192, titleSize: 82 },
    [-1.16, 2.6, 0],
    [1.05, 0.5, 1]
  );
  if (prompt) prompt.visible = false;

  const light = new THREE.PointLight(0xffe1a2, 0.62, 6.5, 2.1);
  light.name = 'salchi-shop-warm-light';
  light.position.set(-0.35, 2.75, 0.15);
  shop.add(light);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 40),
    new THREE.MeshBasicMaterial({ color: 0xe0c47a, transparent: true, opacity: 0.075, depthWrite: false })
  );
  floorGlow.name = 'salchi-shop-floor-glow';
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0.08, 0.025, 0);
  floorGlow.scale.set(0.86, 1.42, 1);
  shop.add(floorGlow);

  shop.userData.prompt = prompt;
  shop.userData.vendor = vendor;
  shop.userData.glowMaterials = [materials.wallGlow, sign?.material, counterLabel?.material, prompt?.material].filter(Boolean);
  anchor.add(shop);
  return shop;
}

function ensureShop(scene) {
  if (!scene) return;
  let anchor = scene.getObjectByName?.(SHOP_ANCHOR_NAME);
  if (!anchor) {
    anchor = new THREE.Group();
    anchor.name = SHOP_ANCHOR_NAME;
    anchor.position.set(ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z);
    scene.add(anchor);
  }

  const shop = anchor.getObjectByName(SHOP_OBJECT_NAME);
  if (!shop?.userData?.estudiemosCleanShop) {
    createCleanShop(anchor);
  }
}

function isInsideRoom(camera) {
  const { x, z } = camera.position;
  return x >= INTERIOR_BOUNDS.minX && x <= INTERIOR_BOUNDS.maxX && z >= INTERIOR_BOUNDS.minZ && z <= INTERIOR_BOUNDS.maxZ;
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

function isAimingShop(camera) {
  if (!camera?.isCamera || !isInsideRoom(camera)) return false;
  if (camera.position.distanceTo(SHOP_WORLD_CENTER) > SHOP_DISTANCE) return false;
  camera.getWorldDirection(rayDirection).normalize();
  const distance = raySphereHitDistance(camera.position, rayDirection, SHOP_WORLD_CENTER, SHOP_RADIUS);
  return distance !== null && distance <= SHOP_DISTANCE;
}

function refreshShop(scene = lastScene, camera = lastCamera) {
  if (!scene || !camera) return;
  ensureShop(scene);
  const anchor = scene.getObjectByName?.(SHOP_ANCHOR_NAME);
  const shop = scene.getObjectByName?.(SHOP_OBJECT_NAME);
  if (!anchor || !shop) return;

  const shouldShow = Boolean(window.__estudiemosForceShopView || isInsideRoom(camera));
  const active = shouldShow && isAimingShop(camera);
  anchor.visible = shouldShow;
  shop.visible = shouldShow;

  if (shop.userData.prompt) {
    shop.userData.prompt.visible = active;
    shop.userData.prompt.position.y = 2.62 + Math.sin(performance.now() * 0.004 + shop.userData.idleSeed) * 0.045;
  }

  const targetOpacity = active ? 0.72 : 0.3;
  shop.userData.glowMaterials?.forEach((item) => {
    item.transparent = true;
    item.opacity += (targetOpacity - item.opacity) * 0.14;
  });

  if (shop.userData.vendor) {
    shop.userData.vendor.rotation.z = Math.sin(performance.now() * 0.002 + shop.userData.idleSeed) * 0.012;
  }

  document.documentElement.dataset.estudiemosRoomShopWorld = 'anchor-object3d-v7-polish-fix';
  document.documentElement.dataset.estudiemosRoomShopState = shouldShow ? 'visible' : 'loaded';
}

function patchSceneAdd() {
  if (THREE.Object3D.prototype.__estudiemosRoomShopPolishAddHooked) return;
  THREE.Object3D.prototype.__estudiemosRoomShopPolishAddHooked = true;
  const originalAdd = THREE.Object3D.prototype.add;

  THREE.Object3D.prototype.add = function addWithShopPolish(...objects) {
    const result = originalAdd.apply(this, objects);
    if (this?.isScene) {
      lastScene = this;
      objects.forEach((object) => {
        if (object?.isCamera) lastCamera = object;
      });
      refreshShop(this, lastCamera);
    }
    return result;
  };
}

function patchCameraUpdate() {
  if (THREE.Camera.prototype.__estudiemosRoomShopPolishCameraHooked) return;
  THREE.Camera.prototype.__estudiemosRoomShopPolishCameraHooked = true;
  const originalUpdateMatrixWorld = THREE.Camera.prototype.updateMatrixWorld;

  THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorldWithShopPolish(...args) {
    lastCamera = this;
    refreshShop(lastScene, this);
    return originalUpdateMatrixWorld.apply(this, args);
  };
}

function installRoomShopWorldPolishFix() {
  if (typeof window === 'undefined' || window.__estudiemosRoomShopWorldPolishInstalled) return;
  window.__estudiemosRoomShopWorldPolishInstalled = true;
  window.__estudiemosRoomShopInstallMode = 'anchor-object3d-v7-polish-fix';
  patchSceneAdd();
  patchCameraUpdate();
  document.documentElement.dataset.estudiemosRoomShopWorld = 'anchor-object3d-v7-polish-fix';
}

installRoomShopWorldPolishFix();
