import * as THREE from 'three';
import dachshundMascotRenderUrl from '../assets/dachshund-mascot-render.jpg';

const ROOM_GROUP_POSITION = { x: 90, z: -6 };
const SHOP_LOCAL = new THREE.Vector3(25.85, 0, -11.5);
const SHOP_WORLD_CENTER = new THREE.Vector3(116.15, 1.55, -17.5);
const SHOP_OBJECT_NAME = 'casa1-salchi-shop-corner';
const SHOP_ANCHOR_NAME = 'casa1-salchi-shop-anchor';
const SHOP_INTERACTION_DISTANCE = 10.5;
const SHOP_INTERACTION_RADIUS = 2.75;
const INTERIOR_BOUNDS = {
  minX: 62,
  maxX: 118,
  minZ: -36,
  maxZ: 23
};
const CANVAS_FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';

const textureLoader = new THREE.TextureLoader();
const aimDirection = new THREE.Vector3();
let lastShopScene = null;
let lastShopCamera = null;

function shopFont(weight, size) {
  return `${weight} ${size}px ${CANVAS_FONT_STACK}`;
}

function makeStandardMaterial(color, roughness = 0.62, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeGlowMaterial(color, intensity = 0.48, opacity = 1) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.24,
    metalness: 0.02,
    transparent: opacity < 1,
    opacity
  });
  return material;
}

function addBox(group, size, position, material, receivesShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = receivesShadow;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radiusTop, radiusBottom, height, position, material, rotation = [0, 0, 0], segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createCanvasPlane(canvas, opacity = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.55,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    opacity
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, canvas.height / canvas.width), material);
  mesh.castShadow = true;
  return mesh;
}

function createShopSignPlane() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 360;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#21342f');
  gradient.addColorStop(0.56, '#111817');
  gradient.addColorStop(1, '#070b0c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(224,196,122,0.15)';
  context.fillRect(42, 42, canvas.width - 84, canvas.height - 84);
  context.fillStyle = '#e0c47a';
  context.fillRect(42, 42, canvas.width - 84, 12);
  context.fillRect(78, canvas.height - 78, 268, 10);

  context.fillStyle = '#fff8dd';
  context.font = shopFont(950, 82);
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0,0,0,0.38)';
  context.shadowBlur = 16;
  context.fillText('TIENDA SALCHI', 76, 156);

  context.shadowBlur = 0;
  context.fillStyle = 'rgba(245,238,218,0.74)';
  context.font = shopFont(800, 34);
  context.fillText('skins  rangos  recompensas', 82, 232);

  context.fillStyle = '#9edfc8';
  context.beginPath();
  context.arc(874, 146, 54, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#17201e';
  context.font = shopFont(950, 52);
  context.fillText('S', 856, 148);

  return createCanvasPlane(canvas, 0.86);
}

function createShopLabelPlane(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(10,15,15,0.86)';
  context.beginPath();
  context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 32);
  context.fill();

  context.strokeStyle = 'rgba(224,196,122,0.34)';
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = '#fff8dd';
  context.font = shopFont(950, 44);
  context.fillText(title, 42, 78);
  context.fillStyle = 'rgba(245,238,218,0.72)';
  context.font = shopFont(780, 27);
  context.fillText(subtitle, 42, 126);

  return createCanvasPlane(canvas, 0.94);
}

function createVendorPortrait() {
  const texture = textureLoader.load(dachshundMascotRenderUrl, (loadedTexture) => {
    loadedTexture.colorSpace = THREE.SRGBColorSpace;
    loadedTexture.anisotropy = 4;
    loaedTexture.needsUpdate = true;
  });
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.02,
    side: THREE.DoubleSide
  });

  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.36), material);
  portrait.castShadow = true;
  portrait.name = 'casa1-salchi-shop-vendor-portrait';
  return portrait;
}

function addShopEdges(group) {
  group.traverse((child) => {
    if (!child?.isMesh || !child.geometry) return;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(child.geometry, 25),
      new THREE.LineBasicMaterial({
        color: 0x030505,
        transparent: true,
        opacity: 0.07,
        depthWrite: false
      })
    );
    child.add(edges);
  });
}

