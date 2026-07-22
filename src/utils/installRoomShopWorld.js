import * as THREE from 'three';
import dachshundMascotRenderUrl from '../assets/dachshund-mascot-render.jpg';

const ROOM_ORIGIN = { x: 90, z: -6 };
const SHOP_LOCAL = new THREE.Vector3(25.85, 0, -11.5);
const SHOP_WORLD_CENTER = new THREE.Vector3(116.15, 1.55, -17.5);
const SHOP_OBJECT_NAME = 'casa1-salchi-shop-corner';
const SHOP_ANCHOR_NAME = 'casa1-salchi-shop-anchor';
const INTERIOR_BOUNDS = { minX: 62, maxX: 118, minZ: -36, maxZ: 23 };
const SHOP_DISTANCE = 10.5;
const SHOP_RADIUS = 2.75;
const FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';

const loader = new THREE.TextureLoader();
const rayDirection = new THREE.Vector3();
let lastScene = null;
let lastCamera = null;

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.03,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: Boolean(options.opacity && options.opacity < 1),
    opacity: options.opacity ?? 1,
    side: options.side
  });
}

function addBox(parent, name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeLabel({ title, subtitle = '', width = 720, height = 220, titleSize = 54, opacity = 0.92 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#22362f');
  gradient.addColorStop(0.68, '#101817');
  gradient.addColorStop(1, '#070b0c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(255,248,221,0.08)';
  context.roundRect(28, 28, width - 56, height - 56, 26);
  context.fill();
  context.fillStyle = '#e0c47a';
  context.fillRect(32, 32, width - 64, 10);
  context.fillRect(62, height - 56, 190, 8);

  context.fillStyle = '#fff8dd';
  context.font = `900 ${titleSize}px ${FONT_STACK}`;
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0,0,0,0.36)';
  context.shadowBlur = 12;
  context.fillText(title, 56, height * 0.45);

  if (subtitle) {
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(245,238,218,0.72)';
    context.font = `750 26px ${FONT_STACK}`;
    context.fillText(subtitle, 58, height * 0.68);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    opacity
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, height / width), material);
  mesh.castShadow = true;
  return mesh;
}

function addRotatedLabel(parent, name, config, position, scale) {
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

  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, 1.36),
    new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide
    })
  );
  body.name = 'casa1-salchi-shop-vendor';
  body.castShadow = true;
  body.position.set(-0.12, 2.05, -0.18);
  body.rotation.y = -Math.PI / 2;
  body.scale.setScalar(1.06);
  body.renderOrder = 2;
  return body;
}

function addDecor(parent, materials) {
  [-0.48, 0, 0.48].forEach((z, index) => {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.055, 28), materials.gold);
    coin.name = 'salchi-shop-coin';
    coin.position.set(-0.78, 1.28 + index * 0.03, z);
    coin.rotation.z = Math.PI / 2;
    coin.castShadow = true;
    parent.add(coin);
  });

  [
    { z: -1.42, title: 'SKIN', material: materials.teal },
    { z: 1.42, title: 'RANGO', material: materials.mint }
  ].forEach(({ z, title, material }) => {
    addBox(parent, 'salchi-shop-skin-card', [0.14, 0.62, 0.5], [-0.76, 1.48, z], material);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), materials.paper);
    badge.name = 'salchi-shop-card-badge';
    badge.position.set(-0.84, 1.52, z);
    badge.rotation.y = -Math.PI / 2;
    badge.castShadow = true;
    parent.add(badge);

    addRotatedLabel(
      parent,
      `salchi-shop-mini-label-${title.toLowerCase()}`,
      { title, width: 360, height: 160, titleSize: 54, opacity: 0.9 },
      [-0.86, 1.86, z],
      [0.54, 0.24, 1]
    );
  });
}

function createShopCorner(anchor) {
  if (!anchor || anchor.userData.estudiemosShopInjected) return;
  anchor.userData.estudiemosShopInjected = true;

  const shop = new THREE.Group();
  shop.name = SHOP_OBJECT_NAME;
  shop.position.copy(SHOP_LOCAL);
  shop.userData.interactionTarget = 'shop';
  shop.userData.idleSeed = Math.random() * Math.PI * 2;

  const materials = {
    wallPanel: makeMaterial(0x17201d, { roughness: 0.72, metalness: 0.02 }),
    wallGlow: makeMaterial(0x9edfc8, { emissive: 0x9edfc8, emissiveIntensity: 0.08, opacity: 0.18 }),
    wood: makeMaterial(0x4d392b, { roughness: 0.72, metalness: 0.02 }),
    dark: makeMaterial(0x0e1514, { roughness: 0.62, metalness: 0.06 }),
    trim: makeMaterial(0xc7a765, { emissive: 0xc7a765, emissiveIntensity: 0.12, roughness: 0.38, metalness: 0.08 }),
    gold: makeMaterial(0xe0c47a, { emissive: 0xe0c47a, emissiveIntensity: 0.18, roughness: 0.34 }),
    teal: makeMaterial(0x285b51, { roughness: 0.52, metalness: 0.03 }),
    mint: makeMaterial(0x7abeb5, { roughness: 0.48, metalness: 0.03 }),
    paper: makeMaterial(0xf4ead2, { roughness: 0.74, metalness: 0.01 })
  };

  addBox(shop, 'salchi-shop-wall-backplate', [0.12, 3.45, 4.45], [1.76, 2.85, 0], materials.wallPanel);
  addBox(shop, 'salchi-shop-wall-soft-glow', [0.08, 2.9, 3.65], [1.68, 2.78, 0], materials.wallGlow);
  addBox(shop, 'salchi-shop-top-rail', [0.18, 0.12, 4.6], [1.58, 4.62, 0], materials.trim);
  addBox(shop, 'salchi-shop-bottom-rail', [0.18, 0.1, 4.1], [1.58, 1.16, 0], materials.trim);
  addBox(shop, 'salchi-shop-left-rail', [0.18, 3.36, 0.08], [1.58, 2.88, -2.2], materials.trim);
  addBox(shop, 'salchi-shop-right-rail', [0.18, 3.36, 0.08], [1.58, 2.88, 2.2], materials.trim);

  const sign = addRotatedLabel(
    shop,
    'salchi-shop-wall-sign',
    { title: 'TIENDA SALCHI', subtitle: 'skins  rangos  recompensas', width: 700, height: 180, titleSize: 48, opacity: 0.92 },
    [1.49, 4.28, 0],
    [3.55, 0.92, 1]
  );

  addBox(shop, 'salchi-shop-counter-body', [1.88, 0.72, 3.55], [0.16, 0.58, 0], materials.wood);
  addBox(shop, 'salchi-shop-counter-top', [2.08, 0.16, 3.8], [0.1, 1.08, 0], materials.dark);
  addBox(shop, 'salchi-shop-counter-front', [0.14, 0.84, 3.72], [-0.82, 0.62, 0], materials.dark);
  addBox(shop, 'salchi-shop-counter-front-trim', [0.08, 0.08, 3.76], [-0.91, 1.08, 0], materials.trim);
  addBox(shop, 'salchi-shop-counter-plinth', [1.78, 0.1, 3.45], [0.16, 0.12, 0], materials.dark);

  const counterLabel = addRotatedLabel(
    shop,
    'salchi-shop-counter-label',
    { title: 'SALCHI', subtitle: 'tienda', width: 512, height: 180, titleSize: 52, opacity: 0.86 },
    [-0.92, 0.68, 0],
    [0.98, 0.32, 1]
  );

  const vendorBacking = addBox(shop, 'salchi-shop-vendor-backing', [0.1, 1.86, 1.68], [-0.02, 2.08, -0.18], materials.dark);
  vendorBacking.rotation.y = -Math.PI / 2;
  addBox(shop, 'salchi-shop-vendor-frame-top', [0.12, 0.08, 1.78], [-0.1, 2.99, -0.18], materials.trim).rotation.y = -Math.PI / 2;
  addBox(shop, 'salchi-shop-vendor-frame-bottom', [0.12, 0.08, 1.78], [-0.1, 1.17, -0.18], materials.trim).rotation.y = -Math.PI / 2;
  addBox(shop, 'salchi-shop-vendor-frame-left', [0.12, 1.78, 0.08], [-0.1, 2.08, -1.02], materials.trim).rotation.y = -Math.PI / 2;
  addBox(shop, 'salchi-shop-vendor-frame-right', [0.12, 1.78, 0.08], [-0.1, 2.08, 0.66], materials.trim).rotation.y = -Math.PI / 2;
  const vendor = makeDogVendor();
  shop.add(vendor);

  addDecor(shop, materials);

  const prompt = addRotatedLabel(
    shop,
    'salchi-shop-floating-prompt',
    { title: 'E', subtitle: 'Abrir tienda', width: 512, height: 192, titleSize: 82, opacity: 0.94 },
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
}

function addShopToScene(scene) {
  if (!scene || scene.userData.estudiemosSceneShopInjected) return;
  scene.userData.estudiemosSceneShopInjected = true;

  const anchor = new THREE.Group();
  anchor.name = SHOP_ANCHOR_NAME;
  anchor.position.set(ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z);
  anchor.visible = false;
  scene.add(anchor);
  createShopCorner(anchor);
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

function updateDebug(scene, camera) {
  const shop = scene?.getObjectByName?.(SHOP_OBJECT_NAME);
  const anchor = scene?.getObjectByName?.(SHOP_ANCHOR_NAME);
  const isVisible = Boolean(shop && shop.visible && (!anchor || anchor.visible));

  document.documentElement.dataset.estudiemosRoomShopWorld = window.__estudiemosRoomShopInstallMode;
  document.documentElement.dataset.estudiemosRoomShopState = shop ? (isVisible ? 'visible' : 'loaded') : 'missing';

  window.__estudiemosRoomShopDebug = {
    forceShopView(enabled = true) {
      window.__estudiemosForceShopView = Boolean(enabled);
    },
    getState() {
      const position = shop?.getWorldPosition?.(new THREE.Vector3());
      return {
        hasShop: Boolean(shop),
        shopVisible: isVisible,
        installMode: window.__estudiemosRoomShopInstallMode,
        shopWorldPosition: position
          ? {
              x: Number(position.x.toFixed(2)),
              y: Number(position.y.toFixed(2)),
              z: Number(position.z.toFixed(2))
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

function refreshShop(scene = lastScene, camera = lastCamera) {
  if (scene) addShopToScene(scene);
  if (!scene || !camera) return;

  const anchor = scene.getObjectByName?.(SHOP_ANCHOR_NAME);
  const shop = scene.getObjectByName?.(SHOP_OBJECT_NAME);
  if (!anchor || !shop) return;

  const shouldShow = Boolean(window.__estudiemosForceShopView || isInsideRoom(camera));
  const active = shouldShow && isAimingShop(camera);
  anchor.visible = shouldShow;

  if (shop.userData.prompt) {
    shop.userData.prompt.visible = active;
    shop.userData.prompt.position.y = 2.62 + Math.sin(performance.now() * 0.004 + shop.userData.idleSeed) * 0.045;
  }

  const targetOpacity = active ? 0.72 : 0.3;
  shop.userData.glowMaterials?.forEach((material) => {
    material.transparent = true;
    material.opacity += (targetOpacity - material.opacity) * 0.14;
  });

  if (shop.userData.vendor) {
    shop.userData.vendor.rotation.z = Math.sin(performance.now() * 0.002 + shop.userData.idleSeed) * 0.012;
  }

  updateDebug(scene, camera);
}

function patchSceneAdd() {
  if (THREE.Object3D.prototype.__estudiemosRoomShopAddHooked) return;
  THREE.Object3D.prototype.__estudiemosRoomShopAddHooked = true;
  const originalAdd = THREE.Object3D.prototype.add;

  THREE.Object3D.prototype.add = function addWithRoomShop(...objects) {
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
  if (THREE.Camera.prototype.__estudiemosRoomShopCameraHooked) return;
  THREE.Camera.prototype.__estudiemosRoomShopCameraHooked = true;
  const originalUpdateMatrixWorld = THREE.Camera.prototype.updateMatrixWorld;

  THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorldWithRoomShop(...args) {
    lastCamera = this;
    refreshShop(lastScene, this);
    return originalUpdateMatrixWorld.apply(this, args);
  };
}

function installRoomShopWorld() {
  if (typeof window === 'undefined' || window.__estudiemosRoomShopWorldInstalled) return;
  window.__estudiemosRoomShopWorldInstalled = true;
  window.__estudiemosRoomShopInstallMode = 'anchor-object3d-v5-polished';
  document.documentElement.dataset.estudiemosRoomShopWorld = 'anchor-object3d-v5-polished';
  document.documentElement.dataset.estudiemosRoomShopState = 'installing';
  patchSceneAdd();
  patchCameraUpdate();
}

installRoomShopWorld();