function addRoomShop(anchor) {
  if (!anchor || anchor.userData.estudiemosRoomShopInjected) return;
  anchor.userData.estudiemosRoomShopInjected = true;

  const shop = new THREE.Group();
  shop.name = SHOP_OBJECT_NAME;
  shop.position.copy(SHOP_LOCAL);
  shop.userData.interactionTarget = 'shop';

  const glowPanelMaterial = makeGlowMaterial(0x9edfc8, 0.16, 0.28);
  const woodMaterial = makeStandardMaterial(0x594233, 0.68, 0.02);
  const darkMaterial = makeStandardMaterial(0x121918, 0.58, 0.06);
  const goldMaterial = makeGlowMaterial(0xe0c47a, 0.24);
  const mintMaterial = makeGlowMaterial(0x9edfc8, 0.36);
  const paperMaterial = makeStandardMaterial(0xf4ead2, 0.74, 0.01);

  const alcove = addBox(shop, [0.12, 4.45, 5.15], [1.73, 3.1, 0], glowPanelMaterial, true);
  alcove.name = 'salchi-shop-soft-wall-panel';

  const sign = createShopSignPlane();
  if (sign) {
    sign.name = 'salchi-shop-wall-sign';
    sign.position.set(1.65, 4.55, 0);
    sign.rotation.y = -Math.PI / 2;
    sign.scale.set(4.35, 1.42, 1);
    shop.add(sign);
  }

  addBox(shop, [2.26, 0.92, 4.18], [0.38, 0.64, 0], woodMaterial, true);
  addBox(shop, [2.48, 0.16, 4.42], [0.31, 1.16, 0], darkMaterial, true);
  addBox(shop, [0.14, 1.2, 4.46], [-0.82, 0.72, 0], darkMaterial, true);

  const frontPlate = createShopLabelPlane('TIENDA SALCHI', 'Skins y rangos');
  if (frontPlate) {
    frontPlate.name = 'salchi-shop-counter-label';
    frontPlate.position.set(-0.9, 0.78, 0);
    frontPlate.rotation.y = -Math.PI / 2;
    frontPlate.scale.set(1.42, 0.46, 1);
    shop.add(frontPlate);
  }

  const portraitFrame = addBox(shop, [0.12, 1.74, 1.72], [-0.04, 2.05, -0.18], darkMaterial, true);
  portraitFrame.rotation.y = -Math.PI / 2;
  const portrait = createVendorPortrait();
  portrait.position.set(-0.11, 2.05, -0.18);
  portrait.rotation.y = -Math.PI / 2;
  portrait.scale.setScalar(1.06);
  shop.add(portrait);

  [-0.58, 0, 0.58].forEach((z, index) => {
    const coin = addCylinder(shop, 0.2, 0.2, 0.055, [-0.72, 1.35 + index * 0.03, z], goldMaterial, [0, 0, Math.PI / 2], 28);
    coin.name = 'salchi-shop-focus-coin';
  });

  [
    { z: -1.52, color: 0x2a6f64 },
    { z: 1.52, color: 0x8ed7d2 }
  ].forEach(({ z, color }) => {
    addBox(shop, [0.18, 0.74, 0.56], [-0.72, 1.58, z], makeStandardMaterial(color, 0.44, 0.02), true);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), paperMaterial);
    badge.position.set(-0.826, 1.64, z);
    badge.rotation.y = -Math.PI / 2;
    badge.castShadow = true;
    shop.add(badge);
  });

  const prompt = createShopLabelPlane('E', 'Abrir tienda');
  if (prompt) {
    prompt.name = 'salchi-shop-floating-prompt';
    prompt.position.set(-1.16, 2.6, 0);
    prompt.rotation.y = -Math.PI / 2;
    prompt.scale.set(1.05, 0.5, 1);
    prompt.visible = false;
    shop.add(prompt);
  }

  const shopLight = new THREE.PointLight(0xffe1a2, 0.75, 7.5, 2.1);
  shopLight.position.set(-0.35, 2.75, 0.15);
  shop.add(shopLight);


  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.75, 36),
    new THREE.MeshBasicMaterial({
      color: 0xe0c47a,
      transparent: true,
      opacity: 0.1,
      depthWrite: false
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0.2, 0.03, 0);
  shop.add(floorGlow);

  shop.userData.shopPrompt = prompt;
  shop.userData.shopGlowMaterials = [glowPanelMaterial, sign?.material, frontPlate?.material, prompt?.material].filter(Boolean);
  shop.userData.shopPortrait = portrait;
  shop.userData.shopIdleSeed = Math.random() * Math.PI * 2;

  addShopEdges(shop);
  anchor.add(shop);
}

function addSceneShop(scene) {
  if (!scene || scene.userData.estudiemosSceneShopInjected) return;
  scene.userData.estudiemosSceneShopInjected = true;

  const anchor = new THREE.Group();
  anchor.name = SHOP_ANCHOR_NAME;
  anchor.position.set(ROOM_GROUP_POSITION.x, 0, ROOM_GROUP_POSITION.z);
  anchor.visible = false;
  scene.add(anchor);
  addRoomShop(anchor);
}

function isCameraInsideRoom(camera) {
  const { x, z } = camera.position;
  return x >= INTERIOR_BOUNDS.minX && x <= INTERIOR_BOUNDS.maxX && z >= INTERIOR_BOUNDS.minZ && z <= INTERIOR_BOUNDS.maxZ;
}

function getRaySphereHitDistance(origin, direction, center, radius) {
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
  if (!camera?.isCamera || !isCameraInsideRoom(camera)) return false;
  if (camera.position.distanceTo(SHOP_WORLD_CENTER) > SHOP_INTERACTION_DISTANCE) return false;

  camera.getWorldDirection(aimDirection).normalize();
  const distance = getRaySphereHitDistance(camera.position, aimDirection, SHOP_WORLD_CENTER, SHOP_INTERACTION_RADIUS);
  return distance !== null && distance <= SHOP_INTERACTION_DISTANCE;
}

function updateShopVisualState(scene, camera) {
  const anchor = scene?.getObjectByName?.(SHOP_ANCHOR_NAME);
  const shop = scene?.getObjectByName?.(SHOP_OBJECT_NAME);
  if (!anchor || !shop) return;

  const shouldShow = Boolean(window.__estudiemosForceShopView || (camera?.isCamera && isCameraInsideRoom(camera)));
  anchor.visible = shouldShow;

  const active = shouldShow && isAimingShop(camera);
  const prompt = shop.userData.shopPrompt;
  if (prompt) {
    prompt.visible = active;
    prompt.position.y = 2.62 + Math.sin(performance.now() * 0.004 + shop.userData.shopIdleSeed) * 0.045;
  }

  const glowTarget = active ? 0.72 : 0.3;
  shop.userData.shopGlowMaterials?.forEach((material) => {
    if (!material.transparent) {
      material.transparent = true;
    }
    material.opacity += (glowTarget - material.opacity) * 0.14;
  });

  if (shop.userData.shopPortrait) {
    shop.userData.shopPortrait.rotation.z = Math.sin(performance.now() * 0.002 + shop.userData.shopIdleSeed) * 0.012;
  }
}

function updateShopDebugHandle(scene, camera) {
  if (typeof window === 'undefined') return;

  window.__estudiemosRoomShopDebug = {
    hasShop: Boolean(scene?.getObjectByName?.(SHOP_OBJECT_NAME)),
    forceShopView(enabled = true) {
      window.__estudiemosForceShopView = Boolean(enabled);
    },
    getState() {
      const shop = scene?.getObjectByName?.(SHOP_OBJECT_NAME);
      const anchor = scene?.getObjectByName?.(SHOP_ANCHOR_NAME);
      return {
        hasShop: Boolean(shop),
        shopVisible: Boolean(shop && shop.visible && (!anchor || anchor.visible)),
        shopWorldPosition: shop
          ? {
              x: Number(shop.getWorldPosition(new THREE.Vector3()).x.toFixed(2)),
              y: Number(shop.getWorldPosition(new THREE.Vector3()).y.toFixed(2)),
              z: Number(shop.getWorldPosition(new THREE.Vector3()).z.toFixed(2))
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

function refreshShopRuntime(scene = lastShopScene, camera = lastShopCamera) {
  if (scene) addSceneShop(scene);

  if (scene && camera) {
    updateShopVisualState(scene, camera);
    updateShopDebugHandle(scene, camera);
  }
}

function installSceneAddHook() {
  if (THREE.Object3D.prototype.__estudiemosShopAddHooked) return;
  THREE.Object3D.prototype.__estudiemosShopAddHooked = true;

  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function addWithRoomShop(...objects) {
    const result = originalAdd.apply(this, objects);

    if (this?.isScene) {
      lastShopScene = this;
      objects.forEach((object) => {
        if (object?.isCamera) lastShopCamera = object;
      });
      refreshShopRuntime(this, lastShopCamera);
    }

    return result;
  };
}

function installCameraUpdateHook() {
  if (THREE.Camera.prototype.__estudiemosShopCameraHooked) return;
  THREE.Camera.prototype.__estudiemosShopCameraHooked = true;

  const originalUpdateMatrixWorld = THREE.Camera.prototype.updateMatrixWorld;
  THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorldWithRoomShop(...args) {
    lastShopCamera = this;
    refreshShopRuntime(lastShopScene, this);
    return originalUpdateMatrixWorld.apply(this, args);
  };
}

function installRoomShopWorld() {
  if (typeof window === 'undefined' || window.__estudiemosRoomShopWorldInstalled) return;
  window.__estudiemosRoomShopWorldInstalled = true;
  window.__estudiemosRoomShopInstallMode = 'anchor-object3d';
  installSceneAddHook();
  installCameraUpdateHook();
}

installRoomShopWorld();
